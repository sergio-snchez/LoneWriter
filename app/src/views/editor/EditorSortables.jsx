/**
 * EditorSortables.jsx — Drag-and-drop sortable UI components for the Editor.
 * Extracted from Editor.jsx for maintainability.
 *
 * Exports: STATUS_MAP, STATUS_OPTIONS, StatusBadge, EditableTitle,
 *          SortableSceneRow, SortableChapterAccordion, SortableActSection
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown, ChevronRight, Plus, CheckCircle2, Circle,
  AlertCircle, Trash2, GripVertical,
} from 'lucide-react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tooltip } from '../../components/Tooltip'

// ─── Status Maps ──────────────────────────────────────────────────────────────

export const STATUS_MAP = {
  'Finalizado':   { icon: CheckCircle2, cls: 'status-done',  badge: 'badge-green' },
  'En progreso':  { icon: AlertCircle,  cls: 'status-wip',   badge: 'badge-gold'  },
  'Borrador':     { icon: Circle,       cls: 'status-draft',  badge: 'badge-muted' },
  'Sin comenzar': { icon: Circle,       cls: 'status-none',   badge: 'badge-muted' },
}

export const STATUS_OPTIONS = ['Sin comenzar', 'Borrador', 'En progreso', 'Finalizado']

// ─── StatusBadge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }) {
  const { t } = useTranslation('editor')
  const map = STATUS_MAP[status] || STATUS_MAP['Sin comenzar']
  const statusKey = status.toLowerCase().replace(/ /g, '_')
  return <span className={`badge ${map.badge}`}>{t(`estado.${statusKey}`)}</span>
}

// ─── EditableTitle ────────────────────────────────────────────────────────────

export function EditableTitle({ title, onSave, className, isPlayfair, isBold }) {
  const { t } = useTranslation('editor')
  const [isEditing, setIsEditing] = useState(false)
  const [val, setVal] = useState(title)

  useEffect(() => { setVal(title) }, [title])

  const save = () => {
    setIsEditing(false)
    if (val.trim() && val !== title) onSave(val.trim())
    else setVal(title)
  }

  if (isEditing) {
    return (
      <input
        className={`edit-input ${className}`}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setIsEditing(false); setVal(title) }
        }}
        autoFocus
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', padding: '2px 4px', border: '1px solid var(--accent)',
          borderRadius: '4px', background: 'var(--bg-base)', color: 'var(--text-primary)',
          outline: 'none', fontFamily: isPlayfair ? "'Playfair Display', serif" : "'Inter', sans-serif",
          fontWeight: isBold ? 600 : 500, fontSize: 'inherit',
        }}
      />
    )
  }

  return (
    <Tooltip content={t('editable.doble_clic')}>
      <span
        className={className}
        onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
      >
        {title}
      </span>
    </Tooltip>
  )
}

// ─── SortableSceneRow ─────────────────────────────────────────────────────────

export function SortableSceneRow({ scene, chapterIndex, sceneIndex, isActive, onSelect, onDelete, onUpdate }) {
  const { t } = useTranslation('editor')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `scene-${scene.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.3 : 1,
  }

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
      <div className="scene-row__num">{chapterIndex + 1}.{sceneIndex + 1}</div>
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
          onClick={(e) => { e.stopPropagation(); onDelete(scene.id) }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── SortableChapterAccordion ─────────────────────────────────────────────────

export function SortableChapterAccordion({
  chapter, chapterIndex, actIndex, isOpen, onToggle,
  activeSceneId, onSelectScene, onAddScene, onDeleteScene,
  onDeleteChapter, onUpdateChapter, onUpdateScene,
}) {
  const { t } = useTranslation('editor')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `ch-${chapter.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.4 : 1,
  }

  const isChapterCompleted = chapter.scenes?.length > 0 && chapter.scenes.every(s => s.status === 'Finalizado')
  const chapterWords = chapter.scenes?.reduce((acc, s) => acc + (s.wordCount || 0), 0) || 0
  const completedScenes = chapter.scenes?.filter(s => s.status === 'Finalizado').length || 0
  const chapterProgress = chapter.scenes?.length > 0 ? (completedScenes / chapter.scenes.length) * 100 : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chapter-accordion ${isOpen ? 'chapter-accordion--open' : ''} ${isChapterCompleted ? 'chapter-accordion--completed' : ''}`}
      data-id={`ch-${chapter.id}`}
      data-expandable="true"
    >
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
                {isChapterCompleted && <CheckCircle2 size={12} className="chapter-accordion__status-icon" />}
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

// ─── SortableActSection ───────────────────────────────────────────────────────

export function SortableActSection({
  act, actIndex, chapterOffset, isOpen, onToggle, activeSceneId, onSelectScene,
  onAddChapter, onAddScene, onDeleteScene, onDeleteChapter,
  onDeleteAct, onUpdateAct, onUpdateChapter, onUpdateScene, expandedIds, onSubToggle,
}) {
  const { t } = useTranslation('editor')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `act-${act.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 25 : 1,
  }

  const completedChapters = act.chapters?.filter(c =>
    c.scenes?.length > 0 && c.scenes.every(s => s.status === 'Finalizado')
  ).length || 0

  const actWords = act.chapters?.reduce((acc, ch) =>
    acc + (ch.scenes?.reduce((sAcc, s) => sAcc + (s.wordCount || 0), 0) || 0), 0
  ) || 0

  const actProgress = act.chapters?.length > 0 ? (completedChapters / act.chapters.length) * 100 : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`act-section ${isOpen ? 'act-section--open' : ''}`}
      data-id={`act-${act.id}`}
      data-expandable="true"
    >
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
              isPlayfair={true}
              isBold={true}
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
              const globalChapterIndex = chapterOffset + chIdx
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
              )
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
