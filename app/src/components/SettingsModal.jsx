import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Cloud, Sparkles, Info, Palette } from 'lucide-react'
import { useAI } from '../context/AIContext'
import { useNovel } from '../context/NovelContext'
import { GoogleDriveService } from '../services/googleDriveService'
import { SettingsCloudTab } from './SettingsCloudTab'
import { SettingsAITab } from './SettingsAITab'
import { SettingsUITab } from './SettingsUITab'
import { SettingsGeneralTab } from './SettingsGeneralTab'
import './SettingsModal.css'

const SettingsModal = ({ isOpen, onClose, initialTab = 'cloud', theme, setTheme, editorFont, setEditorFont, meshEnabled, setMeshEnabled, openModal }) => {
  const { t, i18n } = useTranslation('settings')
  const { t: tc } = useTranslation('common')
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => { setIsClosing(false); onClose() }, 250)
  }

  useEffect(() => { if (isOpen) setActiveTab(initialTab) }, [isOpen, initialTab])

  const { provider, apiKey, allConfigs, testConnection } = useAI()
  const { isCloudSyncEnabled, cloudSyncStatus, lastCloudSync, toggleCloudSync, performCloudSync } = useNovel()

  const [isSyncing, setIsSyncing] = useState(false)
  const [isCloudLinked, setIsCloudLinked] = useState(GoogleDriveService.isAuthenticated())
  const [showRevisions, setShowRevisions] = useState(false)
  const [revisions, setRevisions] = useState([])
  const [testConnStatus, setTestConnStatus] = useState(null)
  const [testConnResult, setTestConnResult] = useState(null)

  const updateTestConnection = (status, result = null) => {
    setTestConnStatus(status)
    setTestConnResult(result)
    if (status === 'success') setTimeout(() => { setTestConnStatus(null); setTestConnResult(null) }, 3000)
  }

  const handleClearCache = () => {
    openModal('confirm', {
      title: tc('settings.general.clear_cache_title'),
      message: tc('settings.general.clear_cache_confirm'),
      confirmLabel: tc('botones.confirmar'),
      isDanger: true,
      onConfirm: async () => {
        try {
          if ('caches' in window) {
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map(name => caches.delete(name)))
          }
          localStorage.clear()
          window.location.reload()
        } catch (err) {
          console.error('Error clearing cache:', err)
          openModal('alert', { message: tc('settings.general.clear_cache_error') })
        }
      }
    })
  }

  if (!isOpen) return null

  const handleCloudLink = async () => {
    setIsSyncing(true)
    try {
      await GoogleDriveService.authenticate()
      setIsCloudLinked(true)
      toggleCloudSync(true)
      const cloudFile = await GoogleDriveService.findBackupFile()
      if (cloudFile && cloudFile.modifiedTime) {
        window.dispatchEvent(new CustomEvent('cloud-version-available', { detail: { date: new Date(cloudFile.modifiedTime).getTime() } }))
      }
    } catch (error) {
      console.error('Error linking Google Drive:', error)
      const msg = !import.meta.env.VITE_GOOGLE_CLIENT_ID ? t('errores.client_id_no_configurado') : t('errores.error_conexion_google')
      openModal('alert', { message: msg })
    } finally { setIsSyncing(false) }
  }

  const handleSignOut = () => { GoogleDriveService.signOut(); setIsCloudLinked(false); toggleCloudSync(false) }

  const handleManualSync = async () => { setIsSyncing(true); await performCloudSync(); setIsSyncing(false) }

  const handleShowRevisions = async () => {
    setIsSyncing(true)
    try {
      const revs = await GoogleDriveService.getRevisions()
      setRevisions(revs || [])
      setShowRevisions(true)
    } catch (error) {
      console.error('Error loading revisions:', error)
      openModal('alert', { message: t('nube.error_cargar_historial') })
    } finally { setIsSyncing(false) }
  }

  const handleRestoreRevision = (revisionId, revisionDate) => {
    openModal('confirm', {
      title: t('nube.restaurar'),
      message: t('nube.confirmar_restaurar', { date: new Date(revisionDate).toLocaleString() }),
      confirmLabel: tc('botones.restaurar'),
      onConfirm: async () => {
        setIsSyncing(true)
        try {
          const cloudData = await GoogleDriveService.downloadRevision(revisionId)
          if (cloudData) {
            window.dispatchEvent(new CustomEvent('restore-from-revision', { detail: { data: cloudData, date: revisionDate } }))
            setShowRevisions(false)
          }
        } catch (error) {
          console.error('Error restoring revision:', error)
          openModal('alert', { message: t('nube.error_restaurar_version') })
        } finally { setIsSyncing(false) }
      }
    })
  }

  const handleTestConnection = async () => {
    const config = { provider, apiKey: apiKey || allConfigs[provider]?.apiKey, model: allConfigs[provider]?.model, localBaseUrl: allConfigs[provider]?.localBaseUrl }
    setTestConnStatus('testing')
    const result = await testConnection(config)
    updateTestConnection(result.success ? 'success' : 'error', result.error)
  }

  return (
    <div className={`settings-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`settings-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__sidebar">
          <div className="settings-modal__sidebar-header">
            <span className="settings-modal__sidebar-title">{t('sidebar.titulo')}</span>
          </div>
          <nav className="settings-modal__nav">
            {[
              { id: 'cloud', icon: Cloud, label: t('sidebar.navegacion.nube') },
              { id: 'ia', icon: Sparkles, label: t('sidebar.navegacion.ia') },
              { id: 'ui', icon: Palette, label: t('sidebar.navegacion.interfaz') },
              { id: 'general', icon: Info, label: t('sidebar.navegacion.general') },
            ].map(tab => (
              <button key={tab.id} className={`settings-modal__nav-item ${activeTab === tab.id ? 'settings-modal__nav-item--active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                <tab.icon size={16} />
                <span className="settings-modal__nav-label">{tab.label}</span>
              </button>
            ))}
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
            <button className="settings-modal__close" onClick={handleClose}><X size={18} /></button>
          </div>
          <div className="settings-modal__body">
            {activeTab === 'cloud' && (
              <SettingsCloudTab
                isCloudLinked={isCloudLinked}
                isSyncing={isSyncing}
                cloudSyncStatus={cloudSyncStatus}
                lastCloudSync={lastCloudSync}
                isCloudSyncEnabled={isCloudSyncEnabled}
                showRevisions={showRevisions}
                revisions={revisions}
                onLink={handleCloudLink}
                onSignOut={handleSignOut}
                onManualSync={handleManualSync}
                onShowRevisions={handleShowRevisions}
                onRestoreRevision={handleRestoreRevision}
                onCloseRevisions={() => setShowRevisions(false)}
                onToggleAutoSync={toggleCloudSync}
                onClearCache={handleClearCache}
              />
            )}
            {activeTab === 'ia' && (
              <SettingsAITab
                testConnStatus={testConnStatus}
                testConnResult={testConnResult}
                onTestConnection={handleTestConnection}
              />
            )}
            {activeTab === 'ui' && (
              <SettingsUITab
                theme={theme}
                setTheme={setTheme}
                editorFont={editorFont}
                setEditorFont={setEditorFont}
                meshEnabled={meshEnabled}
                setMeshEnabled={setMeshEnabled}
              />
            )}
            {activeTab === 'general' && (
              <SettingsGeneralTab onClearCache={handleClearCache} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
