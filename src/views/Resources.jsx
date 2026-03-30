import { useState, useRef } from 'react'
import {
  FileText, Image, BookOpen, Music, Video, Map, Link as LinkIcon,
  Upload, Search, FolderOpen, Tag, Calendar, HardDrive,
  ExternalLink, Trash2, Eye, MoreHorizontal, Plus, Zap, AlertCircle, X
} from 'lucide-react'
import { useNovel } from '../context/NovelContext'
import './Resources.css'

const ICON_MAP = {
  'file-text': FileText,
  'image':     Image,
  'book-open': BookOpen,
  'music':     Music,
  'video':     Video,
  'map':       Map,
}

const TYPE_COLORS = {
  'PDF':            { bg: '#e0707022', color: '#e07070', badge: 'badge-red'   },
  'ZIP (imágenes)': { bg: '#6b9fd422', color: '#6b9fd4', badge: 'badge-blue'  },
  'eBook':          { bg: '#d4a85322', color: '#d4a853', badge: 'badge-gold'  },
  'Documento Word': { bg: '#6b9fd422', color: '#6b9fd4', badge: 'badge-blue'  },
  'Imagen':         { bg: '#5cb98a22', color: '#5cb98a', badge: 'badge-green' },
  'Enlace':         { bg: '#9b72cf22', color: '#9b72cf', badge: 'badge-muted' },
  'Video':          { bg: '#e0707022', color: '#e07070', badge: 'badge-red'   },
  'Markdown':       { bg: '#d4a85322', color: '#d4a853', badge: 'badge-gold'  },
  'Otro':           { bg: '#ffffff11', color: '#9e9bab', badge: 'badge-muted' },
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function ResourceRow({ res, onDelete, onToggleAI, onView }) {
  const IconComp = ICON_MAP[res.icon] || FileText
  const typeStyle = TYPE_COLORS[res.type] || { bg: '#ffffff11', color: '#9e9bab', badge: 'badge-muted' }
  const dateStr = res.dateAdded ? new Date(res.dateAdded).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'

  return (
    <div className="res-row" id={`resource-${res.id}`}>
      <div className="res-row__icon-wrap" style={{ background: typeStyle.bg }}>
        <IconComp size={18} style={{ color: typeStyle.color }} />
      </div>

      <div className="res-row__info">
        <div className="res-row__title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="res-row__name" style={{ flexShrink: 1 }}>{res.name}</span>
          {res.activeForAI && (
            <span style={{ color: 'var(--accent)', fontSize: '10px', fontWeight: 600, background: 'var(--accent-dim)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <Zap size={10} style={{ fill: 'currentColor' }} /> Contexto IA
            </span>
          )}
        </div>
        <span className="res-row__desc">{res.description}</span>
        <div className="res-row__tags">
          {res.tags?.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>

      <div className="res-row__meta">
        <span className={`badge ${typeStyle.badge}`}>{res.type}</span>
        <div className="res-row__detail">
          <HardDrive size={11} />
          {res.size}
        </div>
        {res.pages && (
          <div className="res-row__detail">
            <FileText size={11} />
            {res.pages} págs.
          </div>
        )}
        <div className="res-row__detail">
          <Calendar size={11} />
          {dateStr}
        </div>
      </div>

      <div className="res-row__actions">
        {res.content && (
          <button 
            className="res-action-btn"
            style={res.activeForAI ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : {}}
            aria-label="Usar como contexto para IA" 
            title={res.activeForAI ? "Desactivar contexto IA" : "Activar contexto IA"}
            onClick={() => onToggleAI(res)}
          >
            <Zap size={14} style={{ fill: res.activeForAI ? 'currentColor' : 'none' }} />
          </button>
        )}
        <button className="res-action-btn" aria-label="Ver archivo" title="Ver" onClick={() => onView(res)}>
          <Eye size={14} />
        </button>
        <button className="res-action-btn res-action-btn--danger" aria-label="Eliminar" title="Eliminar" onClick={() => onDelete(res.id)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ResourcesView() {
  const { resources, addCompendiumEntry, deleteCompendiumEntry, updateCompendiumEntry } = useNovel()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  
  const [viewingRes, setViewingRes] = useState(null)
  const fileInputRef = useRef(null)

  const ALL_TAGS = [...new Set(resources.flatMap(r => r.tags || []))]

  const filtered = resources.filter(r => {
    const matchQ = !query || r.name.toLowerCase().includes(query.toLowerCase()) || r.description?.toLowerCase().includes(query.toLowerCase())
    const matchT = !activeTag || r.tags?.includes(activeTag)
    return matchQ && matchT
  })

  const totalBytes = resources.reduce((acc, r) => acc + (r.sizeRaw || 0), 0)
  const totalSize = formatBytes(totalBytes)

  const statGroups = [
    { label: 'PDFs y eBooks', types: ['PDF','eBook'], color: 'var(--red)' },
    { label: 'Imágenes y Zips', types: ['ZIP (imágenes)','Imagen'], color: 'var(--green)' },
    { label: 'Documentos text', types: ['Documento Word','Markdown', 'TXT', 'JSON', 'CSV'], color: 'var(--accent)' },
    { label: 'Otros', types: ['Video','Música','Enlace', 'Otro'], color: 'var(--blue)' },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const isTextFormat = ['txt', 'md', 'json', 'csv'].includes(ext);
    
    let type = 'Otro';
    let icon = 'file-text';
    if (['pdf'].includes(ext)) { type = 'PDF'; icon = 'book-open'; }
    else if (['jpg','jpeg','png','gif','webp'].includes(ext)) { type = 'Imagen'; icon = 'image'; }
    else if (['doc','docx'].includes(ext)) { type = 'Documento Word'; icon = 'file-text'; }
    else if (['epub','mobi'].includes(ext)) { type = 'eBook'; icon = 'book-open'; }
    else if (['mp4','mov','avi'].includes(ext)) { type = 'Video'; icon = 'video'; }
    else if (['mp3','wav'].includes(ext)) { type = 'Música'; icon = 'music'; }
    else if (['zip','rar','7z'].includes(ext)) { type = 'ZIP (imágenes)'; icon = 'folder-open'; }
    else if (ext === 'md') { type = 'Markdown'; icon = 'file-text'; }
    else if (['txt', 'csv', 'json'].includes(ext)) { type = ext.toUpperCase(); icon = 'file-text'; }

    const newRes = {
      name: file.name,
      description: 'Archivo importado',
      type,
      icon,
      size: formatBytes(file.size),
      sizeRaw: file.size,
      dateAdded: new Date().toISOString(),
      tags: [],
      activeForAI: isTextFormat, // Por defecto se activa si es texto procesable
      content: null
    };

    if (isTextFormat) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        newRes.content = event.target.result;
        await addCompendiumEntry('resources', newRes);
      };
      reader.readAsText(file);
    } else {
      addCompendiumEntry('resources', newRes);
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="resources-view">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />

      {/* Header */}
      <div className="resources-view__header">
        <div>
          <h1 className="section-title">Archivos de referencia</h1>
          <p className="section-subtitle">{resources.length} archivos · {totalSize} total</p>
        </div>
        <div className="resources-view__header-actions">
          <button className="btn btn-primary" id="resources-upload-btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} />
            Cargar archivo
          </button>
        </div>
      </div>

      <div className="resources-alerts" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 26px 4px' }}>
        <div style={{ padding: '12px 16px', background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ lineHeight: '1.5' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Formatos integrados con la IA</strong> 
            Solo los archivos de texto (<code>.txt</code>, <code>.md</code>, <code>.csv</code>, <code>.json</code>) podrán usarse como Base de Conocimiento para la IA en esta versión. Activa el icono del Rayo en cada archivo para incluirlo. Otros formatos solo quedarán guardados aquí como referencia para ti.
          </div>
        </div>
        
        <div style={{ padding: '12px 16px', background: 'rgba(224,112,112,0.1)', border: '1px solid rgba(224,112,112,0.25)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Zap size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ lineHeight: '1.5' }}>
            <strong style={{ color: 'var(--red)', display: 'block', marginBottom: '4px' }}>Impacto en Tokens de IA</strong> 
            Si subes y activas archivos de texto muy largos (ej: un documento de 10.000 palabras de lore), todo ese contenido se enviará en <strong>cada</strong> petición a la IA, consumiendo bastantes tokens. Úsalo con moderación.
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="resources-toolbar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 380 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            placeholder="Buscar archivos..."
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
            Todos
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

      {/* Stats bar */}
      <div className="resources-stats">
        {statGroups.map(({ label, types, color }) => (
          <div key={label} className="resources-stat">
            <span className="resources-stat__dot" style={{ background: color }} />
            <span className="resources-stat__count">{resources.filter(r => types.includes(r.type)).length}</span>
            <span className="resources-stat__label">{label}</span>
          </div>
        ))}
      </div>

      {/* File list */}
      {filtered.length === 0 ? (
        <div className="resources-empty">
          <FolderOpen size={40} />
          <p>No se encontraron archivos</p>
          <span>Prueba con otros términos de búsqueda</span>
        </div>
      ) : (
        <div className="resources-list">
          {filtered.map(res => (
            <ResourceRow 
              key={res.id} 
              res={res} 
              onDelete={(id) => deleteCompendiumEntry('resources', id)}
              onToggleAI={(r) => updateCompendiumEntry('resources', r.id, { activeForAI: !r.activeForAI })}
              onView={setViewingRes}
            />
          ))}
        </div>
      )}

      {/* Drop zone hint */}
      <div 
        className="resources-dropzone" 
        id="resources-dropzone"
        onClick={() => fileInputRef.current?.click()}
        style={{ cursor: 'pointer' }}
      >
        <Upload size={20} />
        <span>Arrastra archivos o haz clic aquí para cargarlos como referencia</span>
        <button className="btn btn-ghost">
          <Plus size={13} />
          Seleccionar archivos
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
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
                  {viewingRes.content}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <Eye size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <p style={{ margin: 0 }}>Vista previa no disponible para este tipo de archivo.</p>
                  <p style={{ fontSize: 13, marginTop: 8 }}>Formato: {viewingRes.type}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
