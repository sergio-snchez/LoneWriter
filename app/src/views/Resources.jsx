import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText, Upload, Search, FolderOpen, Tag, Calendar, HardDrive,
  ExternalLink, Trash2, Eye, Filter, Plus, Zap, AlertCircle, X, Lock,
  Pin, Edit, ChevronDown, ChevronUp
} from 'lucide-react'
import { useNovel, useAI, useModal } from '../context'
import { MarkdownRenderer, Tooltip, StopwordsModal } from '../components'
import { getAllCustomStopwords } from '../i18n/stopwords'
import './Resources.css';

const ALLOWED_EXTENSIONS = ['txt', 'md', 'json', 'csv']


function ViewerContent({ res, t, onClose }) {
  return (
    <div className="resource-viewer">
      <div className="modal-header resource-viewer__header">
        <h3 className="resource-viewer__title">{res.name}</h3>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="modal-body resource-viewer__body">
        {res.content ? (
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


function ResourceRow({ res, onDelete, onToggleIgnore, onView }) {
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
        {res.ignoredForOracle !== 1 && (
          <div className="res-row__badge-wrap">
            <span className="res-row__badge">
              <Zap size={10} className="resource-icon--active" /> {t('contexto_ia')}
            </span>
          </div>
        )}
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
        <Tooltip content={res.ignoredForOracle === 1 ? t('excluido') : t('contexto_ia')}>
          <button 
            className={`res-action-btn ${res.ignoredForOracle !== 1 ? 'res-action-btn--ai-active' : ''}`}
            aria-label="Ignorar en coherencia del Oráculo" 
            onClick={() => onToggleIgnore(res)}
          >
            <Zap size={14} className={res.ignoredForOracle !== 1 ? 'resource-icon--active' : 'resource-icon--ignored'} />
          </button>
        </Tooltip>
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
  const { resources, addCompendiumEntry, deleteCompendiumEntry, updateCompendiumEntry } = useNovel()
  const { forceEntityRecheck } = useAI()
  const { openModal } = useModal()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [alertsExpanded, setAlertsExpanded] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const fileInputRef = useRef(null)

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      openModal('alert', { message: t('formato_no_soportado', { ext }) });
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const typeMap = { txt: 'TXT', md: 'Markdown', json: 'JSON', csv: 'CSV' }

    const newRes = {
      name: file.name,
      description: 'Archivo importado',
      type: typeMap[ext],
      icon: 'file-text',
      size: formatBytes(file.size),
      sizeRaw: file.size,
      dateAdded: new Date().toISOString(),
      tags: [],
      activeForAI: true,
      content: null
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      newRes.content = event.target.result
      await addCompendiumEntry('resources', newRes)
    }
    reader.readAsText(file)
    
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="resources-view">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="resources-hidden-input"
        onChange={handleFileChange}
        accept=".txt,.md,.json,.csv" 
      />

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
          <button className="btn btn-primary" id="resources-upload-btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} />
            {t('cargar')}
          </button>
        </div>
      </div>

      <div className={`resources-alerts ${alertsExpanded ? 'resources-alerts--expanded' : 'resources-alerts--collapsed'}`}>
        {/* Beta Warning + Formatos */}
        <div className="resource-alert resource-alert--beta">
          <span className="resource-alert__badge-wrap">
            <span className="resource-alert__badge">Beta</span>
          </span>
          <div className="resource-alert__content">
            <strong className="resource-alert__strong-red">{t('beta_titulo')}</strong>
            <MarkdownRenderer className="resource-alert__text" content={t('beta_texto')} />
          </div>
        </div>
        
        <div className="resource-alert resource-alert--warning">
          <Zap size={16} className="resource-alert__icon" />
          <div className="resource-alert__content">
            <strong className="resource-alert__strong-accent">{t('tokens_titulo')}</strong>
            <MarkdownRenderer className="resource-alert__text" content={t('tokens_texto')} />
          </div>
        </div>

        <button 
          className="resources-alerts__toggle" 
          onClick={() => setAlertsExpanded(!alertsExpanded)}
        >
          {alertsExpanded ? <><ChevronUp size={14} /> {t('ocultar_detalles')}</> : <><ChevronDown size={14} /> {t('mostrar_detalles')}</>}
        </button>
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
              onDelete={(id) => deleteCompendiumEntry('resources', id)}
              onToggleIgnore={(r) => updateCompendiumEntry('resources', r.id, { ignoredForOracle: r.ignoredForOracle ? 0 : 1 })}
              onView={(res) => openModal('custom', { render: (close) => <ViewerContent res={res} t={t} onClose={close} /> })}
            />
          ))
        )}
      </div>

      {/* Drop zone hint */}
      <div 
        className="resources-dropzone" 
        id="resources-dropzone"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={20} />
        <span>{t('dropzone')}</span>
        <button className="btn btn-ghost">
          <Plus size={13} />
          {t('seleccionar')}
        </button>
      </div>


    </div>
  )
}
