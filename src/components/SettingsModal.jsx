import React, { useState } from 'react';
import { 
  X, Cloud, RefreshCw, LogIn, LogOut, 
  Sparkles, Shield, Info, AlertTriangle, Key, ExternalLink 
} from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useNovel } from '../context/NovelContext';
import { GoogleDriveService } from '../services/googleDriveService';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, initialTab = 'cloud' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Update activeTab when initialTab changes (e.g. when opening from different places)
  React.useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  const { 
    provider, setProvider, apiKey, setApiKey, 
    localBaseUrl, setLocalBaseUrl, selectedModels, 
    setModelForProvider
  } = useAI();

  const { 
    isCloudSyncEnabled, cloudSyncStatus, lastCloudSync, 
    toggleCloudSync, performCloudSync 
  } = useNovel();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudLinked, setIsCloudLinked] = useState(GoogleDriveService.isAuthenticated());

  if (!isOpen) return null;

  const handleCloudLink = async () => {
    setIsSyncing(true);
    try {
      await GoogleDriveService.authenticate();
      setIsCloudLinked(true);
      toggleCloudSync(true);
    } catch (error) {
      console.error('Error linking Google Drive:', error);
      const msg = !import.meta.env.VITE_GOOGLE_CLIENT_ID 
        ? 'No se ha configurado el Client ID de Google. Crea un archivo .env o variable de entorno.'
        : 'Error al conectar con Google. Verifica que la URL actual (Vercel) esté autorizada en la consola de Google Cloud.';
      alert(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = () => {
    GoogleDriveService.signOut();
    setIsCloudLinked(false);
    toggleCloudSync(false);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await performCloudSync();
    setIsSyncing(false);
  };

  const AI_PROVIDER_LINKS = {
    google: {
      apiKeyUrl: 'https://aistudio.google.com/apikey',
      modelsUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini',
      apiKeyLabel: 'Obtener API Key en Google AI Studio',
      modelsLabel: 'Ver modelos Gemini disponibles',
    },
    openai: {
      apiKeyUrl: 'https://platform.openai.com/api-keys',
      modelsUrl: 'https://platform.openai.com/docs/models',
      apiKeyLabel: 'Obtener API Key en OpenAI',
      modelsLabel: 'Ver modelos OpenAI disponibles',
    },
    anthropic: {
      apiKeyUrl: 'https://console.anthropic.com/settings/keys',
      modelsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models/all-models',
      apiKeyLabel: 'Obtener API Key en Anthropic',
      modelsLabel: 'Ver modelos Claude disponibles',
    },
    openrouter: {
      apiKeyUrl: 'https://openrouter.ai/keys',
      modelsUrl: 'https://openrouter.ai/models',
      apiKeyLabel: 'Obtener API Key en OpenRouter',
      modelsLabel: 'Ver todos los modelos en OpenRouter',
    },
    local: {
      modelsUrl: 'https://ollama.com/library',
      modelsLabel: 'Explorar modelos en Ollama',
      modelsUrlAlt: 'https://lmstudio.ai/models',
      modelsLabelAlt: 'Modelos para LM Studio',
    },
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cloud':
        return (
          <div className="settings-tab">
            <div className="settings-section">
              <span className="settings-section__title">Google Drive Sync</span>
              <p className="settings-section__hint" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Protege tus proyectos sincronizándolos automáticamente con tu propia cuenta de Google Drive.
              </p>
              
              <div className="cloud-sync-card">
                <div className="cloud-sync-card__header">
                  <div className="cloud-sync-card__icon">
                    <Cloud size={20} />
                  </div>
                  <div className="cloud-sync-card__info">
                    <span className="cloud-sync-card__title">
                      {isCloudLinked ? 'Cuenta vinculada' : 'No vinculado'}
                    </span>
                    <span className={`cloud-sync-card__status ${isCloudLinked ? 'cloud-sync-card__status--online' : ''}`}>
                      {isCloudLinked ? 'Google Drive Activo' : 'Conecta con Google Drive para empezar'}
                    </span>
                  </div>
                  {!isCloudLinked ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={handleCloudLink} disabled={isSyncing}>
                        {isSyncing ? <RefreshCw size={12} className="spinner" /> : <LogIn size={12} />}
                        Vincular Cuenta
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{ color: 'var(--red)' }}>
                      <LogOut size={12} />
                      Desconectar
                    </button>
                  )}
                </div>

                {isCloudLinked && (
                  <div className="cloud-sync-card__footer">
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: 'auto' }}>
                      {cloudSyncStatus === 'syncing' ? 'Sincronizando...' : 
                       cloudSyncStatus === 'error' ? 'Error al guardar' :
                       `Última copia: ${lastCloudSync ? new Date(lastCloudSync).toLocaleString() : 'Nunca'}`}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={handleManualSync} disabled={isSyncing || cloudSyncStatus === 'syncing'}>
                      <RefreshCw size={12} className={isSyncing || cloudSyncStatus === 'syncing' ? 'spinner' : ''} />
                      Sincronizar ahora
                    </button>
                  </div>
                )}
              </div>

              {isCloudLinked && (
                <div className="settings-section" style={{ marginTop: '10px' }}>
                  <div className="sync-toggle-group">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label>Sincronización automática (v1.3)</label>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Protección activa en tiempo real contra limpieza de caché</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="form-toggle" 
                      checked={isCloudSyncEnabled} 
                      onChange={(e) => toggleCloudSync(e.target.checked)}
                      style={{ height: '20px', width: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                  </div>
                  
                  <div className="settings-info-box" style={{ padding: '12px', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)', display: 'flex', gap: '10px' }}>
                     <Shield size={16} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                     <p style={{ fontSize: '11px', color: 'var(--accent-light)', margin: 0 }}>
                        <strong>Seguridad:</strong> LoneWriter solo tiene acceso a sus propios archivos de backup. Tus documentos privados no son visibles para la aplicación.
                     </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'ia':
        return (
          <div className="settings-tab">
            <div className="settings-section">
              <span className="settings-section__title">Configuración de Inteligencia Artificial</span>
              
              <div className="ai-settings-group">
                <label>Proveedor de IA</label>
                <select className="ai-settings-select" value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="google">Google Gemini</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openrouter">OpenRouter (Múltiples)</option>
                  <option value="local">Servidor Local (Ollama/LM Studio)</option>
                </select>
              </div>

              <div className="ai-settings-group">
                <label>Modelo deseado</label>
                <input
                  type="text"
                  className="ai-settings-input"
                  value={selectedModels[provider] || ''}
                  onChange={(e) => setModelForProvider(provider, e.target.value)}
                  placeholder={provider === 'local' ? 'ej: llama3.2' : 'ej: gpt-4o, gemini-1.5-pro...'}
                />
                <div className="ai-settings-links">
                  {AI_PROVIDER_LINKS[provider]?.modelsUrl && (
                    <a href={AI_PROVIDER_LINKS[provider].modelsUrl} target="_blank" rel="noopener noreferrer" className="ai-settings-link">
                      <ExternalLink size={11} />
                      {AI_PROVIDER_LINKS[provider].modelsLabel}
                    </a>
                  )}
                  {AI_PROVIDER_LINKS[provider]?.modelsUrlAlt && (
                    <>
                      <span className="ai-settings-link-sep">·</span>
                      <a href={AI_PROVIDER_LINKS[provider].modelsUrlAlt} target="_blank" rel="noopener noreferrer" className="ai-settings-link">
                        <ExternalLink size={11} />
                        {AI_PROVIDER_LINKS[provider].modelsLabelAlt}
                      </a>
                    </>
                  )}
                </div>
              </div>

              {provider === 'local' ? (
                <div className="ai-settings-group">
                  <label>URL Base del Servidor</label>
                  <input
                    type="text"
                    className="ai-settings-input"
                    value={localBaseUrl}
                    onChange={(e) => setLocalBaseUrl(e.target.value)}
                    placeholder="http://localhost:1234/v1"
                  />
                </div>
              ) : (
                <div className="ai-settings-group">
                  <label>Clave API (API Key)</label>
                  <input
                    type="password"
                    className="ai-settings-input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Pega aquí tu clave secreta..."
                  />
                  <div className="ai-settings-links">
                    {AI_PROVIDER_LINKS[provider]?.apiKeyUrl && (
                      <a href={AI_PROVIDER_LINKS[provider].apiKeyUrl} target="_blank" rel="noopener noreferrer" className="ai-settings-link">
                        <ExternalLink size={11} />
                        {AI_PROVIDER_LINKS[provider].apiKeyLabel}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'general':
        return (
          <div className="settings-tab">
            <div className="settings-section">
              <span className="settings-section__title">Información de la Aplicación</span>
              <div className="settings-info-grid">
                <span className="settings-info-label">Versión</span>
                <span className="settings-info-value">1.3-oraculo</span>
                <span className="settings-info-label">Base de Datos</span>
                <span className="settings-info-value">IndexedDB (Dexie.js)</span>
                <span className="settings-info-label">Plataforma</span>
                <span className="settings-info-value">Vite + Electron</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__sidebar">
          <div className="settings-modal__sidebar-header">
            <span className="settings-modal__sidebar-title">Configuración</span>
          </div>
          <nav className="settings-modal__nav">
            <button 
              className={`settings-modal__nav-item ${activeTab === 'cloud' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => setActiveTab('cloud')}
            >
              <Cloud size={16} />
              Nube y Backup
            </button>
            <button 
              className={`settings-modal__nav-item ${activeTab === 'ia' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => setActiveTab('ia')}
            >
              <Sparkles size={16} />
              Inteligencia Artificial
            </button>
            <button 
              className={`settings-modal__nav-item ${activeTab === 'general' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Info size={16} />
              General
            </button>
          </nav>
        </div>
        
        <div className="settings-modal__content">
          <div className="settings-modal__header">
            <span className="settings-modal__title">
              {activeTab === 'cloud' && 'Sincronización en la Nube'}
              {activeTab === 'ia' && 'Parámetros de IA'}
              {activeTab === 'general' && 'Información'}
            </span>
            <button className="settings-modal__close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="settings-modal__body">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
