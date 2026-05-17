import { useTranslation } from 'react-i18next'
import { Info, RefreshCw, AlertTriangle, ExternalLink, Globe, Heart } from 'lucide-react'

export function SettingsGeneralTab({ onClearCache }) {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('common')

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={14} />{t('general.seccion_titulo')}
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
          <span className="settings-info-label">{t('general.tecnologia_saliencia')}</span>
          <span className="settings-info-value">{t('general.tecnologia_saliencia_valor')}</span>
          <span className="settings-info-label">{t('general.tecnologia_nexus')}</span>
          <span className="settings-info-value">{t('general.tecnologia_nexus_valor')}</span>
        </div>
      </div>
      <div className="settings-section">
        <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ExternalLink size={14} />{t('general.enlaces_titulo')}
        </span>
        <div className="settings-links-list">
          <a href="https://lonewriter-docs.vercel.app/" target="_blank" rel="noopener noreferrer" className="settings-link-item">
            <Info size={14} />
            <span>{t('general.docs_link')}</span>
          </a>
          <a href="https://lonewriter.vercel.app/" target="_blank" rel="noopener noreferrer" className="settings-link-item">
            <Globe size={14} />
            <span>{t('general.landing_link')}</span>
          </a>
          <a href="https://buymeacoffee.com/sergio.snchez" target="_blank" rel="noopener noreferrer" className="settings-link-item">
            <Heart size={14} />
            <span>{t('general.buymeacoffee_link')}</span>
          </a>
        </div>
      </div>
    </div>
  )
}
