import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookOpen, ChevronDown, ChevronRight, Plus, Eye, Edit3,
  FileText, Clock, CheckCircle2, Circle,
  AlertCircle, BarChart2, Target, Flame, Save, Loader2, Trash2, FileDown,
  GripVertical, ChevronsDownUp, ChevronsUpDown
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNovel } from '../context/NovelContext'
import { useAI } from '../context/AIContext'
import { useModal } from '../context/ModalContext'
import { ExportService } from '../services/exportService'
import { Tooltip } from '../components/Tooltip'
import RichEditor from '../components/RichEditor'
import debounce from 'lodash/debounce'
import './Editor.css'

const STATUS_MAP = {
  'Finalizado':    { icon: CheckCircle2, cls: 'status-done',    badge: 'badge-green' },
  'En progreso':   { icon: AlertCircle,  cls: 'status-wip',     badge: 'badge-gold'  },
  'Borrador':      { icon: Circle,       cls: 'status-draft',   badge: 'badge-muted' },
  'Sin comenzar':  { icon: Circle,       cls: 'status-none',    badge: 'badge-muted' },
}

const STATUS_OPTIONS = ['Sin comenzar', 'Borrador', 'En progreso', 'Finalizado'];

function StatusBadge({ status }) {
  const { t } = useTranslation('editor')
  const map = STATUS_MAP[status] || STATUS_MAP['Sin comenzar']
  const statusKey = status.toLowerCase().replace(/ /g, '_')
  return <span className={`badge ${map.badge}`}>{t(`estado.${statusKey}`)}</span>
}

// ---- Editable Title ----
function EditableTitle({ title, onSave, className, isPlayfair, isBold }) {
  const { t } = useTranslation('common')
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(title);

  useEffect(() => { setVal(title) }, [title]);

  const save = () => {
    setIsEditing(false);
    if (val.trim() && val !== title) onSave(val.trim());
    else setVal(title);
  }

  if (isEditing) {
    return (
      <input 
        className={`edit-input ${className}`}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') { setIsEditing(false); setVal(title); }
        }}
        autoFocus
        onClick={e => e.stopPropagation()}
        style={{ 
          width: '100%', padding: '2px 4px', border: '1px solid var(--accent)', 
          borderRadius: '4px', background: 'var(--bg-base)', color: 'var(--text-primary)', 
          outline: 'none', fontFamily: isPlayfair ? "'Playfair Display', serif" : "'Inter', sans-serif", 
          fontWeight: isBold ? 600 : 500, fontSize: 'inherit'
        }}
      />
    )
  }

  return (
    <Tooltip content={t('editable.doble_clic')}>
      <span 
        className={className} 
        onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      >
        {title}
      </span>
    </Tooltip>
  )
}

// ---- Sortable Components ----

