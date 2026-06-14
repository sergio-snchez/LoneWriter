import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Cloud, RefreshCw, LogIn, LogOut, X, Shield, ExternalLink, Heart, History, AlertTriangle } from 'lucide-react'
import { MarkdownRenderer, Tooltip } from './'

export function SettingsCloudTab({ isCloudLinked, isSyncing, cloudSyncStatus, lastCloudSync, isCloudSyncEnabled, showRevisions, revisions, onLink, onSignOut, onManualSync, onShowRevisions, onRestoreRevision, onCloseRevisions, onToggleAutoSync, onClearCache }) {
  SettingsCloudTab.propTypes = {
    isCloudLinked: PropTypes.bool.isRequired,
    isSyncing: PropTypes.bool.isRequired,
    cloudSyncStatus: PropTypes.string,
    lastCloudSync: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isCloudSyncEnabled: PropTypes.bool.isRequired,
    showRevisions: PropTypes.bool.isRequired,
    revisions: PropTypes.array,
    onLink: PropTypes.func.isRequired,
    onSignOut: PropTypes.func.isRequired,
    onManualSync: PropTypes.func.isRequired,
    onShowRevisions: PropTypes.func.isRequired,
    onRestoreRevision: PropTypes.func.isRequired,
    onCloseRevisions: PropTypes.func.isRequired,
    onToggleAutoSync: PropTypes.func.isRequired,
    onClearCache: PropTypes.func.isRequired,
  };

  const { t } = useTranslation('settings')

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <span className="settings-section__title settings-section__title--row">
          <Cloud size={14} />{t('nube.seccion_titulo')}
        </span>
        <p className="settings-section__hint">
          {t('nube.seccion_hint')}
        </p>

        <div className="cloud-sync-card">
          <div className="cloud-sync-card__header">
            <div className="cloud-sync-card__icon"><Cloud size={20} /></div>
            <div className="cloud-sync-card__info">
              <span className="cloud-sync-card__title">
                {isCloudLinked ? t('nube.cuenta_vinculada') : t('nube.no_vinculado')}
              </span>
              <span className={`cloud-sync-card__status ${isCloudLinked ? 'cloud-sync-card__status--online' : ''}`}>
                {isCloudLinked ? t('nube.google_drive_activo') : t('nube.conectar_hint')}
              </span>
            </div>
            {!isCloudLinked ? (
              <button className="btn btn-primary btn-sm" onClick={onLink} disabled={isSyncing}>
                {isSyncing ? <RefreshCw size={14} className="spinner" /> : <LogIn size={14} />}
                {t('nube.vincular_cuenta')}
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm cloud-sign-out-btn" onClick={onSignOut}>
                <LogOut size={14} />{t('nube.desconectar')}
              </button>
            )}
          </div>

          {isCloudLinked && (
            <div className="cloud-sync-card__footer">
              <span className="cloud-sync-status">
                {cloudSyncStatus === 'syncing' ? t('nube.sincronizando') :
                  cloudSyncStatus === 'error' ? t('nube.error_guardar') :
                    `${t('nube.ultima_copia', { date: lastCloudSync ? new Date(lastCloudSync).toLocaleString() : t('nube.nunca') })}`}
              </span>
              <Tooltip content={t('nube.ver_historial')}>
                <button className="btn btn-ghost btn-sm" onClick={onShowRevisions} disabled={isSyncing}>
                  <History size={14} />{t('nube.versiones')}
                </button>
              </Tooltip>
              <Tooltip content={t('nube.sincronizar_ahora')}>
                <button className="btn btn-ghost btn-sm" onClick={onManualSync} disabled={isSyncing || cloudSyncStatus === 'syncing'}>
                  <RefreshCw size={14} className={isSyncing || cloudSyncStatus === 'syncing' ? 'spinner' : ''} />
                  {t('nube.sincronizar')}
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {showRevisions && (
          <div className="cloud-revisions">
            <div className="cloud-revisions__header">
              <span className="cloud-revisions__title">{t('nube.historial_titulo')}</span>
              <button className="btn btn-ghost btn-sm" onClick={onCloseRevisions}><X size={14} /></button>
            </div>
            {revisions.length === 0 ? (
              <p className="cloud-revisions__empty">{t('nube.sin_revisiones')}</p>
            ) : (
              <div className="cloud-revisions__list">
                {revisions.slice().reverse().map((rev) => (
                  <div key={rev.id} className="cloud-revisions__item">
                    <span className="cloud-revisions__date">{new Date(rev.modifiedTime).toLocaleString()}</span>
                    <button className="btn btn-primary btn-sm" onClick={() => onRestoreRevision(rev.id, rev.modifiedTime)} disabled={isSyncing}>
                      {t('nube.restaurar')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isCloudLinked && (
          <div className="cloud-auto-sync">
            <div className="cloud-auto-sync__row">
              <div className="cloud-auto-sync__info">
                <label className="cloud-auto-sync__label">{t('nube.sincronizacion_automatica')}</label>
                <span className="cloud-auto-sync__hint">{t('nube.proteccion_cache')}</span>
              </div>
              <input type="checkbox" className="form-toggle form-toggle--cloud" checked={isCloudSyncEnabled} onChange={(e) => onToggleAutoSync(e.target.checked)} />
            </div>
            <div className="cloud-auto-sync__security">
              <Shield size={16} className="cloud-auto-sync__shield" />
              <MarkdownRenderer className="cloud-auto-sync__security-text" content={t('nube.seguridad_hint', { interpolation: { escapeValue: false } })} />
            </div>
          </div>
        )}

        <div className="settings-section settings-section--separated">
          <span className="settings-section__title settings-section__title--row">
            <RefreshCw size={14} />{t('nube.recargar_app')}
          </span>
          <p className="cloud-reload-hint">{t('nube.recargar_app_hint')}</p>
          <button className="btn btn-primary cloud-reload-btn" onClick={onClearCache}>
            <AlertTriangle size={16} />
            <span>{t('nube.recargar_app_boton')}</span>
            <AlertTriangle size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
