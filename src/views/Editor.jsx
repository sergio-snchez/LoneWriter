import { useState, useCallback, useEffect, useRef } from 'react'
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
import { useModal } from '../context/ModalContext'
import { ExportService } from '../services/exportService'
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
  const map = STATUS_MAP[status] || STATUS_MAP['Sin comenzar']
  return <span className={`badge ${map.badge}`}>{status}</span>
}

// ---- Editable Title ----
function EditableTitle({ title, onSave, className, isPlayfair, isBold }) {
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
    <span 
      className={className} 
      onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      title="Doble clic para editar"
    >
      {title}
    </span>
  )
}

// ---- Sortable Components ----

function SortableSceneRow({ scene, chapterIndex, sceneIndex, isActive, onSelect, onDelete, onUpdate }) {
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
        <span className="scene-row__pov">{scene.pov ? `POV: ${scene.pov}` : 'Sin POV'}</span>
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
                Cap. {chapterIndex + 1}
                {isChapterCompleted && (
                  <CheckCircle2 size={12} className="chapter-accordion__status-icon" />
                )}
              </span>
              <span className="chapter-accordion__words">{chapterWords.toLocaleString('es-ES')} pal.</span>
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
            Añadir escena
          </button>
        </div>
      )}
    </div>
  )
}

function SortableActSection({ 
  act, actIndex, isOpen, onToggle, activeSceneId, onSelectScene, 
  onAddChapter, onAddScene, onDeleteScene, onDeleteChapter, 
  onDeleteAct, onUpdateAct, onUpdateChapter, onUpdateScene, expandedIds, onSubToggle
}) {
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
            <span className="act-section__chapters">{completedChapters}/{act.chapters?.length || 0} cap.</span>
            <span className="act-section__words-total">{actWords.toLocaleString('es-ES')} pal.</span>
          </div>
        </button>
        <button className="btn btn-ghost btn-icon act-delete-btn" onClick={() => onDeleteAct(act.id)}>
          <Trash2 size={14} />
        </button>
      </div>

      {isOpen && (
        <div className="act-section__body">
          <SortableContext items={act.chapters?.map(c => `ch-${c.id}`) || []} strategy={verticalListSortingStrategy}>
            {act.chapters?.map((ch, chIdx) => (
              <SortableChapterAccordion 
                key={ch.id} 
                chapter={ch} 
                chapterIndex={chIdx}
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
            ))}
          </SortableContext>
          <button className="act-section__add-ch btn btn-ghost" onClick={() => onAddChapter(act.id)}>
            <Plus size={13} />
            Añadir capítulo
          </button>
        </div>
      )}
    </div>
  )
}

function ProgressBar({ value, max, label, sublabel, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="progress-item">
      <div className="progress-item__labels">
        <span className="progress-item__label">{label}</span>
        <span className="progress-item__nums">{value?.toLocaleString('es-ES') || 0} / {max?.toLocaleString('es-ES') || 0}</span>
      </div>
      <div className="progress-item__bar-bg">
        <div
          className="progress-item__bar-fill"
          style={{ width: `${pct}%`, background: color || 'var(--accent)' }}
        />
      </div>
      {sublabel && <span className="progress-item__sublabel">{sublabel} completado</span>}
    </div>
  )
}

