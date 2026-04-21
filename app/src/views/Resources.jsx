import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText, Upload, Search, FolderOpen, Tag, Calendar, HardDrive,
  ExternalLink, Trash2, Eye, Filter, Plus, Zap, AlertCircle, X, Lock,
  Pin, Edit, ChevronDown, ChevronUp
} from 'lucide-react'
import { useNovel } from '../context/NovelContext'
import { useAI } from '../context/AIContext'
import { Tooltip } from '../components/Tooltip';
import { renderMarkdown } from '../utils/renderMarkdown';
import { getEntityStopWords, getAllCustomStopwords, addCustomStopword, deleteCustomStopword } from '../i18n/stopwords';
import './Resources.css';

const ALLOWED_EXTENSIONS = ['txt', 'md', 'json', 'csv']


function StopwordsModal({ isOpen, onClose, customWords, onAdd, onDelete, t }) {
  const [newWord, setNewWord] = useState('')

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 12, width: '90%', maxWidth: 500, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{t('stopwords_modal_titulo')}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{t('stopwords_modal_texto')}</p>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && newWord.trim() && (onAdd(newWord), setNewWord(''))}
            placeholder={t('stopwords_add_placeholder')}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px' }}
          />
          <button onClick={() => newWord.trim() && (onAdd(newWord), setNewWord(''))} className="btn btn-primary" style={{ padding: '8px 16px' }}>
            {t('stopwords_add')}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto', padding: '10px', background: 'var(--bg-surface)', borderRadius: 6 }}>
          {customWords.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('stopwords_empty')}</span>
          ) : (
            customWords.map(w => (
              <span key={w.id} style={{ background: 'rgba(100,180,100,0.15)', color: 'var(--success)', padding: '4px 8px', borderRadius: 4, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                {w.word}
                <button onClick={() => onDelete(w.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', display: 'flex' }}>
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>
        
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
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
  const dateStr = res.dateAdded ? new Date(res.dateAdded).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'

  return (
    <div className="res-row" id={`resource-${res.id}`}>
      <div className="res-row__icon-wrap" style={{ background: 'rgba(212,168,83,0.12)' }}>
        <FileText size={18} style={{ color: 'var(--accent)' }} />
      </div>

      <div className="res-row__info">
        <div className="res-row__title-wrap">
          <span className="res-row__name" style={{ flexShrink: 1 }}>{res.name}</span>
        </div>
        {res.ignoredForOracle !== 1 && (
          <div style={{ marginTop: '4px' }}>
            <span style={{ color: '#d4a853', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={10} style={{ fill: 'currentColor' }} /> {t('contexto_ia')}
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
            <Zap size={14} style={{ fill: res.ignoredForOracle !== 1 ? 'currentColor' : 'none' }} />
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
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [alertsExpanded, setAlertsExpanded] = useState(false)
  
  const [viewingRes, setViewingRes] = useState(null)
  const [showStopwordsModal, setShowStopwordsModal] = useState(false)
  const [customWords, setCustomWords] = useState([])
  const [stopwordsLoading, setStopwordsLoading] = useState(true)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadCustomWords()
  }, [])

  const loadCustomWords = async () => {
    setStopwordsLoading(true)
    try {
      const words = await getAllCustomStopwords()
      setCustomWords(words)
    } catch (err) {
      console.error('[Stopwords] Error loading:', err)
    }
    setStopwordsLoading(false)
  }

  const handleAddStopword = async (word) => {
    const trimmed = word.trim().toLowerCase()
    if (!trimmed) return
    const result = await addCustomStopword(trimmed)
    if (result) {
      setCustomWords(prev => [...prev, result])
      setTimeout(() => forceEntityRecheck(), 100)
    }
  }

  const handleDeleteStopword = async (id) => {
    await deleteCustomStopword(id)
    setCustomWords(prev => prev.filter(w => w.id !== id))
    setTimeout(() => forceEntityRecheck(), 100)
  }

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
      alert(t('formato_no_soportado', { ext }))
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
        style={{ display: 'none' }} 
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
            className={`btn btn-ghost ${showFilters ? 'active' : ''}`}
            id="resources-filter-btn"
            onClick={() => setShowFilters(v => !v)}
            style={hasActiveFilters ? { borderColor: 'var(--accent)', color: 'var(--accent-light)' } : {}}
          >
            <Filter size={13} />
            {t('filtros')}
            {hasActiveFilters && (
              <span style={{ background: 'var(--accent)', color: '#1a1710', borderRadius: '99px', fontSize: '10px', fontWeight: 700, padding: '0 5px', lineHeight: '16px' }}>
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
            <strong style={{ color: 'var(--red)', display: 'block', marginBottom: '4px' }}>{t('beta_titulo')}</strong>
            <span className="resource-alert__text" dangerouslySetInnerHTML={{ __html: t('beta_texto') }}></span>
          </div>
        </div>
        
        <div className="resource-alert resource-alert--warning">
          <Zap size={16} className="resource-alert__icon" />
          <div className="resource-alert__content">
            <strong style={{ color: 'var(--accent-light)', display: 'block', marginBottom: '4px' }}>{t('tokens_titulo')}</strong>
            <span className="resource-alert__text" dangerouslySetInnerHTML={{ __html: t('tokens_texto') }}></span>
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
        <div style={{ margin: '0 26px 16px', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('filtros_activos')}</span>
          {hasActiveFilters && (
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 8px', height: 'auto' }} onClick={clearFilters}>
              <X size={11} /> {t('limpiar_filtros')}
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="resources-toolbar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 380 }}>
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
        <div className="res-row" style={{ border: '2px solid var(--accent)' }}>
          <div className="res-row__icon-wrap" style={{ background: 'rgba(212,168,83,0.12)' }}>
            <Pin size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="res-row__info">
            <div className="res-row__title-wrap">
              <span className="res-row__name" style={{ flexShrink: 1 }}>{t('stopwords_titulo')}</span>
            </div>
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: 'var(--accent-light)', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Pin size={10} style={{ fill: 'currentColor' }} /> {t('stopwords_pinned')}
              </span>
            </div>
            <span className="res-row__desc">{t('archivo_sistema')}</span>
          </div>
          <div className="res-row__meta">
            <span className="badge badge-gold">{customWords.length} {t('stopwords_count_short')}</span>
          </div>
          <div className="res-row__actions">
            <Tooltip content={t('stopwords_editar')}>
              <button className="res-action-btn" aria-label={t('stopwords_editar')} onClick={() => setShowStopwordsModal(true)}>
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
              onView={setViewingRes}
            />
          ))
        )}
      </div>

      {/* Drop zone hint */}
      <div 
        className="resources-dropzone" 
        id="resources-dropzone"
        onClick={() => fileInputRef.current?.click()}
        style={{ cursor: 'pointer' }}
      >
        <Upload size={20} />
        <span>{t('dropzone')}</span>
        <button className="btn btn-ghost">
          <Plus size={13} />
          {t('seleccionar')}
        </button>
      </div>

      {/* Viewer Modal */}
      {viewingRes && (
        <div className="modal-overlay" onClick={() => setViewingRes(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 12, width: '90%', maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{viewingRes.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewingRes(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {viewingRes.content ? (
                <div className="resource-viewer__content" dangerouslySetInnerHTML={{ __html: renderMarkdown(viewingRes.content) }}></div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <Eye size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <p style={{ margin: 0 }}>{t('vista_previa_no_disponible')}</p>
                  <p style={{ fontSize: 13, marginTop: 8 }}>{t('formato', { type: viewingRes.type })}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stopwords Modal */}
      <StopwordsModal 
        isOpen={showStopwordsModal}
        onClose={() => setShowStopwordsModal(false)}
        customWords={customWords}
        onAdd={handleAddStopword}
        onDelete={handleDeleteStopword}
        t={t}
      />
    </div>
  )
}
