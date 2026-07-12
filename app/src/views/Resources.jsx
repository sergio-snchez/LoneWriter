import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText, Upload, Search, FolderOpen, Calendar, HardDrive,
  Trash2, Eye, Filter, Plus, X, Pin, Edit, Download,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { useNovel, useAI, useModal } from '../context'
import { MarkdownRenderer, Tooltip, StopwordsModal, ImportWizard } from '../components'
import { getAllCustomStopwords } from '../i18n/stopwords'
import { loadImportedStructure } from '../services'
import './Resources.css'


function StructureTree({ acts }) {
  const { t } = useTranslation('resources')
  const [expanded, setExpanded] = useState(() => new Set(acts.map((_, i) => i)))

  const toggle = (i) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const totalChapters = acts.reduce((acc, a) => acc + (a.chapters?.length || 0), 0)
  const totalScenes = acts.reduce((acc, a) => acc + (a.chapters || []).reduce((cAcc, ch) => cAcc + (ch.scenes?.length || 0), 0), 0)
  const totalWords = acts.reduce((acc, a) => acc + (a.chapters || []).reduce((cAcc, ch) => cAcc + (ch.scenes || []).reduce((sAcc, s) => sAcc + (s.wordCount || 0), 0), 0), 0)

  return (
    <div className="structure-tree">
      <div className="structure-tree__summary">
        {acts.length} {t('structure.actos')} · {totalChapters} {t('structure.capitulos')} · {totalScenes} {t('structure.escenas')} · {totalWords.toLocaleString()} {t('structure.palabras')}
      </div>
      {acts.map((act, ai) => (
        <div key={act.id} className="structure-tree__act">
          <div className="structure-tree__row structure-tree__row--act" onClick={() => toggle(ai)}>
            {expanded.has(ai) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span className="structure-tree__label">{t('structure.acto')}</span>
            <span className="structure-tree__title">{act.title || `Acto ${ai + 1}`}</span>
            <span className="structure-tree__words">
              {(act.chapters || []).reduce((acc, ch) => acc + (ch.scenes || []).reduce((sAcc, s) => sAcc + (s.wordCount || 0), 0), 0).toLocaleString()} {t('structure.palabras')}
            </span>
          </div>
          {expanded.has(ai) && (act.chapters || []).map((ch, ci) => (
            <div key={ch.id} className="structure-tree__chapter">
              <div className="structure-tree__row structure-tree__row--chapter">
                <span className="structure-tree__label">{t('structure.capitulo')}</span>
                <span className="structure-tree__title">{ch.title || `Capítulo ${ci + 1}`}</span>
                <span className="structure-tree__words">
                  {(ch.scenes || []).reduce((acc, s) => acc + (s.wordCount || 0), 0).toLocaleString()} {t('structure.palabras')}
                </span>
              </div>
              {(ch.scenes || []).map((sc, si) => (
                <div key={sc.id} className="structure-tree__scene">
                  <div className="structure-tree__row structure-tree__row--scene">
                    <span className="structure-tree__label">{t('structure.escena')}</span>
                    <span className="structure-tree__title">{sc.title || `Escena ${si + 1}`}</span>
                    <span className="structure-tree__words">
                      {(sc.wordCount || 0).toLocaleString()} {t('structure.palabras')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}


function ViewerContent({ res, t, onClose }) {
  const [structure, setStructure] = useState(null)

  useEffect(() => {
    if (res.importedActIds?.length > 0) {
      loadImportedStructure(res.importedActIds).then(setStructure).catch(() => {})
    }
  }, [res.importedActIds])

  return (
    <div className="resource-viewer">
      <div className="modal-header resource-viewer__header">
        <h3 className="resource-viewer__title">{res.name}</h3>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="modal-body resource-viewer__body">
        {structure && structure.length > 0 ? (
          <StructureTree acts={structure} />
        ) : res.content ? (
          <MarkdownRenderer className="resource-viewer__content" content={res.content} />
        ) : (
          <div className="resource-viewer__empty">
            <Eye size={32} className="resource-viewer__empty-icon" />
            <p className="resource-viewer__empty-text">{t('vista_previa_no_disponible')}</p>
            <p className="resource-viewer__empty-sub">{t('formato', { type: res.type })}</p>
          </div>
        )}
      </div>
    </div>
  )
}


function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}


function ResourceRow({ res, onDelete, onView, onDownload }) {
  const { t } = useTranslation('resources')
  const dateStr = res.dateAdded ? new Date(res.dateAdded).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '--'

  return (
    <div className="res-row" id={`resource-${res.id}`}>
      <div className="res-row__icon-wrap res-row__icon-bg">
        <FileText size={18} className="res-row__icon-color" />
      </div>

      <div className="res-row__info">
        <div className="res-row__title-wrap">
          <span className="res-row__name res-row__name-flex">{res.name}</span>
        </div>
        <span className="res-row__desc">{res.description}</span>
        <div className="res-row__tags">
          {res.tags?.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>

      <div className="res-row__meta">
        <span className="badge badge-gold">{res.type}</span>
        <div className="res-row__detail">
          <HardDrive size={11} />
          {res.size}
        </div>
        <div className="res-row__detail">
          <Calendar size={11} />
          {dateStr}
        </div>
      </div>

      <div className="res-row__actions">
        {onDownload && (
          <Tooltip content={t('descargar')}>
            <button className="res-action-btn" aria-label={t('descargar')} onClick={() => onDownload(res)}>
              <Download size={14} />
            </button>
          </Tooltip>
        )}
        <Tooltip content={t('ver')}>
          <button className="res-action-btn" aria-label={t('ver')} onClick={() => onView(res)}>
            <Eye size={14} />
          </button>
        </Tooltip>
        <Tooltip content={t('eliminar')}>
          <button className="res-action-btn res-action-btn--danger" aria-label={t('eliminar')} onClick={() => onDelete(res.id)}>
            <Trash2 size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

export default function ResourcesView() {
  const { t } = useTranslation('resources')
  const { activeNovel, resources, addCompendiumEntry, deleteCompendiumEntry, updateCompendiumEntry } = useNovel()
  const { forceEntityRecheck } = useAI()
  const { openModal } = useModal()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    getAllCustomStopwords().then(w => setWordCount(w.length)).catch(() => {})
  }, [])

  const clearFilters = () => {
    setActiveTag(null)
    setQuery('')
  }

  const ALL_TAGS = [...new Set(resources.flatMap(r => r.tags || []))]

  const hasActiveFilters = activeTag || query

  const filtered = resources.filter(r => {
    const matchQ = !query || r.name.toLowerCase().includes(query.toLowerCase()) || r.description?.toLowerCase().includes(query.toLowerCase())
    const matchT = !activeTag || r.tags?.includes(activeTag)
    return matchQ && matchT
  })

  const totalBytes = resources.reduce((acc, r) => acc + (r.sizeRaw || 0), 0)
  const totalSize = formatBytes(totalBytes)

  const handleImportComplete = useCallback(() => {
    setImportOpen(false)
  }, [])

  const handleDownload = useCallback((res) => {
    if (!res.fileData) return
    const blob = res.fileData instanceof Blob ? res.fileData : new Blob([res.fileData], { type: res.type === 'PDF' ? 'application/pdf' : 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="resources-view">
      <div className="resources-top-glass">
        {/* Header */}
      <div className="resources-view__header">
        <div>
          <h1 className="section-title">{t('titulo')}</h1>
          <p className="section-subtitle">{t('subtitulo', { count: resources.length, size: totalSize })}</p>
        </div>
        <div className="resources-view__header-actions">
          <button
            className={`btn btn-ghost${showFilters ? ' active' : ''}${hasActiveFilters ? ' filter-btn--active' : ''}`}
            id="resources-filter-btn"
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter size={13} />
            {t('filtros')}
            {hasActiveFilters && (
              <span className="filter-btn__badge">
                {(activeTag ? 1 : 0) + (query ? 1 : 0)}
              </span>
            )}
          </button>
          <button className="btn btn-primary" id="resources-import-btn" onClick={() => setImportOpen(true)}>
            <Upload size={13} />
            {t('importar_documento')}
          </button>
        </div>
      </div>

      {/* Import info banner */}
      <div className="resource-alert resource-alert--info">
        <div className="resource-alert__content">
          <strong className="resource-alert__strong-info">{t('beta_titulo')}</strong>
          <MarkdownRenderer className="resource-alert__text" content={t('beta_texto')} />
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="resources-filter-panel">
          <span className="resources-filter-panel__label">{t('filtros_activos')}</span>
          {hasActiveFilters && (
            <button className="btn btn-ghost resources-filter-panel__clear" onClick={clearFilters}>
              <X size={11} /> {t('limpiar_filtros')}
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="resources-toolbar">
        <div className="search-bar">
          <Search size={14} color="var(--text-muted)" />
          <input
            placeholder={t('buscar')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            id="resources-search-input"
          />
        </div>

        {/* Tag filters */}
        <div className="resources-tag-filters">
          <button
            className={`tag resources-tag-filter ${!activeTag ? 'resources-tag-filter--active' : ''}`}
            onClick={() => setActiveTag(null)}
            id="resources-tag-all"
          >
            {t('todos')}
          </button>
          {ALL_TAGS.map(tag => (
            <button
              key={tag}
              className={`tag resources-tag-filter ${activeTag === tag ? 'resources-tag-filter--active' : ''}`}
              onClick={() => setActiveTag(t => t === tag ? null : tag)}
              id={`resources-tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      </div>

      {importOpen ? (
        <ImportWizard
          novelId={activeNovel?.id}
          onComplete={handleImportComplete}
          onCancel={() => setImportOpen(false)}
        />
      ) : (
        <>
        {/* File list */}
      <div className="resources-list">
        {/* Stopwords Fictional Card - Always Pinned at Top */}
        <div className="res-row res-row--pinned">
          <div className="res-row__icon-wrap res-row__icon-bg">
            <Pin size={18} className="res-row__icon-color" />
          </div>
          <div className="res-row__info">
            <div className="res-row__title-wrap">
              <span className="res-row__name res-row__name-flex">{t('stopwords_titulo')}</span>
            </div>
            <div className="res-row__badge-wrap">
              <span className="res-row__badge-light">
                <Pin size={10} className="resource-icon--active" /> {t('stopwords_pinned')}
              </span>
            </div>
            <span className="res-row__desc">{t('archivo_sistema')}</span>
          </div>
          <div className="res-row__meta">
            <span className="badge badge-gold">{wordCount} {t('stopwords_count_short')}</span>
          </div>
          <div className="res-row__actions">
            <Tooltip content={t('stopwords_editar')}>
              <button className="res-action-btn" aria-label={t('stopwords_editar')} onClick={() => openModal('custom', { render: (close) => <StopwordsModal onClose={() => { close(); getAllCustomStopwords().then(w => setWordCount(w.length)).catch(() => {}); forceEntityRecheck() }} /> })}>
                <Edit size={14} />
              </button>
            </Tooltip>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="resources-empty">
            <FolderOpen size={40} />
            <p>{t('sin_resultados')}</p>
            <span>{t('sin_resultados_sub')}</span>
          </div>
        ) : (
          filtered.map(res => (
            <ResourceRow 
              key={res.id} 
              res={res} 
              onDelete={(id) => {
                const res = filtered.find(r => r.id === id)
                openModal('confirm', {
                  title: t('eliminar_titulo'),
                  message: t('eliminar_mensaje', { name: res?.name || '' }),
                  isDanger: true,
                  confirmLabel: t('eliminar_boton'),
                  onConfirm: () => deleteCompendiumEntry('resources', id),
                })
              }}
              onView={(res) => openModal('custom', { render: (close) => <ViewerContent res={res} t={t} onClose={close} /> })}
              onDownload={res.fileData ? handleDownload : null}
            />
          ))
        )}
      </div>

      {/* Drop zone hint */}
      <div 
        className="resources-dropzone" 
        id="resources-dropzone"
        onClick={() => setImportOpen(true)}
      >
        <Upload size={20} />
        <span>{t('dropzone')}</span>
        <span className="btn btn-ghost">
          <Plus size={13} />
          {t('importar_documento')}
        </span>
      </div>
      </>
      )}

    </div>
  )
}
