import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Cloud, RefreshCw, LogIn, LogOut,
  Sparkles, Shield, Info, AlertTriangle, Key, ExternalLink,
  Heart, Languages, History, RotateCw, Palette, Zap
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { useAI, DEFAULT_MODELS } from '../context/AIContext';
import { useNovel } from '../context/NovelContext';
import { GoogleDriveService } from '../services/googleDriveService';
import LanguageSelector from './LanguageSelector';
import './SettingsModal.css';

const PROVIDER_LIMITS = {
  google: { tokens: 1000000, requests: 1500 },
  openai: { tokens: 500000, requests: 1000 },
  anthropic: { tokens: 500000, requests: 1000 },
  openrouter: { tokens: 500000, requests: 1200 },
  local: { tokens: Infinity, requests: Infinity }
};

const UsageMeter = ({ label, value, max, unit }) => {
  if (max === Infinity) return null;
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="usage-meter">
      <div className="usage-meter__labels">
        <span className="usage-meter__label">{label}</span>
        <span className="usage-meter__value">{value.toLocaleString()} / {max.toLocaleString()} {unit}</span>
      </div>
      <div className="usage-meter__bar">
        <div className="usage-meter__fill" style={{ width: `${pct}%`, backgroundColor: pct > 90 ? '#e07070' : '#6b9fd4' }} />
      </div>
    </div>
  );
};

