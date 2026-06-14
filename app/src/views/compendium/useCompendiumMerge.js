import { useCallback } from 'react'

export function useCompendiumMerge({
  openModal,
  activeSection,
  scanForMergeDuplicates,
  globalHandleMergeSelection,
  confirmMerge,
  setSelectedMerge,
  setMergeResult,
  provider,
  apiKey,
  currentModel,
  localBaseUrl,
  logAIUsage,
  t,
}) {
  const handleScanMerge = useCallback(async () => {
    try {
      await scanForMergeDuplicates(activeSection);
    } catch (_err) {
      if (!apiKey && provider !== 'local') {
        openModal('alert', { message: t('unificar.sin_ia') });
      } else {
        openModal('alert', { message: t('unificar.error_escaneo') });
      }
    }
  }, [scanForMergeDuplicates, activeSection, apiKey, provider, openModal, t])

  const handleMergeSelection = useCallback(async (entities) => {
    if (!apiKey && provider !== 'local') {
      openModal('alert', { message: t('unificar.sin_ia') });
      return;
    }
    try {
      const aiConfig = { provider, apiKey, model: currentModel, localBaseUrl };
      await globalHandleMergeSelection(entities, activeSection, aiConfig, logAIUsage);
    } catch (err) {
      openModal('alert', { message: t('unificar.error_fusion', { error: err.message }) });
    }
  }, [apiKey, provider, currentModel, localBaseUrl, globalHandleMergeSelection, activeSection, logAIUsage, openModal, t])

  const handleConfirmMerge = useCallback(async (finalData = null) => {
    try {
      await confirmMerge(activeSection, finalData);
    } catch (err) {
      openModal('alert', { message: t('unificar.error_confirmar', { error: err.message }) });
    }
  }, [confirmMerge, activeSection, openModal, t])

  const handleSkipMerge = useCallback(() => {
    setSelectedMerge(null);
    setMergeResult(null);
  }, [setSelectedMerge, setMergeResult])

  return { handleScanMerge, handleMergeSelection, handleConfirmMerge, handleSkipMerge }
}
