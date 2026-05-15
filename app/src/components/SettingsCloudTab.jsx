import { useTranslation } from 'react-i18next'
import { Cloud, RefreshCw, LogIn, LogOut, X, Shield, ExternalLink, Heart, History } from 'lucide-react'
import { Tooltip } from './Tooltip'

export function SettingsCloudTab({ isCloudLinked, isSyncing, cloudSyncStatus, lastCloudSync, isCloudSyncEnabled, showRevisions, revisions, onLink, onSignOut, onManualSync, onShowRevisions, onRestoreRevision, onCloseRevisions, onToggleAutoSync }) {
  const { t } = useTranslation('settings')

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cloud size={14} />{t('nube.seccion_titulo')}
        </span>
        <p className="settings-section__hint" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
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
              <button className="btn btn-ghost btn-sm" onClick={onSignOut} style={{ color: 'var(--red)' }}>
                <LogOut size={14} />{t('nube.desconectar')}
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
          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('nube.historial_titulo')}</span>
              <button className="btn btn-ghost btn-sm" onClick={onCloseRevisions}><X size={14} /></button>
            </div>
            {revisions.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('nube.sin_revisiones')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {revisions.slice().reverse().map((rev) => (
                  <div key={rev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '12px' }}>{new Date(rev.modifiedTime).toLocaleString()}</span>
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
          <>
            <div style={{ padding: '12px', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '13px' }}>{t('nube.sincronizacion_automatica')}</label>
                  <span style={{ fontSize: '11px', color: 'var(--accent-light)' }}>{t('nube.proteccion_cache')}</span>
                </div>
                <input type="checkbox" className="form-toggle" checked={isCloudSyncEnabled} onChange={(e) => onToggleAutoSync(e.target.checked)} style={{ height: '20px', width: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-accent)' }}>
                <Shield size={16} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                <p style={{ fontSize: '11px', color: 'var(--accent-light)', margin: 0 }} dangerouslySetInnerHTML={{ __html: t('nube.seguridad_hint', { interpolation: { escapeValue: false } }) }} />
              </div>
            </div>

            <div className="settings-section" style={{ marginTop: '16px' }}>
              <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={14} />{t('general.enlaces_titulo')}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <a href="https://github.com/sergio-snchez/LoneWriter" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px' }}>
                  <ExternalLink size={14} />{t('general.github_link')}
                </a>
                <a href="https://buymeacoffee.com/sergio.snchez" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px' }}>
                  <Heart size={14} />{t('general.buymeacoffee_link')}
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
