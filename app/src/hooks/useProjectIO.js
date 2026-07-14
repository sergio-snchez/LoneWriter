import { useTranslation } from 'react-i18next'
import { ExportService } from '../services'

export function useProjectIO({ openModal, activeNovel, acts, createNovel, fileInputRef }) {
  const { t } = useTranslation('app')

  const handleExportProject = () => {
    openModal('prompt', {
      title: t('exportar.titulo_password'),
      message: t('exportar.mensaje_password'),
      placeholder: t('exportar.placeholder_password'),
      confirmLabel: t('exportar.boton_exportar'),
      allowEmpty: true,
      onConfirm: async (password) => {
        try {
          await ExportService.exportProject(password || null);
        } catch (error) {
          console.error('Error exporting project:', error);
        }
      }
    });
  }

  const handleExportFullWord = () => {
    if (activeNovel && acts) {
      const strings = {
        unknownAuthor: t('exportar.autor_desconocido'),
        chapterLabel: t('exportar.capitulo'),
        sceneLabel: t('exportar.escena'),
        emptyScene: t('exportar.escena_vacia'),
        generatedBy: t('exportar.generado_por'),
      };
      ExportService.exportFullNovel(activeNovel, acts, strings).catch(err => {
        console.error('[LoneWriter] exportFullNovel error:', err);
      });
    }
  }

  const handleExportFullODT = () => {
    if (activeNovel && acts) {
      const strings = {
        unknownAuthor: t('exportar.autor_desconocido'),
        chapterLabel: t('exportar.capitulo'),
        sceneLabel: t('exportar.escena'),
        emptyScene: t('exportar.escena_vacia'),
        generatedBy: t('exportar.generado_por'),
      };
      ExportService.exportFullNovelODT(activeNovel, acts, strings).catch(err => {
        console.error('[LoneWriter] exportFullNovelODT error:', err);
      });
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click();
  }

  const handleCreateProject = () => {
    openModal('project', {
      onConfirm: (title) => createNovel(title)
    });
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const tryImport = (password = null) => {
      ExportService.importProject(file, password).catch(err => {
        if (err.message === 'ENCRYPTED') {
          openModal('prompt', {
            title: t('importar.titulo_password'),
            message: t('importar.mensaje_password'),
            placeholder: t('exportar.placeholder_password'),
            confirmLabel: t('importar.boton_desencriptar'),
            onConfirm: (pw) => tryImport(pw)
          });
        } else if (err.message === 'WRONG_PASSWORD') {
          openModal('prompt', {
            title: t('importar.titulo_password_incorrecta'),
            message: t('importar.mensaje_password_incorrecta'),
            placeholder: t('exportar.placeholder_password'),
            confirmLabel: t('importar.boton_desencriptar'),
            onConfirm: (pw) => tryImport(pw)
          });
        } else {
          console.error('[LoneWriter] Import error:', err);
          openModal('alert', { title: t('importar.titulo_error'), message: err.message });
        }
      });
    };

    tryImport();
  };

  return {
    handleExportProject,
    handleExportFullWord,
    handleExportFullODT,
    handleImportClick,
    handleFileChange,
    handleCreateProject,
  }
}
