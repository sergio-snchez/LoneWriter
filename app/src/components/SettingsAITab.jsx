import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Sparkles, RefreshCw, ExternalLink, Zap } from 'lucide-react'
import { Tooltip } from './'
import { useAI } from '../context'

const PROVIDER_LIMITS = {
  google: { tokens: 1000000, requests: 1500 },
  openai: { tokens: 500000, requests: 1000 },
  anthropic: { tokens: 500000, requests: 1000 },
  openrouter: { tokens: 500000, requests: 1200 },
  local: { tokens: Infinity, requests: Infinity }
}

function UsageMeter({ label, value, max, unit }) {
  if (max === Infinity) return null
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="usage-meter">
      <div className="usage-meter__labels">
        <span className="usage-meter__label">{label}</span>
        <span className="usage-meter__value">{value.toLocaleString()} / {max.toLocaleString()} {unit}</span>
      </div>
      <div className="usage-meter__bar">
        <div className={`usage-meter__fill ${pct > 90 ? 'usage-meter__fill--high' : 'usage-meter__fill--normal'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const AI_PROVIDER_LINKS = (t) => ({
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
})

export function SettingsAITab({ testConnStatus, testConnResult, onTestConnection }) {
  SettingsAITab.propTypes = {
    testConnStatus: PropTypes.string,
    testConnResult: PropTypes.string,
    onTestConnection: PropTypes.func.isRequired,
  };

  const { t } = useTranslation('settings')
  const {
    provider, setProvider, apiKey, setApiKey,
    localBaseUrl, setLocalBaseUrl,
    allConfigs, setModelForProvider, usageStats
  } = useAI()

  const links = AI_PROVIDER_LINKS(t)

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <span className="settings-section__title settings-section__title-row">
          <Sparkles size={14} />{t('ia.seccion_titulo')}
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
          <input type="text" className="ai-settings-input" value={allConfigs[provider]?.model ?? ''} onChange={(e) => setModelForProvider(provider, e.target.value)} placeholder={provider === 'local' ? t('ia.modelo_placeholder_local') : t('ia.modelo_placeholder_remoto')} />
          <div className="ai-settings-links">
            {links[provider]?.modelsUrl && (
              <a href={links[provider].modelsUrl} target="_blank" rel="noopener noreferrer" className="ai-settings-link">
                <ExternalLink size={11} />{links[provider].modelsLabel}
              </a>
            )}
            {links[provider]?.modelsUrlAlt && (
              <>
                <span className="ai-settings-link-sep">·</span>
                <a href={links[provider].modelsUrlAlt} target="_blank" rel="noopener noreferrer" className="ai-settings-link">
                  <ExternalLink size={11} />{links[provider].modelsLabelAlt}
                </a>
              </>
            )}
          </div>
        </div>

        {provider === 'local' ? (
          <div className="ai-settings-group">
            <label>{t('ia.servidor_url_label')}</label>
            <input type="text" className="ai-settings-input" value={allConfigs[provider]?.localBaseUrl ?? ''} onChange={(e) => setLocalBaseUrl(e.target.value)} placeholder={t('ia.servidor_url_placeholder')} />
          </div>
        ) : (
          <div className="ai-settings-group">
            <label>{t('ia.api_key_label')}</label>
            <input type="password" className="ai-settings-input" value={allConfigs[provider]?.apiKey ?? ''} onChange={(e) => setApiKey(e.target.value, provider)} placeholder={t('ia.api_key_placeholder')} />
            <div className="ai-settings-links">
              {links[provider]?.apiKeyUrl && (
                <a href={links[provider].apiKeyUrl} target="_blank" rel="noopener noreferrer" className="ai-settings-link">
                  <ExternalLink size={11} />{links[provider].apiKeyLabel}
                </a>
              )}
            </div>
          </div>
        )}

        <div className="settings-section settings-section--usage">
          <div className="usage-header">
            <span className="settings-section__title settings-section__title-row">
              <RefreshCw size={14} />{t('ia.consumo_titulo')}
            </span>
            <Tooltip content={t('ia.test_conexion') || 'Probar conexión'}>
              <button className={`btn btn-ghost btn-sm conn-test-btn ${testConnStatus === 'success' ? 'conn-status--success' : testConnStatus === 'error' ? 'conn-status--error' : ''}`} onClick={onTestConnection} disabled={testConnStatus === 'testing'}>
                {testConnStatus === 'testing' ? <RefreshCw size={14} className="spinner" /> : <Zap size={14} />}
              </button>
            </Tooltip>
          </div>

          {testConnStatus && testConnStatus !== 'testing' && (
            <p className={`conn-status-message ${testConnStatus === 'success' ? 'conn-status-message--success' : 'conn-status-message--error'}`}>
              {testConnStatus === 'success' ? t('ia.test_conexion_ok') : `${t('ia.test_conexion_error')}: ${testConnResult || 'Error'}`}
            </p>
          )}

          {provider === 'local' ? (
            <p className="usage-unlimited-hint">✨ {t('ia.consumo_ilimitado')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <UsageMeter label={t('ia.consumo_tokens')} value={usageStats?.tokens || 0} max={PROVIDER_LIMITS[provider]?.tokens || 500000} unit="tokens" />
              <UsageMeter label={t('ia.consumo_peticiones')} value={usageStats?.requests || 0} max={PROVIDER_LIMITS[provider]?.requests || 1000} unit="reqs" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
