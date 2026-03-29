import { useState, useRef, useEffect } from 'react'
import { 
  Sparkles, Loader2, Download, Upload, FileDown, 
  ChevronDown, BookOpen, CheckCircle2, Plus, Trash2, PenLine,
  Settings
} from 'lucide-react'
import Sidebar from './components/Sidebar'
import AIPanel from './components/AIPanel'
import EditorView from './views/Editor'
import CompendiumView from './views/Compendium'
import ResourcesView from './views/Resources'
import { useNovel } from './context/NovelContext'
import { useAI } from './context/AIContext'
import { useModal } from './context/ModalContext'
import { ExportService } from './services/exportService'
import './App.css'

export default function App() {
  const [activeView, setActiveView] = useState('editor')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  
  const { openModal } = useModal();
  
  const { 
    activeNovel, activeScene, allNovels, loading, acts,
    switchNovel, createNovel, deleteNovel 
  } = useNovel();
  
  const fileInputRef = useRef(null);
  const projectMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleDeleteProject = (e, id) => {
    e.stopPropagation();
    const project = allNovels.find(n => n.id === id);
    openModal('confirm', {
      title: 'Borrar proyecto',
      message: `¿Seguro que quieres borrar "${project?.title}" permanentemente?`,
      isDanger: true,
      confirmLabel: 'Eliminar Proyecto',
      onConfirm: () => deleteNovel(id)
    });
    setMenuOpen(false);
  }

  const renderView = () => {
    if (!activeNovel) {
      const recentNovels = allNovels.slice(0, 5);
      
      return (
        <div className="welcome-screen">
          <div className="welcome-screen__container">
            <header className="welcome-screen__hero">
              <div className="welcome-screen__icon">
                <PenLine size={48} />
              </div>
              <h1 className="welcome-screen__title">Bienvenido a LoneWriter</h1>
              <p className="welcome-screen__subtitle">
                Tu espacio personal para dar vida a grandes historias.
              </p>
              <button
                className="btn btn-primary welcome-screen__btn"
                onClick={handleCreateProject}
              >
                <Plus size={16} />
                Nueva Novela
              </button>
            </header>

            {allNovels.length > 0 && (
              <section className="welcome-screen__recent">
                <div className="recent-header">
                  <h2 className="recent-title">Continuar escribiendo</h2>
                  <span className="recent-count">{allNovels.length} proyectos totales</span>
                </div>
                <div className="recent-grid">
                  {recentNovels.map(n => {
                    const pct = Math.round(((n.wordCount || 0) / (n.targetWords || 100000)) * 100);
                    const lastDate = new Date(n.lastEdited || 0).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    });
                    
                    return (
                      <div key={n.id} className="project-card" onClick={() => switchNovel(n.id)}>
                        <div className="project-card__header">
                          <BookOpen size={20} className="project-card__icon" />
                          <div className="project-card__meta">
                            <h3 className="project-card__title">{n.title}</h3>
                            <span className="project-card__date">Editado el {lastDate}</span>
                          </div>
                        </div>
                        <div className="project-card__stats">
                          <div className="project-card__stat">
                            <span className="stat-value">{n.wordCount?.toLocaleString('es-ES') || 0}</span>
                            <span className="stat-label">palabras</span>
                          </div>
                          <div className="project-card__stat">
                            <span className="stat-value">{pct}%</span>
                            <span className="stat-label">completado</span>
                          </div>
                        </div>
                        <div className="project-card__progress">
                          <div className="progress-bg">
                            <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {allNovels.length > 5 && (
                    <div className="project-card project-card--more" onClick={() => setMenuOpen(true)}>
                      <div className="more-content">
                        <span>Ver todos los proyectos</span>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <footer style={{ marginTop: 'auto', paddingTop: '60px', paddingBottom: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: '13px' }}>
                LoneWriter v1.0
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                Diseñado y desarrollado con ♥ por <strong>Sergio Sánchez</strong> con Antigravity.
              </p>
            </footer>
          </div>
        </div>
      );
    }
    switch (activeView) {
      case 'editor':     return <EditorView />
      case 'compendium': return <CompendiumView />
      case 'resources':  return <ResourcesView />
      default:           return <EditorView />
    }
  }

  const handleExportProject = () => {
    ExportService.exportProject();
    setMenuOpen(false);
  }

  const handleExportFullWord = () => {
    if (activeNovel && acts) {
      ExportService.exportFullNovel(activeNovel, acts);
    }
    setMenuOpen(false);
  }

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setMenuOpen(false);
  }

  const handleCreateProject = () => {
    openModal('project', {
      onConfirm: (title) => createNovel(title)
    });
    setMenuOpen(false);
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      ExportService.importProject(file);
    }
  }

  if (loading) {
    return (
      <div className="app-loading">
        <Loader2 className="spinner" />
        <span>Cargando LoneWriter...</span>
      </div>
    );
  }

  const wordPct = activeNovel ? Math.round((activeNovel.wordCount / (activeNovel.targetWords || 100000)) * 100) : 0;

  return (
    <div className="app-shell">
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".lwrt" 
        onChange={handleFileChange} 
      />

      {/* Top bar */}
      <header className="app-topbar">
        <div className="app-topbar__left">
          <div className="app-topbar__project-menu" ref={projectMenuRef}>
            <button 
              className={`btn btn-ghost project-menu-btn ${menuOpen ? 'active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              Proyecto
              <ChevronDown size={14} />
            </button>
            
            {menuOpen && (
              <div className="project-dropdown">
                <div className="dropdown-label">Mis Proyectos</div>
                {allNovels.map(n => (
                  <div key={n.id} className="project-item-row">
                    <button 
                      className={`project-select-btn ${activeNovel?.id === n.id ? 'active' : ''}`}
                      onClick={() => { switchNovel(n.id); setMenuOpen(false); }}
                    >
                      <BookOpen size={14} />
                      <span style={{flex: 1}}>{n.title}</span>
                      {activeNovel?.id === n.id && <CheckCircle2 size={12} className="text-success" />}
                    </button>
                    <button 
                      className="project-delete-btn" 
                      onClick={(e) => handleDeleteProject(e, n.id)}
                      title="Eliminar proyecto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                
                <div className="dropdown-divider" />
                <button onClick={() => { handleCreateProject(); setMenuOpen(false); }}>
                  <Plus size={14} />
                  Nueva Novela...
                </button>
                <button onClick={() => { handleImportClick(); setMenuOpen(false); }}>
                  <Upload size={14} />
                  Importar Proyectos (.lwrt)
                </button>
                <button onClick={() => { handleExportProject(); setMenuOpen(false); }}>
                  <Download size={14} />
                  Exportar Proyectos (.lwrt)
                </button>
                <div className="dropdown-divider" />
                <button onClick={() => { handleExportFullWord(); setMenuOpen(false); }}>
                  <FileDown size={14} />
                  Exportar Manuscrito (.docx)
                </button>
              </div>
            )}
          </div>
          <span className="app-topbar__divider">|</span>
          <span className="app-topbar__novel">{activeNovel?.title || 'Sin título'}</span>
        </div>
        <div 
          className="app-topbar__center" 
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-stats'))}
          style={{ cursor: 'pointer' }}
          title="Ver estadísticas detalladas"
        >
          <div className="app-topbar__word-count">
            <span className="app-topbar__word-num">{activeNovel?.wordCount?.toLocaleString('es-ES') || 0}</span>
            <span className="app-topbar__word-label">palabras escritas</span>
          </div>
          <div className="app-topbar__divider-v" />
          <div className="app-topbar__word-count">
            <span className="app-topbar__word-num">{wordPct}%</span>
            <span className="app-topbar__word-label">del objetivo</span>
          </div>
        </div>
        <div className="app-topbar__right">
          <button
            className={`btn app-topbar__ai-btn ${aiPanelOpen ? 'app-topbar__ai-btn--active' : ''}`}
            id="topbar-ai-btn"
            onClick={() => setAiPanelOpen(o => !o)}
            title="Asistente IA"
          >
            <Sparkles size={14} />
            IA
          </button>
          <button className="btn btn-ghost btn-icon topbar-settings-btn" title="Configuración">
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="app-body">
        <Sidebar
          active={activeView}
          onNavigate={setActiveView}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
        <main className="app-main">
          {renderView()}
        </main>
        <AIPanel 
          open={aiPanelOpen} 
          onClose={() => setAiPanelOpen(false)} 
          activeScene={activeScene}
        />
      </div>
    </div>
  )
}
