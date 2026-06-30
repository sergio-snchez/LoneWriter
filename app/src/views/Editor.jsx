import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import {
  BookOpen, Edit3, ChevronRight, Plus,
  FileText, Target, GripVertical,
  ChevronsDownUp, ChevronsUpDown
} from 'lucide-react'
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useNovel, useAI, useModal } from '../context'
import { Tooltip, RichEditor } from '../components'
import { upsertVector } from '../services'
import debounce from 'lodash/debounce'
import { SortableActSection, EditorToolbar, EditorStats, useEditorDnd, useEditorMpc } from './editor/index'
import './Editor.css'
import './editor/EditorMobile.css'
import './MpcBadge.css'

export default function EditorView({ menuOpen = false, onNavigate }) {
  const { t } = useTranslation('editor')
  const {
    acts, activeNovel, characters, updateScene,
    addAct, deleteAct, updateAct, addChapter, deleteChapter, updateChapter, addScene, deleteScene,
    updateActOrder, updateChapterOrder, updateSceneOrder, moveScene, moveChapter,
    updateNovelTarget, getStreak, activeScene, setActiveScene,
    expandedIds, setExpandedIds
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

  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
  const [treeWidth, setTreeWidth] = useState(400)
  const [isTreeDragging, setIsTreeDragging] = useState(false)
  const treeDragRef = useRef(false)
  const editorRef = useRef(null)
  const [isSaving, setIsSaving] = useState(null)
  const [streak, setStreak] = useState(0)
  const [isStatsExpanded, setIsStatsExpanded] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!treeDragRef.current || !editorRef.current) return
      const rect = editorRef.current.getBoundingClientRect()
      let newWidth = e.clientX - rect.left
      if (newWidth < 400) newWidth = 400
      if (newWidth > 500) newWidth = 500
      setTreeWidth(newWidth)
    }
    const handleMouseUp = () => {
      if (treeDragRef.current) {
        treeDragRef.current = false
        setIsTreeDragging(false)
        document.body.style.cursor = 'default'
        document.body.classList.remove('no-select')
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const startTreeDrag = useCallback((e) => {
    if (window.innerWidth <= 768) return
    treeDragRef.current = true
    setIsTreeDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.classList.add('no-select')
    e.preventDefault()
  }, [])

  const toggleExpand = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [setExpandedIds])

  // Persistence is now managed in NovelContext


  const handleExpandAll = useCallback(() => {
    const allIds = new Set();
    acts.forEach(act => {
      allIds.add(`act-${act.id}`);
      (act.chapters || []).forEach(ch => {
        allIds.add(`ch-${ch.id}`);
      });
    });
    setExpandedIds(allIds);
  }, [acts, setExpandedIds]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, [setExpandedIds]);

  // Sync activeScene with updated data from acts
  useEffect(() => {
    if (activeScene) {
      const allS = acts.flatMap(a => (a.chapters || []).flatMap(c => c.scenes || []))
      const updated = allS.find(s => s.id === activeScene.id)
      if (updated) setActiveScene(updated)
    }
  }, [acts])

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

  const debouncedRagUpsert = useCallback(
    debounce(async (sceneId, novelId, text) => {
      await upsertVector(sceneId, novelId, text)
    }, 5000),
    []
  )

  const { triggerMpcAnalysis, handleManualMpcScan } = useEditorMpc({
    activeNovel,
    activeScene,
    isMpcEnabled,
    apiKey,
    provider,
    currentModel,
    localBaseUrl,
    mpcCooldownRef,
    MPC_COOLDOWN_MS,
    mpcStatus,
    setMpcStatus,
    addMpcProposals,
    logAIUsage,
  })

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
      if (novelId && text.length > 10) {
        debouncedRagUpsert(sceneId, novelId, text)
      }
    }, 1000),
    [updateScene, debouncedRagUpsert]
  )

  const handleEditorChange = (html) => {
    if (activeScene) {
      debouncedSave(activeScene.id, activeNovel?.id, html)
      triggerMpcAnalysis(html)
    }
  }

  useEffect(() => {
    const fetchStreak = async () => {
      if (activeNovel) {
        const s = await getStreak(activeNovel.id)
        setStreak(s)
      }
    }
    fetchStreak()
  }, [activeNovel, getStreak])

  const handleAddAct = async () => {
    openModal('prompt', {
      title: t('nuevo.acto_titulo'),
      message: t('nuevo.acto_mensaje'),
      placeholder: t('nuevo.acto_placeholder'),
      confirmLabel: t('nuevo.acto_boton'),
      onConfirm: (title) => addAct(activeNovel.id, title)
    });
  }

  const handleAddChapter = useCallback(async (actId) => {
    openModal('prompt', {
      title: t('nuevo.capitulo_titulo'),
      message: t('nuevo.capitulo_mensaje'),
      placeholder: t('nuevo.capitulo_placeholder'),
      confirmLabel: t('nuevo.capitulo_boton'),
      onConfirm: (title) => addChapter(actId, title)
    });
  }, [openModal, t, addChapter])

  const handleAddScene = useCallback(async (chapterId) => {
    openModal('prompt', {
      title: t('nuevo.escena_titulo'),
      message: t('nuevo.escena_mensaje'),
      placeholder: t('nuevo.escena_placeholder'),
      confirmLabel: t('nuevo.escena_boton'),
      onConfirm: (title) => addScene(chapterId, title)
    });
  }, [openModal, t, addScene])

  const confirmDeleteAct = useCallback((id) => {
    openModal('confirm', {
      title: t('acto.eliminar_titulo'),
      message: t('acto.eliminar_mensaje'),
      isDanger: true,
      confirmLabel: t('acto.eliminar_boton'),
      onConfirm: () => deleteAct(id)
    });
  }, [openModal, t, deleteAct])

  const confirmDeleteChapter = useCallback((id) => {
    openModal('confirm', {
      title: t('capitulo.eliminar_titulo'),
      message: t('capitulo.eliminar_mensaje'),
      isDanger: true,
      confirmLabel: t('capitulo.eliminar_boton'),
      onConfirm: () => deleteChapter(id)
    });
  }, [openModal, t, deleteChapter])

  const confirmDeleteScene = useCallback((id) => {
    openModal('confirm', {
      title: t('eliminar_escena.titulo'),
      message: t('eliminar_escena.mensaje'),
      isDanger: true,
      confirmLabel: t('eliminar_escena.boton'),
      onConfirm: () => deleteScene(id)
    });
  }, [openModal, t, deleteScene])

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

  const totalChapters = useMemo(() => acts.reduce((acc, act) => acc + (act.chapters?.length || 0), 0), [acts])
  const allScenes = useMemo(() => acts.flatMap(act => (act.chapters || []).flatMap(ch => ch.scenes || [])), [acts])
  const totalScenes = allScenes.length

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
              <EditorToolbar
                onNavigate={onNavigate}
                menuOpen={menuOpen}
                handleManualMpcScan={handleManualMpcScan}
              />

              <div className={`editor-body ${menuOpen ? 'editor-body--menu-open' : ''}`}>
                <div className={`${menuOpen ? 'editor-content--dimmed' : ''}`}>
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

        <EditorStats
          activeNovel={activeNovel}
          acts={acts}
          streak={streak}
          t={t}
          updateNovelTarget={updateNovelTarget}
          isStatsExpanded={isStatsExpanded}
          setIsStatsExpanded={setIsStatsExpanded}
        />
      </div>

      {/* ── MPC Proposal Drawer movido a App.jsx ─────────────────── */}
    </div>
  )
}
EditorView.propTypes = {
  menuOpen: PropTypes.bool,
  onNavigate: PropTypes.func,
};
