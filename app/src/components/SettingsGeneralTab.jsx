import { useTranslation } from 'react-i18next'
import { Info, RotateCw, AlertTriangle } from 'lucide-react'

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
          <RotateCw size={14} />{t('general.recargar_app')}
        </span>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>{t('general.recargar_app_hint')}</p>
        <button className="btn btn-primary" onClick={onClearCache} style={{ maxWidth: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <AlertTriangle size={16} />
          <span>{t('general.recargar_app_boton')}</span>
          <AlertTriangle size={16} />
        </button>
      </div>
    </div>
  )
}
