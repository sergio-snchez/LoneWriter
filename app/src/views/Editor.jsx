import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import {
  BookOpen, Eye, Edit3, ChevronDown, ChevronRight, Plus, Circle,
  FileText, Clock, CheckCircle2,
  BarChart2, Target, Flame, Save, Loader2, Trash2, FileDown,
  GripVertical, ChevronsDownUp, ChevronsUpDown, Sparkles, Calendar
} from 'lucide-react'
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useNovel } from '../context/NovelContext'
import { useAI } from '../context/AIContext'
import { useModal } from '../context/ModalContext'
import { ExportService } from '../services/exportService'
import { db } from '../db/database'
import { Tooltip } from '../components/Tooltip'
import { CustomDatePicker } from '../components/CustomDatePicker'
import RichEditor from '../components/RichEditor'
import {
  extractCandidates,
  analyzeWithAI,
  loadRegisteredEntityNames,
  loadIgnoredNames,
} from '../services/mpcService'
import { AIService } from '../services/aiService'
import debounce from 'lodash/debounce'
import { upsertVector } from '../services/ragService'
import { STATUS_MAP, STATUS_OPTIONS, SortableActSection } from './editor/EditorSortables'
import { useEditorDnd } from './editor/useEditorDnd'
import './Editor.css'
import './MpcBadge.css'





function ProgressBar({ value, max, label, sublabel, color }) {
  const { t } = useTranslation('editor')
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="progress-item">
      <div className="progress-item__labels">
        <span className="progress-item__label">{label}</span>
        <span className="progress-item__nums">{value?.toLocaleString() || 0} / {max?.toLocaleString() || 0}</span>
      </div>
      <div className="progress-item__bar-bg">
        <div
          className="progress-item__bar-fill"
          style={{ width: `${pct}%`, background: color || 'var(--accent)' }}
        />
      </div>
      {sublabel && <span className="progress-item__sublabel">{pct}%</span>}
    </div>
  )
}