function SortableSceneRow({ scene, chapterIndex, sceneIndex, isActive, onSelect, onDelete, onUpdate }) {
  const { t } = useTranslation('editor')
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `scene-${scene.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`scene-row ${isActive ? 'scene-row--active' : ''}`} 
      onClick={() => onSelect(scene)}
    >
      <div className="scene-row__grip" {...attributes} {...listeners}>
        <GripVertical size={12} />
      </div>
      <div className="scene-row__num">
        {chapterIndex + 1}.{sceneIndex + 1}
      </div>
      <div className="scene-row__info">
        <EditableTitle 
          title={scene.title} 
          className="scene-row__title" 
          onSave={(newTitle) => onUpdate(scene.id, { title: newTitle })} 
        />
        <span className="scene-row__pov">{scene.pov ? `POV: ${scene.pov}` : t('escena.sin_pov')}</span>
      </div>
      <div className="scene-row__meta">
        <StatusBadge status={scene.status} />
      </div>
      <div className="scene-row__actions">
        <button 
          className="scene-row__btn btn btn-ghost btn-icon text-danger" 
          onClick={(e) => { e.stopPropagation(); onDelete(scene.id); }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function SortableChapterAccordion({ chapter, chapterIndex, actIndex, isOpen, onToggle, activeSceneId, onSelectScene, onAddScene, onDeleteScene, onDeleteChapter, onUpdateChapter, onUpdateScene }) {
  const { t } = useTranslation('editor')
    const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `ch-${chapter.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.4 : 1,
  };

  const isChapterCompleted = chapter.scenes?.length > 0 && chapter.scenes.every(s => s.status === 'Finalizado');
  const chapterWords = chapter.scenes?.reduce((acc, s) => acc + (s.wordCount || 0), 0) || 0;
  
  const completedScenes = chapter.scenes?.filter(s => s.status === 'Finalizado').length || 0;
  const chapterProgress = chapter.scenes?.length > 0 ? (completedScenes / chapter.scenes.length) * 100 : 0;

  return (
    <div ref={setNodeRef} style={style} className={`chapter-accordion ${isOpen ? 'chapter-accordion--open' : ''} ${isChapterCompleted ? 'chapter-accordion--completed' : ''}`} data-id={`ch-${chapter.id}`} data-expandable="true">
      <div className="chapter-accordion__header-wrap">
        <div className="chapter-grip" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </div>
        <button className="chapter-accordion__header" onClick={onToggle}>
          <span className="chapter-accordion__chevron">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <div className="chapter-accordion__title-group">
            <div className="chapter-accordion__num-row">
              <span className="chapter-accordion__num">
                {t('capitulo.numero', { num: chapterIndex + 1 })}
                {isChapterCompleted && (
                  <CheckCircle2 size={12} className="chapter-accordion__status-icon" />
                )}
              </span>
              <span className="chapter-accordion__words">{t('capitulo.palabras', { count: chapterWords })}</span>
            </div>
            <EditableTitle 
              title={chapter.title} 
              className="chapter-accordion__title" 
              onSave={(newTitle) => onUpdateChapter(chapter.id, { title: newTitle })} 
            />
            <div className="chapter-accordion__progress-bar">
              <div className="chapter-accordion__progress-fill" style={{ width: `${chapterProgress}%` }} />
            </div>
          </div>
        </button>
        <button className="btn btn-ghost btn-icon chapter-delete-btn" onClick={() => onDeleteChapter(chapter.id)}>
          <Trash2 size={13} />
        </button>
      </div>

      {isOpen && (
        <div className="chapter-accordion__body">
          <SortableContext items={chapter.scenes?.map(s => `scene-${s.id}`) || []} strategy={verticalListSortingStrategy}>
            {chapter.scenes?.map((scene, scIdx) => (
              <SortableSceneRow 
                key={scene.id} 
                scene={scene} 
                chapterIndex={chapterIndex} 
                sceneIndex={scIdx}
                isActive={activeSceneId === scene.id}
                onSelect={onSelectScene}
                onDelete={onDeleteScene}
                onUpdate={onUpdateScene}
              />
            ))}
          </SortableContext>
          <button className="chapter-accordion__add-scene btn btn-ghost" onClick={() => onAddScene(chapter.id)}>
            <Plus size={13} />
            {t('escena.añadir_escena')}
          </button>
        </div>
      )}
    </div>
  )
}

