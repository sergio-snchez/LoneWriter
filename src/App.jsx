import { useState, useRef, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import {
  Sparkles, Loader2, Download, Upload, FileDown,
  ChevronDown, BookOpen, CheckCircle2, Plus, Trash2, PenLine,
  Settings, Heart, Menu, X, RotateCcw
} from 'lucide-react'
import './i18n/i18n'
import Sidebar from './components/Sidebar'
import AIPanel from './components/AIPanel'
import SettingsModal from './components/SettingsModal'
import { Tooltip } from './components/Tooltip'
import LanguageSelector from './components/LanguageSelector'
import TypingEffect from './components/TypingEffect'
import './components/TypingEffect.css'
import EditorView from './views/Editor'
import CompendiumView from './views/Compendium'
import ResourcesView from './views/Resources'
import { useNovel } from './context/NovelContext'
import { useAI } from './context/AIContext'
import { useModal } from './context/ModalContext'
import { ExportService } from './services/exportService'
import { GoogleDriveService } from './services/googleDriveService'
import { db } from './db/database'
import './App.css'
import RagToast from './components/RagToast'
import MeshBackground from './components/MeshBackground'

export default function App() {
  const { t, i18n } = useTranslation('app')
  const { t: tc } = useTranslation('common')
  const [activeView, setActiveView] = useState('editor')
  const [pendingMpcProposal, setPendingMpcProposal] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiPanelTab, setAiPanelTab] = useState('rewrite')
  const [theme, setTheme] = useState(() => localStorage.getItem('lw_theme') || 'dark')
  const [meshEnabled, setMeshEnabled] = useState(() => {
    const saved = localStorage.getItem('lw_mesh_enabled');
    return saved === null ? true : saved === 'true';
  })

  // Apply theme to document and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lw_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-mesh', meshEnabled ? 'on' : 'off');
    localStorage.setItem('lw_mesh_enabled', meshEnabled);
  }, [meshEnabled]);

  useEffect(() => {
    const handleOpenOracle = () => {
      setAiPanelTab('oracle');
      setAiPanelOpen(true);
    };
    window.addEventListener('open-oracle-panel', handleOpenOracle);
    return () => window.removeEventListener('open-oracle-panel', handleOpenOracle);
  }, []);
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('cloud')
  const [menuOpen, setMenuOpen] = useState(false)
  const [typingComplete, setTypingComplete] = useState(false)

  // Reset typing when language changes
  useEffect(() => {
    setTypingComplete(false)
  }, [i18n?.language])

  const { openModal } = useModal();

  const {
    activeNovel, activeScene, allNovels, loading, acts,
    switchNovel, createNovel, deleteNovel, updateNovelTarget, refreshAfterRestore
  } = useNovel();

  const fileInputRef = useRef(null);
  const projectMenuRef = useRef(null);

  // Cloud Restore Listener
  useEffect(() => {
    let isRestoring = false;

    const handleCloudVersion = (e) => {
      const { date } = e.detail;
      openModal('confirm', {
        title: t('restaurar_nube.titulo'),
        message: t('restaurar_nube.mensaje', { date: new Date(date).toLocaleString() }),
        confirmLabel: t('restaurar_nube.boton'),
        onConfirm: async () => {
          if (isRestoring) return;
          isRestoring = true;

          try {
            const cloudData = await GoogleDriveService.downloadBackup();
            if (cloudData) {
              await db.transaction('rw', db.tables, async () => {
                for (const table of db.tables) {
                  await table.clear();
                  if (cloudData.tables[table.name]) {
                    await table.bulkAdd(cloudData.tables[table.name]);
                  }
                }
              });
              localStorage.setItem('lw_last_cloud_sync', date);
              await refreshAfterRestore();
            }
          } catch (err) {
            alert(t('error_restaurar') + err.message);
          } finally {
            isRestoring = false;
          }
        }
      });
    };

    const handleRestoreFromRevision = async (e) => {
      const { data: cloudData, date } = e.detail;
      if (isRestoring) return;
      isRestoring = true;

      try {
        await db.transaction('rw', db.tables, async () => {
          for (const table of db.tables) {
            await table.clear();
            if (cloudData.tables[table.name]) {
              await table.bulkAdd(cloudData.tables[table.name]);
            }
          }
        });
        localStorage.setItem('lw_last_cloud_sync', date);
        await refreshAfterRestore();
      } catch (err) {
        alert(t('error_restaurar') + err.message);
      } finally {
        isRestoring = false;
      }
    };

    window.addEventListener('cloud-version-available', handleCloudVersion);
    window.addEventListener('restore-from-revision', handleRestoreFromRevision);
    return () => {
      window.removeEventListener('cloud-version-available', handleCloudVersion);
      window.removeEventListener('restore-from-revision', handleRestoreFromRevision);
    };
  }, [openModal, refreshAfterRestore]);

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
      title: t('eliminar_proyecto.titulo'),
      message: t('eliminar_proyecto.mensaje', { title: project?.title }),
      isDanger: true,
      confirmLabel: t('eliminar_proyecto.boton'),
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
              <h1 className="welcome-screen__title">{t('bienvenida.titulo')}</h1>
              <p className="welcome-screen__subtitle">
                <TypingEffect
                  key={`welcome-typing-${i18n?.language || 'es'}`}
                  text={'   ' + t('bienvenida.subtitulo')}
                  speed={40}
                  delay={800}
                  onComplete={() => setTypingComplete(true)}
                />
              </p>
              <button
                className="btn btn-primary welcome-screen__btn"
                onClick={handleCreateProject}
              >
                <Plus size={16} />
                {t('bienvenida.boton_nueva')}
              </button>
            </header>

            {allNovels.length > 0 && (
              <section className="welcome-screen__recent">
                <div className="recent-header">
                  <h2 className="recent-title">{t('bienvenida.continuar')}</h2>
                  <span className="recent-count">{t('bienvenida.proyectos_total', { count: allNovels.length })}</span>
                </div>
                <div className="recent-grid">
                  {recentNovels.map(n => {
                    const pct = Math.round(((n.wordCount || 0) / (n.targetWords || 100000)) * 100);
                    const lastDate = new Date(n.lastEdited || 0).toLocaleDateString(undefined, {
                      day: 'numeric', month: 'short', year: 'numeric'
                    });

                    return (
                      <div key={n.id} className="project-card" onClick={() => switchNovel(n.id)}>
                        <div className="project-card__header">
                          <BookOpen size={20} className="project-card__icon" />
                          <div className="project-card__meta">
                            <h3 className="project-card__title">{n.title}</h3>
                            <span className="project-card__date">{t('bienvenida.editado_el', { date: lastDate })}</span>
                          </div>
                        </div>
                        <div className="project-card__stats">
                          <div className="project-card__stat">
                            <span className="stat-value">{n.wordCount?.toLocaleString() || 0}</span>
                            <span className="stat-label">{t('bienvenida.palabras')}</span>
                          </div>
                          <div className="project-card__stat">
                            <span className="stat-value">{pct}%</span>
                            <span className="stat-label">{t('bienvenida.completado')}</span>
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
                        <span>{t('bienvenida.ver_todos')}</span>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {allNovels.length === 0 && (
              <section className="welcome-screen__setup">
                <div className="setup-header">
                  <h2 className="setup-title">{t('bienvenida.configurar_titulo')}</h2>
                  <p className="setup-subtitle">{t('bienvenida.configurar_subtitulo_line1')}</p>
                  <p className="setup-subtitle-italic">{t('bienvenida.configurar_subtitulo_line2')}</p>
                </div>
                <div className="setup-options">
                  <div className="setup-option">
                    <span className="setup-option__label">{t('general.idioma')}</span>
                    <div style={{ opacity: typingComplete ? 1 : 0.3, pointerEvents: typingComplete ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                      <LanguageSelector />
                    </div>
                  </div>
                  <div className="setup-divider" />
                  <div className="setup-option">
                    <div className="theme-toggle-modern" style={{ opacity: typingComplete ? 1 : 0.3, pointerEvents: typingComplete ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                      <button
                        className={`theme-btn-modern ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => typingComplete && setTheme('light')}
                      >
                        <div className="theme-preview theme-preview--light" />
                        <span>{t('general.tema_claro')}</span>
                      </button>
                      <button
                        className={`theme-btn-modern ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => typingComplete && setTheme('dark')}
                      >
                        <div className="theme-preview theme-preview--dark" />
                        <span>{t('general.tema_oscuro')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <footer style={{ marginTop: 'auto', paddingTop: '60px', paddingBottom: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: '13px' }}>
                {t('bienvenida.version')}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                <Trans i18nKey="bienvenida.creditos" ns="app" components={[<strong />]} />
              </p>
              <div style={{ marginTop: '20px' }}>
                <a
                  href="https://buymeacoffee.com/sergio.snchez"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', gap: '8px', opacity: 0.8 }}
                >
                  <Heart size={14} />
                  {t('bienvenida.apoyar')}
                </a>
              </div>
            </footer>
          </div>
        </div>
      );
    }
    switch (activeView) {
      case 'editor': return <EditorView menuOpen={menuOpen} onNavigate={setActiveView} />
      case 'compendium': return <CompendiumView />
      case 'resources': return <ResourcesView />
      default: return <EditorView />
    }
  }

  const handleExportProject = async () => {
    try {
      await ExportService.exportProject();
    } catch (error) {
      console.error('Error exporting project:', error);
      alert(t('error_exportar') + error.message);
    }
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
        <span>{t('cargando')}</span>
      </div>
    );
  }

  const wordPct = activeNovel ? Math.round((activeNovel.wordCount / (activeNovel.targetWords || 100000)) * 100) : 0;

  return (
    <div className="app-shell">
      <MeshBackground animate={meshEnabled} />
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".lwrt"
        onChange={handleFileChange}
      />

      {/* Landscape warning overlay */}
      <div className="landscape-warning">
        <RotateCcw size={48} />
        <p>{t('landscape.mensaje') || 'Por favor, rota tu dispositivo a vertical'}</p>
      </div>

      {/* Top bar */}
      <header className="app-topbar">
        <div className="app-topbar__left">
          <div className="app-topbar__project-menu" ref={projectMenuRef}>
            <button
              className={`btn btn-ghost project-menu-btn ${menuOpen ? 'active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {t('menu.proyecto')}
              <ChevronDown size={14} />
            </button>

            {menuOpen && (
              <div className="project-dropdown">
                <div className="dropdown-label">{t('menu.mis_proyectos')}</div>
                {allNovels.map(n => (
                  <div key={n.id} className="project-item-row">
                    <button
                      className={`project-select-btn ${activeNovel?.id === n.id ? 'active' : ''}`}
                      onClick={() => { switchNovel(n.id); setMenuOpen(false); }}
                    >
                      <BookOpen size={14} />
                      <span style={{ flex: 1 }}>{n.title}</span>
                      {activeNovel?.id === n.id && <CheckCircle2 size={12} className="text-success" />}
                    </button>
                    <Tooltip content={t('menu.eliminar_tooltip')}>
                      <button
                        className="project-delete-btn"
                        onClick={(e) => handleDeleteProject(e, n.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </Tooltip>
                  </div>
                ))}

                <div className="dropdown-divider" />
                <button onClick={() => { handleCreateProject(); setMenuOpen(false); }}>
                  <Plus size={14} />
                  {t('menu.nueva_novela')}
                </button>
                <button onClick={() => { handleImportClick(); setMenuOpen(false); }}>
                  <Upload size={14} />
                  {t('menu.importar')}
                </button>
                <button onClick={() => { handleExportProject(); setMenuOpen(false); }}>
                  <Download size={14} />
                  {t('menu.exportar_lwrt')}
                </button>
                <div className="dropdown-divider" />
                <button onClick={() => { handleExportFullWord(); setMenuOpen(false); }}>
                  <FileDown size={14} />
                  {t('menu.exportar_docx')}
                </button>
              </div>
            )}
          </div>
          <span className="app-topbar__divider">|</span>
          <span className="app-topbar__novel">{activeNovel?.title || t('menu.sin_titulo')}</span>
        </div>
        <Tooltip content={t('topbar.estadisticas_tooltip')}>
          <div
            className="app-topbar__center"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-stats'))}
            style={{ cursor: 'pointer' }}
          >
            <div className="app-topbar__word-count">
              <span className="app-topbar__word-num">{activeNovel?.wordCount?.toLocaleString() || 0}</span>
              <span className="app-topbar__word-label">{t('topbar.palabras_escritas')}</span>
            </div>
            <div className="app-topbar__divider-v" />
            <div className="app-topbar__word-count">
              <span className="app-topbar__word-num">{wordPct}%</span>
              <span className="app-topbar__word-label">{t('topbar.del_objetivo')}</span>
            </div>
          </div>
        </Tooltip>
        <div className="app-topbar__right">
          <Tooltip content={t('topbar.ia')}>
            <button
              className={`btn app-topbar__ai-btn ${aiPanelOpen ? 'app-topbar__ai-btn--active' : ''}`}
              id="topbar-ai-btn"
              onClick={() => setAiPanelOpen(o => !o)}
            >
              <Sparkles size={14} />
              {t('topbar.ia')}
            </button>
          </Tooltip>
          <Tooltip content={t('topbar.configuracion')}>
            <button
              className="btn btn-ghost btn-icon topbar-settings-btn"
              onClick={() => {
                setSettingsTab('general');
                setSettingsOpen(true);
              }}
            >
              <Settings size={16} />
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
        theme={theme}
        setTheme={setTheme}
        meshEnabled={meshEnabled}
        setMeshEnabled={setMeshEnabled}
        openModal={openModal}
      />

      {/* Main layout */}
      <div className="app-body">
        {/* Desktop sidebar */}
        <div className="app-body__sidebar-desktop">
          <Sidebar
            active={activeView}
            onNavigate={(view) => { setActiveView(view); setMobileDrawerOpen(false); }}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(c => !c)}
          />
        </div>

        {/* Mobile hamburger button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label={t('menu.abrir_navegacion')}
        >
          <Menu size={22} />
        </button>

        {/* Mobile drawer overlay */}
        {mobileDrawerOpen && (
          <div className="mobile-drawer-overlay" onClick={() => setMobileDrawerOpen(false)}>
            <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-drawer__header">
                <span className="mobile-drawer__title">LoneWriter</span>
                <button className="mobile-drawer__close" onClick={() => setMobileDrawerOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <Sidebar
                active={activeView}
                onNavigate={(view) => { setActiveView(view); setMobileDrawerOpen(false); }}
                collapsed={false}
                onToggle={() => setMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="app-main">
          {renderView()}
        </main>

        <AIPanel
          open={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          activeScene={activeScene}
          defaultTab={aiPanelTab}
          onOpenSettings={(tab) => {
            setSettingsTab(tab || 'ia');
            setSettingsOpen(true);
          }}
        />
      </div>

      {/* RAG model download toast — appears once on first use */}
      <RagToast />
    </div>
  )
}