export default function EditorView({ menuOpen = false, onNavigate }) {
  const { t } = useTranslation('editor')
  const {
    acts, activeNovel, characters, updateScene,
    addAct, deleteAct, updateAct, addChapter, deleteChapter, updateChapter, addScene, deleteScene,
    updateActOrder, updateChapterOrder, updateSceneOrder, moveScene, moveChapter,
    updateNovelTarget, getStreak, activeScene, setActiveScene,
    getNovelUIExpanded, updateNovelUIExpanded, expandedIds, setExpandedIds
  } = useNovel()
  const { openModal } = useModal()
  const {
    oracleStatus,
    provider, apiKey, currentModel, localBaseUrl,
    mpcProposals, mpcStatus, setMpcStatus, addMpcProposals,
    mpcCooldownRef, MPC_COOLDOWN_MS,
    logAIUsage,
    isMpcEnabled
  } = useAI()

  // MPC state
  const mpcDebounceRef = useRef(null)

  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

  // Tree resizing logic
  const [treeWidth, setTreeWidth] = useState(400);
  const [isTreeDragging, setIsTreeDragging] = useState(false);
  const treeDragRef = useRef(false);
  const editorRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!treeDragRef.current || !editorRef.current) return;
      const rect = editorRef.current.getBoundingClientRect();
      let newWidth = e.clientX - rect.left;
      if (newWidth < 400) newWidth = 400;
      if (newWidth > 500) newWidth = 500;
      setTreeWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (treeDragRef.current) {
        treeDragRef.current = false;
        setIsTreeDragging(false);
        document.body.style.cursor = 'default';
        document.body.classList.remove('no-select');
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startTreeDrag = (e) => {
    if (window.innerWidth <= 768) return;
    treeDragRef.current = true;
    setIsTreeDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('no-select');
    e.preventDefault();
  };

  const [isSaving, setIsSaving] = useState(null)
  const [generatingSynopsis, setGeneratingSynopsis] = useState(false)
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false)
  const [streak, setStreak] = useState(0)
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [isStatsExpanded, setIsStatsExpanded] = useState(false)
  const goalEditorRef = useRef(null)
  const hoverTimerRef = useRef(null)
  const [localSynopsis, setLocalSynopsis] = useState('')

  // Sync local state when activeScene changes
  useEffect(() => {
    setLocalSynopsis(activeScene?.synopsis || '')
  }, [activeScene?.id])

  // Debounced persistence for synopsis
  const debouncedSynopsisSave = useCallback(
    debounce((id, val) => {
      updateScene(id, { synopsis: val })
    }, 1000),
    [updateScene]
  )

  const handleSynopsisChange = (e) => {
    const val = e.target.value
    setLocalSynopsis(val)
    if (activeScene) {
      debouncedSynopsisSave(activeScene.id, val)
    }
  }


  useEffect(() => {
    function handleClickOutside(event) {
      if (goalEditorRef.current && !goalEditorRef.current.contains(event.target)) {
        // Only close if we didn't click the toggle button itself
        const isClickOnToggle = event.target.closest('.kpi--interactive');
        if (!isClickOnToggle) {
          setShowGoalEditor(false);
        }
      }
    }

    const handleToggleStats = () => {
      setIsStatsExpanded(true);
      // Optional: scroll to bottom
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    if (showGoalEditor) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    window.addEventListener('toggle-stats', handleToggleStats);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('toggle-stats', handleToggleStats);
    };
  }, [showGoalEditor]);

  useEffect(() => {
    const fetchStreak = async () => {
      if (activeNovel) {
        const s = await getStreak(activeNovel.id);
        setStreak(s);
      }
    };
    fetchStreak();
  }, [activeNovel, getStreak]);

  // Expanded IDs are now managed in NovelContext


  const GOAL_TEMPLATES = [
    { label: t('objetivos.plantillas.micro_relato'), words: 1000, targetScenes: 2, scenesRange: '1-2', wps: '500-1000', chaptersRange: '—' },
    { label: t('objetivos.plantillas.cuento_corto'), words: 5000, targetScenes: 5, scenesRange: '3-6', wps: '1000-1500', chaptersRange: '1-3' },
    { label: t('objetivos.plantillas.novela_corta'), words: 30000, targetScenes: 25, scenesRange: '20-30', wps: '1000-1500', chaptersRange: '5-10' },
    { label: t('objetivos.plantillas.novela_estandar'), words: 80000, targetScenes: 70, scenesRange: '60-80', wps: '1200-1500', chaptersRange: '15-25' },
    { label: t('objetivos.plantillas.novela_fantasia'), words: 110000, targetScenes: 100, scenesRange: '80-100', wps: '1200-1500', chaptersRange: '20-35' },
  ];

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Persistence is now managed in NovelContext


  const handleExpandAll = () => {
    const allIds = new Set();
    acts.forEach(act => {
      allIds.add(`act-${act.id}`);
      (act.chapters || []).forEach(ch => {
        allIds.add(`ch-${ch.id}`);
      });
    });
    setExpandedIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  // Sync activeScene with updated data from acts
  useEffect(() => {
    if (activeScene) {
      const allS = acts.flatMap(a => (a.chapters || []).flatMap(c => c.scenes || []))
      const updated = allS.find(s => s.id === activeScene.id)
      if (updated) setActiveScene(updated)
    }
  }, [acts])

  // Empty state is now handled by App.jsx
  if (!activeNovel) return null;

  // Find a default scene to edit on first load
  useEffect(() => {
    if (!activeScene && acts.length > 0) {
      const firstAct = acts[0]
      if (firstAct.chapters?.length > 0) {
        setExpandedIds(prev => new Set([...prev, `act-${firstAct.id}`, `ch-${firstAct.chapters[0].id}`]))
        const firstChapter = firstAct.chapters[0]
        if (firstChapter.scenes?.length > 0) {
          const sceneToOpen = firstChapter.scenes.find(s => s.content) || firstChapter.scenes[0]
          setActiveScene(sceneToOpen)
        }
      }
    }
  }, [acts, activeScene])

  // MCP manual scan listener
  useEffect(() => {
    const handler = () => {
      if (!activeScene || !activeNovel || mpcStatus === 'analyzing') return
      handleManualMpcScan()
    }
    window.addEventListener('mpc-manual-scan', handler)
    return () => window.removeEventListener('mpc-manual-scan', handler)
  }, [activeScene, activeNovel, mpcStatus])
  // Navigation listener is now managed in NovelContext

  const debouncedRagUpsert = useCallback(
    debounce(async (sceneId, novelId, text) => {
      await upsertVector(sceneId, novelId, text)
    }, 5000),
    []
  )

  const debouncedSave = useCallback(
    debounce(async (sceneId, novelId, html) => {
      setIsSaving(true)
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const words = text ? text.split(' ').length : 0

      await updateScene(sceneId, {
        content: html,
        wordCount: words,
        lastEdited: new Date().toISOString()
      })

      setIsSaving(false)
      // ── RAG: index updated text asynchronously ────────────────
      if (novelId && text.length > 10) {
        debouncedRagUpsert(sceneId, novelId, text)
      }
    }, 1000),
    [updateScene, debouncedRagUpsert]
  )

  const handleEditorChange = (html) => {
    if (activeScene) {
      debouncedSave(activeScene.id, activeNovel?.id, html)
      // ── MPC trigger ──────────────────────────────────────────────
      triggerMpcAnalysis(html)
    }
  }

  // ── MPC: debounced analysis trigger ────────────────────────────
  const triggerMpcAnalysis = useCallback((html) => {
    // Necesita API key, novela activa y estar habilitado
    if (!isMpcEnabled) return
    if (!apiKey && provider !== 'local') return
    if (!activeNovel) return

    // Cancelar trigger anterior
    if (mpcDebounceRef.current) clearTimeout(mpcDebounceRef.current)

    mpcDebounceRef.current = setTimeout(async () => {
      // Respetar cooldown entre análisis
      const now = Date.now()
      if (mpcCooldownRef.current && (now - mpcCooldownRef.current) < MPC_COOLDOWN_MS) {
        return
      }

      const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (plainText.length < 20) {
        return // texto muy corto, no analizar
      }

      // Paso 1: detección local
      const [registeredNames, ignoredNames] = await Promise.all([
        loadRegisteredEntityNames(activeNovel.id),
        loadIgnoredNames(activeNovel.id),
      ])

      const candidates = extractCandidates(plainText, registeredNames, ignoredNames)

      if (candidates.length === 0) {
        return
      }

      // Paso 2: análisis IA (solo si hay candidatos)
      setMpcStatus('analyzing')
      mpcCooldownRef.current = now

      try {
        const aiConfig = {
          provider,
          apiKey,
          model: currentModel,
          localBaseUrl,
        }

        // Cargar compendio por tipo para enriquecer las propuestas con vínculos
        const [chars, locs, objs, loreEntries] = await Promise.all([
          db.characters.where('novelId').equals(activeNovel.id).toArray(),
          db.locations.where('novelId').equals(activeNovel.id).toArray(),
          db.objects.where('novelId').equals(activeNovel.id).toArray(),
          db.lore.where('novelId').equals(activeNovel.id).toArray(),
        ])
        const compendiumByType = {
          characters: chars.map(c => c.name).filter(Boolean),
          locations: locs.map(l => l.name).filter(Boolean),
          objects: objs.map(o => o.name).filter(Boolean),
          lore: loreEntries.map(l => l.title).filter(Boolean),
        }

        const { proposals, usage } = await analyzeWithAI(
          candidates,
          plainText,
          registeredNames,
          ignoredNames,
          aiConfig,
          5,
          compendiumByType
        )

        logAIUsage(usage)

        if (proposals.length > 0) {
          addMpcProposals(proposals)
        }
      } catch (err) {
      } finally {
        setMpcStatus('idle')
      }
    }, 2000) // 2 segundos de inactividad antes de analizar, para mayor agilidad
  }, [activeNovel, apiKey, provider, currentModel, localBaseUrl, mpcCooldownRef, MPC_COOLDOWN_MS, setMpcStatus, addMpcProposals, isMpcEnabled, logAIUsage])

  const handleManualMpcScan = useCallback(async () => {
    console.log('[MPC] handleManualMpcScan triggered');
    if (mpcStatus === 'analyzing') return
    if (!activeScene?.content) return
    if (!activeNovel?.id) return

    // Paso 0: Limpieza
    const html = activeScene.content
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    console.log('[MPC] plainText length:', plainText.length);
    if (plainText.length < 10) return

    setMpcStatus('analyzing')
    try {
      const [registeredNames, ignoredNames] = await Promise.all([
        loadRegisteredEntityNames(activeNovel.id),
        loadIgnoredNames(activeNovel.id),
      ])
      console.log('[MPC] Registered names:', registeredNames.size, 'Ignored:', ignoredNames.size);

      const candidates = extractCandidates(plainText, registeredNames, ignoredNames)
      console.log('[MPC] Extracted candidates:', candidates);

      if (candidates.length === 0) {
        console.log('[MPC] No candidates found, aborting');
        setMpcStatus('idle')
        return
      }

      // Cargar compendio por tipo para enriquecer las propuestas con vínculos
      const [chars, locs, objs, loreEntries] = await Promise.all([
        db.characters.where('novelId').equals(activeNovel.id).toArray(),
        db.locations.where('novelId').equals(activeNovel.id).toArray(),
        db.objects.where('novelId').equals(activeNovel.id).toArray(),
        db.lore.where('novelId').equals(activeNovel.id).toArray(),
      ])
      const compendiumByType = {
        characters: chars.map(c => c.name).filter(Boolean),
        locations: locs.map(l => l.name).filter(Boolean),
        objects: objs.map(o => o.name).filter(Boolean),
        lore: loreEntries.map(l => l.title).filter(Boolean),
      }

      console.log('[MPC] Calling analyzeWithAI with provider:', provider);
      const { proposals, usage } = await analyzeWithAI(
        candidates,
        plainText,
        registeredNames,
        ignoredNames,
        { provider, apiKey, model: currentModel, localBaseUrl },
        8, // Más candidatos en manual
        compendiumByType
      )
      console.log('[MPC] Proposals received:', proposals);

      logAIUsage(usage)

      if (proposals.length > 0) {
        addMpcProposals(proposals)
      }
    } catch (err) {
      console.error('[MPC] Error in handleManualMpcScan:', err);
    } finally {
      setMpcStatus('idle')
    }
  }, [activeScene, activeNovel, apiKey, provider, currentModel, localBaseUrl, mpcStatus, setMpcStatus, addMpcProposals, logAIUsage])

  const handleGenerateSynopsis = async () => {
    if (!activeScene || !activeScene.content) return;
    try {
      const plainText = activeScene.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plainText.length < 20) return;
      setGeneratingSynopsis(true);
      const aiConfig = { provider, apiKey, model: currentModel, localBaseUrl };
      const { text, usage } = await AIService.summarizeScene(plainText, aiConfig);
      logAIUsage(usage);
      await handleMetaChange('synopsis', text);
      setLocalSynopsis(text);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingSynopsis(false);
    }
  };

  // Limpiar timeout MPC al desmontar
  useEffect(() => {
    return () => {
      if (mpcDebounceRef.current) clearTimeout(mpcDebounceRef.current)
    }
  }, [])

  const handleMetaChange = async (field, value) => {
    if (!activeScene) return
    await updateScene(activeScene.id, { [field]: value })
  }

  const handleAddAct = async () => {
    openModal('prompt', {
      title: t('nuevo.acto_titulo'),
      message: t('nuevo.acto_mensaje'),
      placeholder: t('nuevo.acto_placeholder'),
      confirmLabel: t('nuevo.acto_boton'),
      onConfirm: (title) => addAct(activeNovel.id, title)
    });
  }

  const handleAddChapter = async (actId) => {
    openModal('prompt', {
      title: t('nuevo.capitulo_titulo'),
      message: t('nuevo.capitulo_mensaje'),
      placeholder: t('nuevo.capitulo_placeholder'),
      confirmLabel: t('nuevo.capitulo_boton'),
      onConfirm: (title) => addChapter(actId, title)
    });
  }

  const handleAddScene = async (chapterId) => {
    openModal('prompt', {
      title: t('nuevo.escena_titulo'),
      message: t('nuevo.escena_mensaje'),
      placeholder: t('nuevo.escena_placeholder'),
      confirmLabel: t('nuevo.escena_boton'),
      onConfirm: (title) => addScene(chapterId, title)
    });
  }

  const confirmDeleteAct = (id) => {
    openModal('confirm', {
      title: t('acto.eliminar_titulo'),
      message: t('acto.eliminar_mensaje'),
      isDanger: true,
      confirmLabel: t('acto.eliminar_boton'),
      onConfirm: () => deleteAct(id)
    });
  }

  const confirmDeleteChapter = (id) => {
    openModal('confirm', {
      title: t('capitulo.eliminar_titulo'),
      message: t('capitulo.eliminar_mensaje'),
      isDanger: true,
      confirmLabel: t('capitulo.eliminar_boton'),
      onConfirm: () => deleteChapter(id)
    });
  }

  const confirmDeleteScene = (id) => {
    openModal('confirm', {
      title: t('eliminar_escena.titulo'),
      message: t('eliminar_escena.mensaje'),
      isDanger: true,
      confirmLabel: t('eliminar_escena.boton'),
      onConfirm: () => deleteScene(id)
    });
  }

  const handleExportScene = async () => {
    if (!activeScene) return
    try {
      await ExportService.exportToWord(
        activeScene.title,
        activeScene.content,
        t('exportar.escena_vacia_word')
      )
    } catch (err) {
      if (err.message === 'SCENE_EMPTY') {
        // Show localised warning via the modal system
        console.warn('[LoneWriter] Export aborted: scene is empty.');
      } else {
        console.error('[LoneWriter] exportToWord error:', err);
      }
    }
  }

  const {
    activeDragId,
    sensors,
    getDragLabel,
    handleDragStart,
    handleDragOver,
    handleDragCancel,
    handleDragEnd,
  } = useEditorDnd({
    acts,
    novelId: activeNovel?.id,
    updateActOrder,
    updateChapterOrder,
    updateSceneOrder,
    moveScene,
    moveChapter,
    setExpandedIds,
    expandedIds,
  })

  const totalChapters = acts.reduce((acc, act) => acc + (act.chapters?.length || 0), 0)
  const completedChapters = acts.reduce((acc, act) => acc + (act.chapters?.filter(c => c.status === 'Finalizado').length || 0), 0)

  const allScenes = acts.flatMap(act => (act.chapters || []).flatMap(ch => ch.scenes || []))
  const totalScenes = allScenes.length
  const completedScenes = allScenes.filter(s => s.status === 'Finalizado').length

  const wordPct = activeNovel ? Math.round((activeNovel.wordCount / (activeNovel.targetWords || 100000)) * 100) : 0
  const scenePct = (activeNovel?.targetScenes || 60) > 0 ? Math.round((completedScenes / (activeNovel.targetScenes || 60)) * 100) : 0

  return (
    <div className="editor-view" ref={editorRef}>
      {/* Mobile tree toggle button */}
      <button
        className="mobile-tree-toggle"
        onClick={() => setMobileTreeOpen(o => !o)}
        aria-label={t('arbol.titulo')}
      >
        <BookOpen size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileTreeOpen && (
        <div className="mobile-tree-overlay" onClick={() => setMobileTreeOpen(false)}>
          <div className="mobile-tree-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-tree-drawer__header">
              <span className="mobile-tree-drawer__title">{t('arbol.titulo')}</span>
              <button className="mobile-tree-drawer__close" onClick={() => setMobileTreeOpen(false)}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="mobile-tree-drawer__body">
              <div className="editor-view__acts">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext items={acts.map(a => `act-${a.id}`)} strategy={verticalListSortingStrategy}>
                    {acts.map((act, idx) => {
                      const chapterOffset = acts.slice(0, idx).reduce((sum, a) => sum + (a.chapters?.length || 0), 0);
                      return (
                        <SortableActSection
                          key={act.id}
                          act={act}
                          actIndex={idx}
                          chapterOffset={chapterOffset}
                          isOpen={expandedIds.has(`act-${act.id}`)}
                          onToggle={() => toggleExpand(`act-${act.id}`)}
                          activeSceneId={activeScene?.id}
                          onSelectScene={setActiveScene}
                          onAddChapter={handleAddChapter}
                          onAddScene={handleAddScene}
                          onDeleteScene={confirmDeleteScene}
                          onDeleteChapter={confirmDeleteChapter}
                          onDeleteAct={confirmDeleteAct}
                          onUpdateAct={updateAct}
                          onUpdateChapter={updateChapter}
                          onUpdateScene={updateScene}
                          expandedIds={expandedIds}
                          onSubToggle={toggleExpand}
                        />
                      );
                    })}
                  </SortableContext>
                  <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                    {activeDragId ? (
                      <div className="drag-overlay-ghost">
                        <GripVertical size={14} />
                        <span>{getDragLabel(activeDragId)}</span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop tree panel */}
      <div
        className={`editor-view__tree 
          ${isTreeDragging ? 'editor-view__tree--dragging' : ''} 
          ${treeWidth < 380 ? 'editor-view__tree--narrow' : ''}`}
        style={{ '--tree-width': `${treeWidth}px` }}
      >
        <div className="tree-panel__resizer" onMouseDown={startTreeDrag} />
        <div className="editor-view__tree-header">
          <div className="tree-header__left">
            <h1 className="section-title">{t('arbol.titulo')}</h1>
            <p className="section-subtitle">{t('arbol.subtitulo', { acts: acts.length, chapters: totalChapters, scenes: totalScenes })}</p>
          </div>
          <div className="tree-header__actions">
            <div className="tree-header__bulk-btns">
              <Tooltip content={t('arbol.expandir_todo')}>
                <button className="btn btn-ghost btn-icon" onClick={handleExpandAll}>
                  <ChevronsUpDown size={14} />
                </button>
              </Tooltip>
              <Tooltip content={t('arbol.contraer_todo')}>
                <button className="btn btn-ghost btn-icon" onClick={handleCollapseAll}>
                  <ChevronsDownUp size={14} />
                </button>
              </Tooltip>
            </div>
            <button className="btn btn-primary" onClick={handleAddAct}>
              <Plus size={14} />
              {t('arbol.acto')}
            </button>
          </div>
        </div>

        <div className="editor-view__acts">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={acts.map(a => `act-${a.id}`)} strategy={verticalListSortingStrategy}>
              {acts.map((act, idx) => {
                const chapterOffset = acts.slice(0, idx).reduce((sum, a) => sum + (a.chapters?.length || 0), 0);
                return (
                  <SortableActSection
                    key={act.id}
                    act={act}
                    actIndex={idx}
                    chapterOffset={chapterOffset}
                    isOpen={expandedIds.has(`act-${act.id}`)}
                    onToggle={() => toggleExpand(`act-${act.id}`)}
                    activeSceneId={activeScene?.id}
                    onSelectScene={setActiveScene}
                    onAddChapter={handleAddChapter}
                    onAddScene={handleAddScene}
                    onDeleteScene={confirmDeleteScene}
                    onDeleteChapter={confirmDeleteChapter}
                    onDeleteAct={confirmDeleteAct}
                    onUpdateAct={updateAct}
                    onUpdateChapter={updateChapter}
                    onUpdateScene={updateScene}
                    expandedIds={expandedIds}
                    onSubToggle={toggleExpand}
                  />
                );
              })}
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeDragId ? (
                <div className="drag-overlay-ghost">
                  <GripVertical size={14} />
                  <span>{getDragLabel(activeDragId)}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <div className="editor-view__right">
        <div className={`editor-main card ${activeScene ? '' : 'editor-main--empty'}`}>
          {activeScene ? (
            <div className="editor-container">
              <div className="editor-header">
                <div className="editor-header__info">
                  <div className="editor-header__breadcrumb">
                    <BookOpen size={12} />
                    <span>{activeNovel?.title}</span>
                    <ChevronRight size={10} />
                    <span>{activeScene.title}</span>
                  </div>
                  <div className="editor-header__title-row">
                    <div className="editor-header__title-container">
                      <h2 className="editor-header__title">{activeScene.title}</h2>
                      <button
                        className="header-toggle"
                        onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                      >
                        {isHeaderExpanded ? <ChevronDown size={20} style={{ transform: 'rotate(180deg)' }} /> : <ChevronDown size={20} />}
                      </button>
                    </div>

                    <div className={`editor-header__metadata ${!isHeaderExpanded ? 'header-collapsed' : ''}`}>
                      <div className="meta-field">
                        <Clock size={12} />
                        <select
                          value={activeScene.status}
                          onChange={(e) => handleMetaChange('status', e.target.value)}
                          className="meta-select"
                        >
                          {STATUS_OPTIONS.map(opt => {
                            const key = opt.toLowerCase().replace(/ /g, '_')
                            return <option key={opt} value={opt}>{t(`estado.${key}`)}</option>
                          })}
                        </select>
                      </div>
                      <div className="meta-field">
                        <Eye size={12} />
                        <select
                          value={activeScene.pov}
                          onChange={(e) => handleMetaChange('pov', e.target.value)}
                          className="meta-select"
                        >
                          <option value="">{t('editor.sin_pov')}</option>
                          {characters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="meta-field">
                        <CustomDatePicker
                          value={activeScene.inGameDate || ''}
                          onChange={(val) => handleMetaChange('inGameDate', val)}
                        />
                      </div>
                    </div>
                  </div>
                  </div>
                <div className={`editor-header__status-row ${!isHeaderExpanded ? 'header-collapsed' : ''}`}>
                  <Tooltip content={t('editor.exportar_word')}>
                    <button className="btn btn-ghost btn-sm" onClick={handleExportScene}>
                      <FileDown size={14} />
                      {t('editor.word')}
                    </button>
                  </Tooltip>
                  <Tooltip content={t('editor.tooltip_oraculo')}>
                    <div
                      className={`oracle-traffic-light oracle-traffic-light--${oracleStatus.status} editor-traffic-light ${oracleStatus.status !== 'idle' ? 'editor-traffic-light--clickable' : ''}`}
                      onClick={() => {
                        if (oracleStatus.status !== 'idle') {
                          window.dispatchEvent(new CustomEvent('open-oracle-panel'));
                        }
                      }}
                    >
                      <div className="oracle-traffic-light__dot" />
                      <span className="oracle-traffic-light__label">
                        {oracleStatus.status === 'idle' && t('editor.sin_coincidencias')}
                        {oracleStatus.status === 'suspicious' && t('editor.coincidencias')}
                        {oracleStatus.status === 'error' && t('editor.contradiccion')}
                      </span>
                    </div>
                  </Tooltip>
                  {/* ── MPC Badge ─────────────────────────────── */}
                  {activeScene && (
                    <Tooltip content={t('compendium:mpc.tooltip')}>
                      <div
                        className={`mpc-traffic-light ${mpcStatus === 'analyzing' ? 'mpc-traffic-light--analyzing' : ''
                          } ${mpcProposals.length > 0 ? 'mpc-traffic-light--active' : ''
                          }`}
                        onClick={() => {
                          if (mpcProposals.length > 0 || mpcStatus === 'analyzing') {
                            onNavigate('compendium');
                          } else {
                            handleManualMpcScan();
                          }
                        }}
                      >
                        {mpcProposals.length > 0 || mpcStatus === 'analyzing' ? (
                          <span className="mpc-traffic-light__count">{mpcProposals.length > 0 ? mpcProposals.length : <Loader2 size={12} className="spin" />}</span>
                        ) : (
                          <Sparkles size={14} className="mpc-traffic-light__icon" />
                        )}
                        <span>
                          {mpcStatus === 'analyzing' ? t('ai:oraculo.consultando') : t('compendium:mpc.titulo')}
                        </span>
                      </div>
                    </Tooltip>
                  )}
                </div>
                <div className={`editor-header__synopsis-container ${!isHeaderExpanded ? 'header-collapsed' : ''}`}>
                  <Tooltip content={t('editor.generar_sinopsis')}>
                    <button className="synopsis-ai-btn" onClick={handleGenerateSynopsis} disabled={generatingSynopsis}>
                      {generatingSynopsis ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                    </button>
                  </Tooltip>
                  <div className="editor-header__synopsis-row">
                    <input
                      type="text"
                      className="editor-header__synopsis-input"
                      placeholder={t('editor.sinopsis_placeholder')}
                      value={localSynopsis}
                      onChange={handleSynopsisChange}
                    />
                  </div>
                </div>
              </div>

              <div className="editor-body" style={menuOpen ? { pointerEvents: 'none', userSelect: 'none' } : {}}>
                <div style={menuOpen ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                  <RichEditor
                    key={activeScene.id}
                    content={activeScene.content || ''}
                    onChange={handleEditorChange}
                  />
                </div>
              </div>

              <div className="editor-footer">
                <div className="editor-footer__item">
                  <FileText size={12} />
                  <span>{t('editor.palabras_escena', { count: activeScene.wordCount || 0 })}</span>
                </div>
                {activeScene.wordCount > 0 && (
                  <div className="editor-footer__item">
                    <Target size={12} />
                    <span>{t('editor.meta_escena', { count: Math.round((activeNovel?.targetWords || 100000) / (activeNovel?.targetScenes || 60)) })}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="editor-empty-state">
              <Edit3 size={40} />
              <p>{t('editor.seleccionar_escena')}</p>
            </div>
          )}
        </div>

        <div className={`editor-stats card ${!isStatsExpanded ? 'editor-stats--collapsed' : ''}`}>
          <div className="editor-stats__header" onClick={() => setIsStatsExpanded(!isStatsExpanded)}>
            <div className="stats-header__left">
              <BarChart2 size={16} className="editor-stats__icon" />
              <div className="stats-header__text">
                <span className="editor-stats__title">{t('estadisticas.titulo')}</span>
                {!isStatsExpanded && (
                  <span className="stats-header__summary">
                    {t('estadisticas.resumen', {
                      words: activeNovel?.wordCount?.toLocaleString() || 0,
                      streak: streak > 0 ? t('estadisticas.dias_fuego', { count: streak }) : t('estadisticas.sin_escribir_hoy')
                    })}
                  </span>
                )}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon stats-toggle" onClick={(e) => { e.stopPropagation(); setIsStatsExpanded(!isStatsExpanded); }}>
              {isStatsExpanded ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
            </button>
          </div>

          <div className="editor-stats__content">
            <div className="editor-stats__kpis">
              <div className="kpi">
                <Target size={16} className="kpi__icon" />
                <div>
                  <div className="kpi__value">{wordPct}%</div>
                  <div className="kpi__label">{t('estadisticas.objetivo_total')}</div>
                </div>
              </div>
              <div className="kpi">
                <Flame size={16} className={`kpi__icon ${streak > 0 ? 'kpi__icon--gold' : 'kpi__icon--muted'}`} />
                <div>
                  <div className="kpi__value">{streak}</div>
                  <div className="kpi__label">{t('estadisticas.racha_dias')}</div>
                </div>
              </div>
              <div className="kpi">
                <CheckCircle2 size={16} className="kpi__icon kpi__icon--green" />
                <div>
                  <div className="kpi__value">{completedScenes}</div>
                  <div className="kpi__label">{t('estadisticas.escenas_listas')}</div>
                </div>
              </div>
              <div className="kpi kpi--interactive" ref={goalEditorRef} onClick={() => setShowGoalEditor(!showGoalEditor)}>
                <FileText size={16} className="kpi__icon kpi__icon--gold" />
                <div>
                  <div className="kpi__value">{activeNovel?.wordCount?.toLocaleString() || 0}</div>
                  <div className="kpi__label">{t('estadisticas.palabras_totales')}</div>
                </div>
                {showGoalEditor && (
                  <div className="goal-editor-popover" onClick={e => e.stopPropagation()}>
                    <div className="goal-editor__header">{t('objetivos.establecer')}</div>
                    <div className="goal-editor__custom">
                      <input
                        type="number"
                        defaultValue={activeNovel?.targetWords}
                        onBlur={(e) => updateNovelTarget(activeNovel.id, parseInt(e.target.value), activeNovel?.targetScenes)}
                        placeholder={t('objetivos.meta_personalizada')}
                      />
                    </div>
                    <div className="goal-editor__templates">
                      {GOAL_TEMPLATES.map(g => (
                        <button
                          key={g.label}
                          className="goal-template-btn"
                          onClick={() => {
                            updateNovelTarget(activeNovel.id, g.words, g.targetScenes);
                            setShowGoalEditor(false);
                          }}
                        >
                          <div className="goal-template-btn__main">
                            <span className="goal-template-btn__label">{g.label}</span>
                            <span className="goal-template-btn__words">{t('objetivos.plantilla_palabras', { count: g.words })}</span>
                          </div>
                          <div className="goal-template-btn__meta">
                            <span className="goal-template-btn__meta-row">{t('objetivos.plantilla_meta', { scenes: g.scenesRange, wps: g.wps })}</span>
                            <span className="goal-template-btn__meta-row goal-template-btn__chapters">{t('objetivos.plantilla_capitulos', { count: g.chaptersRange })}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="editor-stats__bars">
              <ProgressBar
                label={t('estadisticas.progreso_palabras')}
                value={activeNovel?.wordCount || 0}
                max={activeNovel?.targetWords || 100000}
                sublabel={`${wordPct}%`}
                color="var(--accent)"
              />
              <ProgressBar
                label={t('estadisticas.escenas_completadas')}
                value={completedScenes}
                max={activeNovel?.targetScenes || 60}
                sublabel={`${scenePct}%`}
                color="var(--green)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── MPC Proposal Drawer movido a App.jsx ─────────────────── */}
    </div>
  )
}