function SortableActSection({ 
  act, actIndex, chapterOffset, isOpen, onToggle, activeSceneId, onSelectScene, 
  onAddChapter, onAddScene, onDeleteScene, onDeleteChapter, 
  onDeleteAct, onUpdateAct, onUpdateChapter, onUpdateScene, expandedIds, onSubToggle
}) {
  const { t } = useTranslation('editor')
  const completedChapters = act.chapters?.filter(c => 
    c.scenes?.length > 0 && c.scenes.every(s => s.status === 'Finalizado')
  ).length || 0;
  
  const actWords = act.chapters?.reduce((acc, ch) => 
    acc + (ch.scenes?.reduce((sAcc, s) => sAcc + (s.wordCount || 0), 0) || 0), 0
  ) || 0;

  const actProgress = act.chapters?.length > 0 ? (completedChapters / act.chapters.length) * 100 : 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `act-${act.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 25 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`act-section ${isOpen ? 'act-section--open' : ''}`} data-id={`act-${act.id}`} data-expandable="true">
      <div className="act-section__header-wrap">
        <div className="act-grip" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>
        <button className="act-section__header" onClick={onToggle}>
          <span className="act-section__chevron">
            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </span>
          <div className="act-section__title-group">
            <EditableTitle 
              title={act.title} 
              className="act-section__title" 
              isPlayfair={true} isBold={true}
              onSave={(newTitle) => onUpdateAct(act.id, { title: newTitle })} 
            />
            <div className="act-section__progress-bar">
              <div className="act-section__progress-fill" style={{ width: `${actProgress}%` }} />
            </div>
          </div>
          <div className="act-section__meta">
            <span className="act-section__chapters">{t('acto.capitulos', { completed: completedChapters, total: act.chapters?.length || 0 })}</span>
            <span className="act-section__words-total">{t('acto.palabras', { count: actWords })}</span>
          </div>
        </button>
        <button className="btn btn-ghost btn-icon act-delete-btn" onClick={() => onDeleteAct(act.id)}>
          <Trash2 size={14} />
        </button>
      </div>

      {isOpen && (
        <div className="act-section__body">
          <SortableContext items={act.chapters?.map(c => `ch-${c.id}`) || []} strategy={verticalListSortingStrategy}>
            {act.chapters?.map((ch, chIdx) => {
                const globalChapterIndex = chapterOffset + chIdx;
                return (
                  <SortableChapterAccordion 
                    key={ch.id} 
                    chapter={ch} 
                    chapterIndex={globalChapterIndex}
                    actIndex={actIndex}
                    isOpen={expandedIds.has(`ch-${ch.id}`)} 
                    onToggle={() => onSubToggle(`ch-${ch.id}`)}
                    activeSceneId={activeSceneId}
                    onSelectScene={onSelectScene}
                    onAddScene={onAddScene}
                    onDeleteScene={onDeleteScene}
                    onDeleteChapter={onDeleteChapter}
                    onUpdateChapter={onUpdateChapter}
                    onUpdateScene={onUpdateScene}
                  />
                );
              })}
          </SortableContext>
          <button className="act-section__add-ch btn btn-ghost" onClick={() => onAddChapter(act.id)}>
            <Plus size={13} />
            {t('capitulo.añadir')}
          </button>
        </div>
      )}
    </div>
  )
}

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

export default function EditorView() {
  const { t } = useTranslation('editor')
  const { 
    acts, activeNovel, characters, updateScene, 
    addAct, deleteAct, updateAct, addChapter, deleteChapter, updateChapter, addScene, deleteScene,
    updateActOrder, updateChapterOrder, updateSceneOrder, moveScene, moveChapter,
    updateNovelTarget, getStreak, activeScene, setActiveScene,
    getNovelUIExpanded, updateNovelUIExpanded
  } = useNovel()
  const { openModal } = useModal()
  const { oracleStatus } = useAI()
  
  const [isSaving, setIsSaving] = useState(null)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [activeDragId, setActiveDragId] = useState(null)
  const [streak, setStreak] = useState(0)
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [isStatsExpanded, setIsStatsExpanded] = useState(false)
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
  const goalEditorRef = useRef(null)
  const hoverTimerRef = useRef(null)

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

  useEffect(() => {
    if (activeNovel?.id) {
      getNovelUIExpanded(activeNovel.id).then(setExpandedIds);
    } else {
      setExpandedIds(new Set());
    }
  }, [activeNovel?.id, getNovelUIExpanded]);

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

  useEffect(() => {
    if (!activeNovel?.id) return;
    const timeoutId = setTimeout(() => {
      updateNovelUIExpanded(activeNovel.id, expandedIds);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [expandedIds, activeNovel?.id, updateNovelUIExpanded]);

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

  // ... auto save logic ...
  const debouncedSave = useCallback(
    debounce(async (sceneId, html) => {
      setIsSaving(true)
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const words = text ? text.split(' ').length : 0
      
      await updateScene(sceneId, { 
        content: html, 
        wordCount: words,
        lastEdited: new Date().toISOString()
      })
      
      setIsSaving(false)
    }, 1000),
    [updateScene]
  )

  const handleEditorChange = (html) => {
    if (activeScene) {
      debouncedSave(activeScene.id, html)
    }
  }

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
    await ExportService.exportToWord(activeScene.title, activeScene.content)
  }

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    // Auto-expand collapsed containers when dragging over them
    const overIdStr = over.id.toString();
    if (active.id !== over.id && (overIdStr.startsWith('act-') || overIdStr.startsWith('ch-'))) {
      if (!expandedIds.has(over.id)) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
          setExpandedIds(prev => new Set([...prev, over.id]));
        }, 600);
      }
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  const handleDragEnd = async (event) => {
    setActiveDragId(null);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    if (activeIdStr === overIdStr) return;

    // Helper to get numeric ID
    const getNumId = (str) => parseInt(str.split('-')[1]);

    // 1. Reordering Acts (Root level)
    if (activeIdStr.startsWith('act-')) {
      const activeId = getNumId(activeIdStr);
      const overId = getNumId(overIdStr);
      const oldIndex = acts.findIndex(a => a.id === activeId);
      const newIndex = acts.findIndex(a => a.id === overId);
      if (newIndex !== -1) {
        const newOrder = arrayMove(acts, oldIndex, newIndex).map(a => a.id);
        updateActOrder(activeNovel.id, newOrder);
      }
      return;
    }

    // 2. Reordering Chapters or Scenes
    let activeType = activeIdStr.startsWith('ch-') ? 'chapter' : (activeIdStr.startsWith('scene-') ? 'scene' : null);
    if (!activeType) return;
    
    let numericActiveId = getNumId(activeIdStr);
    let activeParentId = null;

    // Find active element's current parent
    for (const act of acts) {
      if (activeType === 'chapter' && act.chapters?.some(c => c.id === numericActiveId)) {
        activeParentId = act.id;
        break;
      }
      if (activeType === 'scene') {
        for (const ch of act.chapters || []) {
          if (ch.scenes?.some(s => s.id === numericActiveId)) {
            activeParentId = ch.id;
            break;
          }
        }
      }
      if (activeParentId) break;
    }

    if (!activeParentId) return;

    // Moving Scenes
    if (activeType === 'scene') {
      let targetChapterId = null;
      let targetAct = null;

      // Find where "over" is
      for (const act of acts) {
        for (const ch of act.chapters || []) {
          if (`ch-${ch.id}` === overIdStr || ch.scenes?.some(s => `scene-${s.id}` === overIdStr)) {
            targetChapterId = ch.id;
            targetAct = act;
            break;
          }
        }
        if (targetChapterId) break;
      }

      if (targetChapterId) {
        const targetChapter = targetAct.chapters.find(c => c.id === targetChapterId);
        const sourceChapter = acts.flatMap(a => a.chapters || []).find(c => c.id === activeParentId);
        
        const currentScenes = [...(targetChapter.scenes || [])];
        const numericOverId = getNumId(overIdStr);
        
        if (activeParentId === targetChapterId) {
          const oldIndex = currentScenes.findIndex(s => s.id === numericActiveId);
          const newIndex = currentScenes.findIndex(s => s.id === numericOverId);
          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrderIds = arrayMove(currentScenes, oldIndex, newIndex).map(s => s.id);
            updateSceneOrder(activeNovel.id, newOrderIds);
          }
        } else {
          const activeSceneObj = sourceChapter.scenes.find(s => s.id === numericActiveId);
          const overIndex = currentScenes.findIndex(s => s.id === numericOverId);
          if (overIndex !== -1) {
            currentScenes.splice(overIndex, 0, activeSceneObj);
          } else {
            currentScenes.push(activeSceneObj);
          }
          moveScene(numericActiveId, targetChapterId, currentScenes.map(s => s.id));
        }
      }
    }

    // Moving Chapters
    if (activeType === 'chapter') {
      let targetActId = null;
      for (const act of acts) {
        if (`act-${act.id}` === overIdStr || act.chapters?.some(c => `ch-${c.id}` === overIdStr)) {
          targetActId = act.id;
          break;
        }
      }

      if (targetActId) {
        const targetAct = acts.find(a => a.id === targetActId);
        const sourceAct = acts.find(a => a.id === activeParentId);
        const currentChapters = [...(targetAct.chapters || [])];
        const numericOverId = getNumId(overIdStr);

        if (activeParentId === targetActId) {
          const oldIndex = currentChapters.findIndex(c => c.id === numericActiveId);
          const newIndex = currentChapters.findIndex(c => c.id === numericOverId);
          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(currentChapters, oldIndex, newIndex).map(c => c.id);
            updateChapterOrder(activeNovel.id, newOrder);
          }
        } else {
          const activeChapterObj = sourceAct.chapters.find(c => c.id === numericActiveId);
          const overIndex = currentChapters.findIndex(c => c.id === numericOverId);
          if (overIndex !== -1) {
            currentChapters.splice(overIndex, 0, activeChapterObj);
          } else {
            currentChapters.push(activeChapterObj);
          }
          moveChapter(numericActiveId, targetActId, currentChapters.map(c => c.id));
        }
      }
    }
  };

  const totalChapters = acts.reduce((acc, act) => acc + (act.chapters?.length || 0), 0)
  const completedChapters = acts.reduce((acc, act) => acc + (act.chapters?.filter(c => c.status === 'Finalizado').length || 0), 0)
  
  const allScenes = acts.flatMap(act => (act.chapters || []).flatMap(ch => ch.scenes || []))
  const totalScenes = allScenes.length
  const completedScenes = allScenes.filter(s => s.status === 'Finalizado').length
  
  const wordPct = activeNovel ? Math.round((activeNovel.wordCount / (activeNovel.targetWords || 100000)) * 100) : 0
  const scenePct = (activeNovel?.targetScenes || 60) > 0 ? Math.round((completedScenes / (activeNovel.targetScenes || 60)) * 100) : 0

  // Compute drag ghost label
  const getDragLabel = (id) => {
    if (!id) return '';
    const idStr = id.toString();
    if (idStr.startsWith('act-')) {
      const act = acts.find(a => `act-${a.id}` === idStr);
      return act ? act.title : t('drag.acto');
    }
    if (idStr.startsWith('ch-')) {
      for (const act of acts) {
        const ch = (act.chapters || []).find(c => `ch-${c.id}` === idStr);
        if (ch) return ch.title;
      }
      return t('drag.capitulo');
    }
    if (idStr.startsWith('scene-')) {
      for (const act of acts) {
        for (const ch of act.chapters || []) {
          const sc = (ch.scenes || []).find(s => `scene-${s.id}` === idStr);
          if (sc) return sc.title;
        }
      }
      return t('drag.escena');
    }
    return '';
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div className="editor-view">
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
      <div className="editor-view__tree">
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
        <div className={`editor-main ${activeScene ? '' : 'editor-main--empty'}`}>
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
                    <h2 className="editor-header__title">{activeScene.title}</h2>
                    <div className="editor-header__metadata">
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
                    </div>
                  </div>
                </div>
                <div className="editor-header__status-row">
                  <Tooltip content={t('editor.exportar_word')}>
                    <button className="btn btn-ghost btn-sm" onClick={handleExportScene}>
                      <FileDown size={14} />
                      {t('editor.word')}
                    </button>
                  </Tooltip>
                  <Tooltip content={t('editor.tooltip_oraculo')}>
                    <div
                      className={`oracle-traffic-light oracle-traffic-light--${oracleStatus.status} editor-traffic-light`}
                      onClick={() => {
                        if (oracleStatus.status !== 'idle') {
                          window.dispatchEvent(new CustomEvent('open-oracle-panel'));
                        }
                      }}
                      style={oracleStatus.status !== 'idle' ? { cursor: 'pointer' } : {}}
                    >
                      <div className="oracle-traffic-light__dot" />
                      <span className="oracle-traffic-light__label">
                        {oracleStatus.status === 'idle' && t('editor.sin_coincidencias')}
                        {oracleStatus.status === 'suspicious' && t('editor.coincidencias')}
                        {oracleStatus.status === 'error' && t('editor.contradiccion')}
                      </span>
                    </div>
                  </Tooltip>
                </div>
              </div>
              
              <div className="editor-body">
                <RichEditor 
                  key={activeScene.id} 
                  content={activeScene.content || ''} 
                  onChange={handleEditorChange}
                />
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
    </div>
  )
}