export default function EditorView() {
  const { 
    acts, activeNovel, characters, updateScene, 
    addAct, deleteAct, updateAct, addChapter, deleteChapter, updateChapter, addScene, deleteScene,
    updateActOrder, updateChapterOrder, updateSceneOrder, moveScene, moveChapter,
    updateNovelTarget, getStreak, activeScene, setActiveScene
  } = useNovel()
  const { openModal } = useModal()
  
  const [isSaving, setIsSaving] = useState(false)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [activeDragId, setActiveDragId] = useState(null)
  const [streak, setStreak] = useState(0)
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [isStatsExpanded, setIsStatsExpanded] = useState(true)
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

  const GOAL_TEMPLATES = [
    { label: 'Micro-relato', words: 1000, targetScenes: 2, scenesRange: '1-2', wps: '500-1000' },
    { label: 'Cuento corto', words: 5000, targetScenes: 5, scenesRange: '3-6', wps: '1000-1500' },
    { label: 'Novela Corta', words: 30000, targetScenes: 25, scenesRange: '20-30', wps: '1000-1500' },
    { label: 'Novela Estándar', words: 80000, targetScenes: 70, scenesRange: '60-80', wps: '1200-1500' },
    { label: 'Novela Fantasía', words: 110000, targetScenes: 100, scenesRange: '80-100', wps: '1200-1500' },
  ];

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
        setExpandedIds(prev => new Set([...prev, firstAct.id, firstAct.chapters[0].id]))
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
      title: 'Nuevo Acto',
      message: 'Introduce el título para el nuevo acto:',
      placeholder: 'Acto II: El conflicto',
      confirmLabel: 'Añadir Acto',
      onConfirm: (title) => addAct(activeNovel.id, title)
    });
  }

  const handleAddChapter = async (actId) => {
    openModal('prompt', {
      title: 'Nuevo Capítulo',
      message: 'Introduce el título para el nuevo capítulo:',
      placeholder: 'Capítulo...',
      confirmLabel: 'Añadir Capítulo',
      onConfirm: (title) => addChapter(actId, title)
    });
  }

  const handleAddScene = async (chapterId) => {
    openModal('prompt', {
      title: 'Nueva Escena',
      message: 'Introduce el título para la nueva escena:',
      placeholder: 'Escena...',
      confirmLabel: 'Añadir Escena',
      onConfirm: (title) => addScene(chapterId, title)
    });
  }

  const confirmDeleteAct = (id) => {
    openModal('confirm', {
      title: 'Eliminar Acto',
      message: '¿Seguro que quieres eliminar este acto? Se borrarán todos sus capítulos y escenas.',
      isDanger: true,
      confirmLabel: 'Eliminar Acto',
      onConfirm: () => deleteAct(id)
    });
  }

  const confirmDeleteChapter = (id) => {
    openModal('confirm', {
      title: 'Eliminar Capítulo',
      message: '¿Seguro que quieres eliminar este capítulo? Se borrarán todas sus escenas.',
      isDanger: true,
      confirmLabel: 'Eliminar Capítulo',
      onConfirm: () => deleteChapter(id)
    });
  }

  const confirmDeleteScene = (id) => {
    openModal('confirm', {
      title: 'Eliminar Escena',
      message: '¿Seguro que quieres eliminar esta escena permanentemente?',
      isDanger: true,
      confirmLabel: 'Eliminar Escena',
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
      return act ? act.title : 'Acto';
    }
    if (idStr.startsWith('ch-')) {
      for (const act of acts) {
        const ch = (act.chapters || []).find(c => `ch-${c.id}` === idStr);
        if (ch) return ch.title;
      }
      return 'Capítulo';
    }
    if (idStr.startsWith('scene-')) {
      for (const act of acts) {
        for (const ch of act.chapters || []) {
          const sc = (ch.scenes || []).find(s => `scene-${s.id}` === idStr);
          if (sc) return sc.title;
        }
      }
      return 'Escena';
    }
    return '';
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div className="editor-view">
      <div className="editor-view__tree">
        <div className="editor-view__tree-header">
          <div className="tree-header__left">
            <h1 className="section-title">Estructura narrativa</h1>
            <p className="section-subtitle">{acts.length} actos · {totalChapters} capítulos · {totalScenes} escenas</p>
          </div>
          <div className="tree-header__actions">
            <div className="tree-header__bulk-btns">
              <button className="btn btn-ghost btn-icon" onClick={handleExpandAll} title="Expandir todo">
                <ChevronsUpDown size={14} />
              </button>
              <button className="btn btn-ghost btn-icon" onClick={handleCollapseAll} title="Contraer todo">
                <ChevronsDownUp size={14} />
              </button>
            </div>
            <button className="btn btn-primary" onClick={handleAddAct}>
              <Plus size={14} />
              Acto
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
              {acts.map((act, idx) => (
                <SortableActSection 
                  key={act.id} 
                  act={act} 
                  actIndex={idx}
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
              ))}
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
                          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div className="meta-field">
                        <Eye size={12} />
                        <select 
                          value={activeScene.pov} 
                          onChange={(e) => handleMetaChange('pov', e.target.value)}
                          className="meta-select"
                        >
                          <option value="">Sin POV</option>
                          {characters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="editor-header__status-row">
                  <button className="btn btn-ghost btn-sm" onClick={handleExportScene} title="Exportar escena a Word">
                    <FileDown size={14} />
                    Word
                  </button>
                  {isSaving ? (
                    <div className="save-indicator">
                      <Loader2 size={12} className="spinner" />
                      <span>Guardando...</span>
                    </div>
                  ) : (
                    <div className="save-indicator save-indicator--done">
                      <Save size={12} />
                      <span>Guardado</span>
                    </div>
                  )}
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
                  <span>{activeScene.wordCount?.toLocaleString('es-ES') || 0} palabras en esta escena</span>
                </div>
                <div className="editor-footer__item">
                  <Target size={12} />
                  <span>Meta: 1.500 palabras</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="editor-empty-state">
              <Edit3 size={40} />
              <p>Selecciona una escena para comenzar a escribir</p>
            </div>
          )}
        </div>

        <div className={`editor-stats card ${!isStatsExpanded ? 'editor-stats--collapsed' : ''}`}>
          <div className="editor-stats__header" onClick={() => setIsStatsExpanded(!isStatsExpanded)}>
            <div className="stats-header__left">
              <BarChart2 size={16} className="editor-stats__icon" />
              <div className="stats-header__text">
                <span className="editor-stats__title">Estadísticas del proyecto</span>
                {!isStatsExpanded && (
                  <span className="stats-header__summary">
                    {activeNovel?.wordCount?.toLocaleString('es-ES') || 0} palabras escritas · {streak > 0 ? `🔥 ${streak} días` : 'No has escrito hoy'}
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
                  <div className="kpi__label">Objetivo total</div>
                </div>
              </div>
              <div className="kpi">
                <Flame size={16} className={`kpi__icon ${streak > 0 ? 'kpi__icon--gold' : 'kpi__icon--muted'}`} />
                <div>
                  <div className="kpi__value">{streak}</div>
                  <div className="kpi__label">Racha días</div>
                </div>
              </div>
              <div className="kpi">
                <CheckCircle2 size={16} className="kpi__icon kpi__icon--green" />
                <div>
                  <div className="kpi__value">{completedScenes}</div>
                  <div className="kpi__label">Escenas listas</div>
                </div>
              </div>
              <div className="kpi kpi--interactive" ref={goalEditorRef} onClick={() => setShowGoalEditor(!showGoalEditor)}>
                <FileText size={16} className="kpi__icon kpi__icon--gold" />
                <div>
                  <div className="kpi__value">{activeNovel?.wordCount?.toLocaleString('es-ES') || 0}</div>
                  <div className="kpi__label">Palabras totales</div>
                </div>
                {showGoalEditor && (
                  <div className="goal-editor-popover" onClick={e => e.stopPropagation()}>
                    <div className="goal-editor__header">Establecer Objetivo</div>
                    <div className="goal-editor__custom">
                      <input 
                        type="number" 
                        defaultValue={activeNovel?.targetWords} 
                        onBlur={(e) => updateNovelTarget(activeNovel.id, parseInt(e.target.value), activeNovel?.targetScenes)}
                        placeholder="Meta personalizada..."
                      />
                    </div>
                    <div className="goal-editor__templates">
                      {GOAL_TEMPLATES.map(t => (
                        <button 
                          key={t.label} 
                          className="goal-template-btn"
                          onClick={() => {
                            updateNovelTarget(activeNovel.id, t.words, t.targetScenes);
                            setShowGoalEditor(false);
                          }}
                        >
                          <div className="goal-template-btn__main">
                            <span className="goal-template-btn__label">{t.label}</span>
                            <span className="goal-template-btn__words">{t.words.toLocaleString('es-ES')} pal.</span>
                          </div>
                          <div className="goal-template-btn__meta">
                            {t.scenesRange} escenas · {t.wps} pal/escena
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
                label="Progreso de palabras"
                value={activeNovel?.wordCount || 0}
                max={activeNovel?.targetWords || 100000}
                sublabel={`${wordPct}%`}
                color="var(--accent)"
              />
              <ProgressBar
                label="Escenas completadas"
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
