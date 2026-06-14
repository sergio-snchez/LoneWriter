import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GoogleDriveService } from '../services'
import { restoreTables } from '../db/database'

export function useCloudRestore({ openModal, refreshAfterRestore }) {
  const { t } = useTranslation('app')

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
              await restoreTables(cloudData.tables);
              localStorage.setItem('lw_last_cloud_sync', date);
              await refreshAfterRestore();
            }
          } catch (err) {
            console.error('[LoneWriter] Cloud restore error:', err);
            openModal('alert', { title: t('error_titulo'), message: t('error_restaurar') + err.message });
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
        await restoreTables(cloudData.tables);
        localStorage.setItem('lw_last_cloud_sync', date);
        await refreshAfterRestore();
      } catch (err) {
        console.error('[LoneWriter] Revision restore error:', err);
        openModal('alert', { title: t('error_titulo'), message: t('error_restaurar') + err.message });
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
  }, [openModal, refreshAfterRestore, t]);
}