const SettingsModal = ({ isOpen, onClose, initialTab = 'cloud', theme, setTheme, openModal }) => {
  const { t, i18n } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update activeTab when initialTab changes (e.g. when opening from different places)
  React.useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  const {
    provider, setProvider, apiKey, setApiKey,
    localBaseUrl, setLocalBaseUrl,
    allConfigs, setModelForProvider, usageStats, testConnection
  } = useAI();

  const {
    isCloudSyncEnabled, cloudSyncStatus, lastCloudSync,
    toggleCloudSync, performCloudSync
  } = useNovel();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudLinked, setIsCloudLinked] = useState(GoogleDriveService.isAuthenticated());
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [testConnStatus, setTestConnStatus] = useState(null);
  const [testConnResult, setTestConnResult] = useState(null);

  const updateTestConnection = (status, result = null) => {
    setTestConnStatus(status);
    setTestConnResult(result);
    if (status === 'success') {
      setTimeout(() => {
        setTestConnStatus(null);
        setTestConnResult(null);
      }, 3000);
    }
  };

  const handleClearCache = async () => {
    const confirmMessage = tc('settings.general.clear_cache_confirm');
    if (!window.confirm(confirmMessage)) return;

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }
      localStorage.clear();
      window.location.reload();
    } catch (err) {
      console.error('Error clearing cache:', err);
      alert(tc('settings.general.clear_cache_error'));
    }
  };

  if (!isOpen) return null;

  const handleCloudLink = async () => {
    setIsSyncing(true);
    try {
      await GoogleDriveService.authenticate();
      setIsCloudLinked(true);
      toggleCloudSync(true);

      const cloudFile = await GoogleDriveService.findBackupFile();
      if (cloudFile && cloudFile.modifiedTime) {
        const cloudDate = new Date(cloudFile.modifiedTime).getTime();
        window.dispatchEvent(new CustomEvent('cloud-version-available', {
          detail: { date: cloudDate }
        }));
      }
    } catch (error) {
      console.error('Error linking Google Drive:', error);
      const msg = !import.meta.env.VITE_GOOGLE_CLIENT_ID
        ? t('errores.client_id_no_configurado')
        : t('errores.error_conexion_google');
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

  const handleShowRevisions = async () => {
    setIsSyncing(true);
    try {
      const revs = await GoogleDriveService.getRevisions();
      setRevisions(revs || []);
      setShowRevisions(true);
    } catch (error) {
      console.error('Error loading revisions:', error);
      alert('Error al cargar el historial de versiones');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreRevision = async (revisionId, revisionDate) => {
    if (!confirm(`¿Restaurar copia del ${new Date(revisionDate).toLocaleString()}? Esto sobrescribirá todos los datos actuales.`)) return;

    setIsSyncing(true);
    try {
      const cloudData = await GoogleDriveService.downloadRevision(revisionId);
      if (cloudData) {
        window.dispatchEvent(new CustomEvent('restore-from-revision', {
          detail: { data: cloudData, date: revisionDate }
        }));
        setShowRevisions(false);
      }
    } catch (error) {
      console.error('Error restoring revision:', error);
      alert('Error al restaurar la versión');
    } finally {
      setIsSyncing(false);
    }
  };

  const AI_PROVIDER_LINKS = {
    google: {
      apiKeyUrl: 'https://aistudio.google.com/apikey',
      modelsUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini',
      apiKeyLabel: t('ia.links.google_api_key'),
      modelsLabel: t('ia.links.google_modelos'),
    },
    openai: {
      apiKeyUrl: 'https://platform.openai.com/api-keys',
      modelsUrl: 'https://platform.openai.com/docs/models',
      apiKeyLabel: t('ia.links.openai_api_key'),
      modelsLabel: t('ia.links.openai_modelos'),
    },
    anthropic: {
      apiKeyUrl: 'https://console.anthropic.com/settings/keys',
      modelsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models/all-models',
      apiKeyLabel: t('ia.links.anthropic_api_key'),
      modelsLabel: t('ia.links.anthropic_modelos'),
    },
    openrouter: {
      apiKeyUrl: 'https://openrouter.ai/keys',
      modelsUrl: 'https://openrouter.ai/models',
      apiKeyLabel: t('ia.links.openrouter_api_key'),
      modelsLabel: t('ia.links.openrouter_modelos'),
    },
    local: {
      modelsUrl: 'https://ollama.com/library',
      modelsLabel: t('ia.links.ollama_modelos'),
      modelsUrlAlt: 'https://lmstudio.ai/models',
      modelsLabelAlt: t('ia.links.lmstudio_modelos'),
    },
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cloud':
        return (
          <div className="settings-tab">
            <div className="settings-section">
              <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cloud size={14} />
                {t('nube.seccion_titulo')}
              </span>
              <p className="settings-section__hint" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                {t('nube.seccion_hint')}
              </p>

              <div className="cloud-sync-card">
                <div className="cloud-sync-card__header">
                  <div className="cloud-sync-card__icon">
                    <Cloud size={20} />
                  </div>
                  <div className="cloud-sync-card__info">
                    <span className="cloud-sync-card__title">
                      {isCloudLinked ? t('nube.cuenta_vinculada') : t('nube.no_vinculado')}
                    </span>
                    <span className={`cloud-sync-card__status ${isCloudLinked ? 'cloud-sync-card__status--online' : ''}`}>
                      {isCloudLinked ? t('nube.google_drive_activo') : t('nube.conectar_hint')}
                    </span>
                  </div>
                  {!isCloudLinked ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={handleCloudLink} disabled={isSyncing}>
                        {isSyncing ? <RefreshCw size={12} className="spinner" /> : <LogIn size={12} />}
                        {t('nube.vincular_cuenta')}
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{ color: 'var(--red)' }}>
                      <LogOut size={12} />
                      {t('nube.desconectar')}
                    </button>
                  )}
                </div>

                {isCloudLinked && (
                  <div className="cloud-sync-card__footer">
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: 'auto' }}>
                      {cloudSyncStatus === 'syncing' ? t('nube.sincronizando') :
                        cloudSyncStatus === 'error' ? t('nube.error_guardar') :
                          `${t('nube.ultima_copia', { date: lastCloudSync ? new Date(lastCloudSync).toLocaleString() : t('nube.nunca') })}`}
                    </span>
                    <Tooltip content={t('nube.ver_historial')}>
                      <button className="btn btn-ghost btn-sm" onClick={handleShowRevisions} disabled={isSyncing}>
                        <History size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip content={t('nube.sincronizar_ahora')}>
                      <button className="btn btn-ghost btn-sm" onClick={handleManualSync} disabled={isSyncing || cloudSyncStatus === 'syncing'}>
                        <RefreshCw size={12} className={isSyncing || cloudSyncStatus === 'syncing' ? 'spinner' : ''} />
                        {t('nube.sincronizar_ahora')}
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>

              {showRevisions && (
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('nube.historial_titulo')}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowRevisions(false)}>
                      <X size={14} />
                    </button>
                  </div>
                  {revisions.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('nube.sin_revisiones')}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {revisions.slice().reverse().map((rev) => (
                        <div key={rev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '12px' }}>{new Date(rev.modifiedTime).toLocaleString()}</span>
                          <button className="btn btn-primary btn-sm" onClick={() => handleRestoreRevision(rev.id, rev.modifiedTime)} disabled={isSyncing}>
                            {t('nube.restaurar')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isCloudLinked && (
                <>
                  <div style={{ padding: '12px', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '13px' }}>{t('nube.sincronizacion_automatica')}</label>
                        <span style={{ fontSize: '11px', color: 'var(--accent-light)' }}>{t('nube.proteccion_cache')}</span>
                      </div>
                      <input
                        type="checkbox"
                        className="form-toggle"
                        checked={isCloudSyncEnabled}
                        onChange={(e) => toggleCloudSync(e.target.checked)}
                        style={{ height: '20px', width: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-accent)' }}>
                      <Shield size={16} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                      <p style={{ fontSize: '11px', color: 'var(--accent-light)', margin: 0 }} dangerouslySetInnerHTML={{ __html: t('nube.seguridad_hint', { interpolation: { escapeValue: false } }) }}>
                      </p>
                    </div>
                  </div>

                  <div className="settings-section" style={{ marginTop: '16px' }}>
                    <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ExternalLink size={14} />
                      {t('general.enlaces_titulo')}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      <a
                        href="https://github.com/sergio-snchez/LoneWriter"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px' }}
                      >
                        <ExternalLink size={14} />
                        {t('general.github_link')}
                      </a>
                      <a
                        href="https://buymeacoffee.com/sergio.snchez"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px' }}
                      >
                        <Heart size={14} />
                        {t('general.buymeacoffee_link')}
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      case 'ia':
        return (
          <div className="settings-tab">
            <div className="settings-section">
              <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} />
                {t('ia.seccion_titulo')}
              </span>

              <div className="ai-settings-group">
                <label>{t('ia.proveedor_label')}</label>
                <select className="ai-settings-select" value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="google">{t('ia.proveedores.google')}</option>
                  <option value="openai">{t('ia.proveedores.openai')}</option>
                  <option value="anthropic">{t('ia.proveedores.anthropic')}</option>
                  <option value="openrouter">{t('ia.proveedores.openrouter')}</option>
                  <option value="local">{t('ia.proveedores.local')}</option>
                </select>
              </div>

              <div className="ai-settings-group">
                <label>{t('ia.modelo_label')}</label>
                <input
                  type="text"
                  className="ai-settings-input"
                  value={allConfigs[provider]?.model ?? ''}
                  onChange={(e) => setModelForProvider(provider, e.target.value)}
                  placeholder={provider === 'local' ? t('ia.modelo_placeholder_local') : t('ia.modelo_placeholder_remoto')}
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
                  <label>{t('ia.servidor_url_label')}</label>
                  <input
                    type="text"
                    className="ai-settings-input"
                    value={allConfigs[provider]?.localBaseUrl ?? ''}
                    onChange={(e) => setLocalBaseUrl(e.target.value)}
                    placeholder={t('ia.servidor_url_placeholder')}
                  />
                </div>
              ) : (
                <div className="ai-settings-group">
                  <label>{t('ia.api_key_label')}</label>
                  <input
                    type="password"
                    className="ai-settings-input"
                    value={allConfigs[provider]?.apiKey ?? ''}
                    onChange={(e) => setApiKey(e.target.value, provider)}
                    placeholder={t('ia.api_key_placeholder')}
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

              {/* Usage Monitor */}
              <div className="settings-section settings-section--usage" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={14} />
                    {t('ia.consumo_titulo')}
                  </span>
                  <Tooltip content={t('ia.test_conexion') || 'Probar conexión'}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        const config = { provider, apiKey: apiKey || allConfigs[provider]?.apiKey, model: allConfigs[provider]?.model || DEFAULT_MODELS[provider], localBaseUrl: allConfigs[provider]?.localBaseUrl };
                        setTestConnStatus('testing');
                        const result = await testConnection(config);
                        updateTestConnection(result.success ? 'success' : 'error', result.error);
                      }}
                      disabled={testConnStatus === 'testing'}
                      style={{ 
                        color: testConnStatus === 'success' ? 'var(--green)' : testConnStatus === 'error' ? 'var(--red)' : 'var(--text-muted)',
                        padding: '4px 8px',
                        minWidth: 'auto'
                      }}
                    >
                      {testConnStatus === 'testing' ? (
                        <RefreshCw size={14} className="spinner" />
                      ) : (
                        <Zap size={14} />
                      )}
                    </button>
                  </Tooltip>
                </div>

                {testConnStatus && testConnStatus !== 'testing' && (
                  <p style={{ 
                    fontSize: '11px', 
                    color: testConnStatus === 'success' ? 'var(--green)' : 'var(--red)', 
                    marginBottom: '8px',
                    background: testConnStatus === 'success' ? 'rgba(92, 185, 138, 0.1)' : 'rgba(224, 112, 112, 0.1)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    {testConnStatus === 'success' ? t('ia.test_conexion_ok') : `${t('ia.test_conexion_error')}: ${testConnResult || 'Error'}`}
                  </p>
                )}

                {provider === 'local' ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ✨ {t('ia.consumo_ilimitado')}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <UsageMeter
                      label={t('ia.consumo_tokens')}
                      value={usageStats?.tokens || 0}
                      max={PROVIDER_LIMITS[provider]?.tokens || 500000}
                      unit="tokens"
                    />
                    <UsageMeter
                      label={t('ia.consumo_peticiones')}
                      value={usageStats?.requests || 0}
                      max={PROVIDER_LIMITS[provider]?.requests || 1000}
                      unit="reqs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'ui':
        return (
          <div className="settings-tab">
            <div className="settings-section">
              <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Languages size={14} />
                {t('general.idioma')}
              </span>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {t('general.idioma_hint')}
              </p>
              <LanguageSelector />
            </div>
            <div className="settings-section">
              <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={14} />
                {t('general.tema')}
              </span>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                {t('general.tema_hint')}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setTheme('dark')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: theme === 'dark' ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: theme === 'dark' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all var(--trans-fast)'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, #2B2E3A 50%, #23252E 50%)`,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('general.tema_oscuro')}</span>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: theme === 'light' ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: theme === 'light' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all var(--trans-fast)'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, #F5F0E6 50%, #FCF8F2 50%)`,
                    border: '1px solid rgba(60,54,51,0.2)'
                  }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('general.tema_claro')}</span>
                </button>
              </div>
            </div>
          </div>
        );
      case 'general':
        return (
          <div className="settings-tab">
            <div className="settings-section">
              <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={14} />
                {t('general.seccion_titulo')}
              </span>
              <div className="settings-info-grid">
                <span className="settings-info-label">{t('general.version')}</span>
                <span className="settings-info-value">{t('general.version_valor')}</span>
                <span className="settings-info-label">{t('general.base_datos')}</span>
                <span className="settings-info-value">{t('general.base_datos_valor')}</span>
                <span className="settings-info-label">{t('general.plataforma')}</span>
                <span className="settings-info-value">{t('general.plataforma_valor')}</span>
                <span className="settings-info-label">{t('general.tecnologia_rag')}</span>
                <span className="settings-info-value">{t('general.tecnologia_rag_valor')}</span>
              </div>
            </div>
            <div className="settings-section">
              <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCw size={14} />
                {t('general.recargar_app')}
              </span>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                {t('general.recargar_app_hint')}
              </p>
              <button
                className="btn btn-primary"
                onClick={handleClearCache}
                style={{ maxWidth: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <AlertTriangle size={16} />
                <span>{t('general.recargar_app_boton')}</span>
                <AlertTriangle size={16} />
              </button>
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
            <span className="settings-modal__sidebar-title">{t('sidebar.titulo')}</span>
          </div>
          <nav className="settings-modal__nav">
            <button
              className={`settings-modal__nav-item ${activeTab === 'cloud' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => setActiveTab('cloud')}
            >
              <Cloud size={16} />
              <span className="settings-modal__nav-label">{t('sidebar.navegacion.nube')}</span>
            </button>
            <button
              className={`settings-modal__nav-item ${activeTab === 'ia' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => setActiveTab('ia')}
            >
              <Sparkles size={16} />
              <span className="settings-modal__nav-label">{t('sidebar.navegacion.ia')}</span>
            </button>
            <button
              className={`settings-modal__nav-item ${activeTab === 'ui' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => setActiveTab('ui')}
            >
              <Palette size={16} />
              <span className="settings-modal__nav-label">{t('sidebar.navegacion.interfaz')}</span>
            </button>
            <button
              className={`settings-modal__nav-item ${activeTab === 'general' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Info size={16} />
              <span className="settings-modal__nav-label">{t('sidebar.navegacion.general')}</span>
            </button>
          </nav>
        </div>

        <div className="settings-modal__content">
          <div className="settings-modal__header">
            <span className="settings-modal__title">
              {activeTab === 'cloud' && t('encabezados.nube')}
              {activeTab === 'ia' && t('encabezados.ia')}
              {activeTab === 'ui' && t('encabezados.interfaz')}
              {activeTab === 'general' && t('encabezados.general')}
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
