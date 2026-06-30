import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles, Loader2, Download, Upload, FileDown,
  ChevronDown, BookOpen, CheckCircle2, Plus, Trash2, PenLine,
  Settings, Menu, X, RotateCcw
} from 'lucide-react'
import './i18n/i18n'
import {
  ErrorBoundary, Sidebar, AIPanel, MergeOverlay, SettingsModal,
  Tooltip, RagToast, MeshBackground, PwaUpdateModal, WelcomeScreen
} from './components'
import { EditorView, CompendiumView, ResourcesView, NexusView } from './views'
import { useNovel, useModal, ThemeProvider } from './context'
import { useAppNavigation, useAppUI, useCloudRestore, useProjectIO } from './hooks'
import { registerPWA, triggerUpdate } from './pwa'
import './components/TypingEffect.css'
import './App.css'

export default function App() {
  const { t, i18n } = useTranslation('app')

  const { activeView, viewKey, sidebarCollapsed, setSidebarCollapsed,
          mobileDrawerOpen, setMobileDrawerOpen, handleViewChange } = useAppNavigation()

  const {
    aiPanelOpen, setAiPanelOpen, aiPanelTab, setAiPanelTab,
    settingsOpen, setSettingsOpen, settingsTab, setSettingsTab,
    menuOpen, setMenuOpen,
    typingComplete, setTypingComplete,
    pwaUpdateOpen, setPwaUpdateOpen,
    isEditingNovelTitle, setIsEditingNovelTitle,
    editedNovelTitle, setEditedNovelTitle,
    projectMenuRef,
  } = useAppUI()

  const fileInputRef = useRef(null)

  const { openModal } = useModal()

  const {
    activeNovel, activeScene, allNovels, loading, acts,
    switchNovel, createNovel, deleteNovel, updateNovelTarget, updateNovel, refreshAfterRestore
  } = useNovel()

  useCloudRestore({ openModal, refreshAfterRestore })

  const {
    handleExportProject,
    handleExportFullWord,
    handleImportClick,
    handleFileChange,
    handleCreateProject,
  } = useProjectIO({ openModal, activeNovel, acts, createNovel, fileInputRef })

  // App title
  useEffect(() => { document.title = t('app_title') }, [t, i18n.language])

  // PWA update listener
  useEffect(() => { registerPWA(() => setPwaUpdateOpen(true)) }, [])

  // Reset typing on language change
  useEffect(() => { setTypingComplete(false) }, [i18n?.language])

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
      return (
        <WelcomeScreen
          allNovels={allNovels}
          switchNovel={switchNovel}
          onCreateProject={handleCreateProject}
          onShowAllProjects={() => setMenuOpen(true)}
          typingComplete={typingComplete}
          setTypingComplete={setTypingComplete}
        />
      )
    }
    switch (activeView) {
      case 'editor': return <ErrorBoundary name="editor"><EditorView menuOpen={menuOpen} onNavigate={handleViewChange} /></ErrorBoundary>
      case 'compendium': return <ErrorBoundary name="compendio"><CompendiumView /></ErrorBoundary>
      case 'resources': return <ErrorBoundary name="recursos"><ResourcesView /></ErrorBoundary>
      case 'nexus': return <ErrorBoundary name="nexus"><NexusView onNavigate={handleViewChange} /></ErrorBoundary>
      default: return <ErrorBoundary name="editor"><EditorView /></ErrorBoundary>
    }
  }

  const handleNovelRename = async () => {
    if (!activeNovel) return;
    const newTitle = editedNovelTitle.trim();
    if (newTitle && newTitle !== activeNovel.title) {
      await updateNovel(activeNovel.id, { title: newTitle });
    }
    setIsEditingNovelTitle(false);
  };

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
    <ThemeProvider>
    <div className="app-shell">
      <MeshBackground />
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
          {isEditingNovelTitle ? (
            <input
              className="app-topbar__novel-input"
              autoFocus
              value={editedNovelTitle}
              onChange={(e) => setEditedNovelTitle(e.target.value)}
              onBlur={handleNovelRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNovelRename();
                if (e.key === 'Escape') setIsEditingNovelTitle(false);
              }}
            />
          ) : (
            <Tooltip content={t('topbar.doble_clic_renombrar') || 'Doble clic para renombrar'}>
              <span 
                className="app-topbar__novel" 
                onDoubleClick={() => {
                  setEditedNovelTitle(activeNovel?.title || '');
                  setIsEditingNovelTitle(true);
                }}
              >
                {activeNovel?.title || t('menu.sin_titulo')}
              </span>
            </Tooltip>
          )}
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
              disabled={!activeNovel}
            >
              <Settings size={16} />
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Modals */}
      <ErrorBoundary name="configuración">
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
        openModal={openModal}
      />

      <PwaUpdateModal
        isOpen={pwaUpdateOpen}
        onUpdate={triggerUpdate}
      />

      <MergeOverlay />
      </ErrorBoundary>

      {/* Main layout */}
      <div className="app-body">
        {/* Desktop sidebar */}
        <div className="app-body__sidebar-desktop">
          <Sidebar
            active={activeView}
            onNavigate={(view) => { handleViewChange(view); setMobileDrawerOpen(false); }}
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
                onNavigate={(view) => { handleViewChange(view); setMobileDrawerOpen(false); }}
                collapsed={false}
                onToggle={() => setMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        <main className={`app-main ${activeView !== 'welcome' ? 'view-enter' : ''}`} key={viewKey}>
          {renderView()}
        </main>

        <ErrorBoundary name="panel IA">
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
        </ErrorBoundary>
      </div>

      {/* RAG model download toast — appears once on first use */}
      <RagToast />
    </div>
    </ThemeProvider>
  )
}
