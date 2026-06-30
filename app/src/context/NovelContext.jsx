import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNovelData, useNovelCrud, useNovelProgress, useCloudSync, useMergeEngine } from './';
import { db } from '../db/database';

const NovelContext = createContext();

export const NovelProvider = ({ children }) => {
  const {
    allNovels, setAllNovels,
    activeNovel, setActiveNovel,
    activeScene, setActiveScene,
    loading,
    acts,
    characters,
    locations,
    objects,
    lore,
    resources,
    nexusLinks,
    expandedIds, setExpandedIds,
    reloadData,
    refreshAllNovels,
    refreshAfterRestore,
    syncNovelWordCount,
    getNovelUIExpanded,
    updateNovelUIExpanded,
  } = useNovelData();

  const { trackDailyProgress, getStreak } = useNovelProgress();

  const {
    isCloudSyncEnabled,
    cloudSyncStatus,
    lastCloudSync,
    setPendingSync,
    toggleCloudSync,
    performCloudSync,
    checkCloudBackupStatus,
  } = useCloudSync({ db });

  const {
    createNovel,
    deleteNovel,
    switchNovel,
    updateNovel,
    updateNovelTarget,
    addAct, deleteAct, updateAct,
    addChapter, deleteChapter, updateChapter,
    addScene, deleteScene, updateScene,
    updateActOrder, updateChapterOrder, updateSceneOrder,
    moveScene, moveChapter,
    addCompendiumEntry, updateCompendiumEntry, deleteCompendiumEntry,
  } = useNovelCrud({
    activeNovel,
    setActiveNovel,
    setActiveScene,
    reloadData,
    refreshAllNovels,
    syncNovelWordCount,
    trackDailyProgress,
    setPendingSync,
  });

  // Cloud backup check on mount (extracted from initialization)
  useEffect(() => {
    if (!loading && localStorage.getItem('lw_cloud_sync') === 'true') {
      checkCloudBackupStatus()
    }
  }, [loading, checkCloudBackupStatus])

  // Restore last active novel from localStorage after DB initialization
  const restoredRef = useRef(false)
  useEffect(() => {
    if (loading || activeNovel || restoredRef.current) return
    restoredRef.current = true
    const savedId = localStorage.getItem('activeNovelId')
    if (!savedId) return
    db.novels.get(Number(savedId)).then(novel => {
      if (novel) {
        switchNovel(novel.id)
      } else {
        localStorage.removeItem('activeNovelId')
      }
    })
  }, [loading, activeNovel, switchNovel])

  const merge = useMergeEngine({
    characters,
    locations,
    objects,
    lore,
    addCompendiumEntry,
    deleteCompendiumEntry,
  });

  const value = useMemo(() => ({
    activeNovel, activeScene, setActiveScene,
    allNovels, acts, characters, locations, objects, lore, resources, nexusLinks,
    loading,
    createNovel, switchNovel, deleteNovel,
    addAct, updateAct, deleteAct,
    addChapter, updateChapter, deleteChapter,
    addScene, deleteScene, updateScene,
    updateActOrder, updateChapterOrder, updateSceneOrder,
    moveScene, moveChapter,
    updateNovelTarget, updateNovel,
    getNovelUIExpanded, updateNovelUIExpanded,
    getStreak,
    addCompendiumEntry, updateCompendiumEntry, deleteCompendiumEntry,
    isCloudSyncEnabled, cloudSyncStatus, lastCloudSync,
    toggleCloudSync, performCloudSync,
    refreshAfterRestore,
    ...merge,
    expandedIds, setExpandedIds,
  }), [
    activeNovel, activeScene, setActiveScene,
    allNovels, acts, characters, locations, objects, lore, resources, nexusLinks,
    loading,
    createNovel, switchNovel, deleteNovel,
    addAct, updateAct, deleteAct,
    addChapter, updateChapter, deleteChapter,
    addScene, deleteScene, updateScene,
    updateActOrder, updateChapterOrder, updateSceneOrder,
    moveScene, moveChapter,
    updateNovelTarget, updateNovel,
    getNovelUIExpanded, updateNovelUIExpanded,
    getStreak,
    addCompendiumEntry, updateCompendiumEntry, deleteCompendiumEntry,
    isCloudSyncEnabled, cloudSyncStatus, lastCloudSync,
    toggleCloudSync, performCloudSync,
    refreshAfterRestore,
    merge.mergeGroups, merge.selectedMerge, merge.mergeResult,
    merge.isMerging, merge.mergingEntitiesIds, merge.isScanningMerge,
    merge.selectedMergeIdx, merge.showMergeOverlay, merge.isMergeOverlayClosing,
    merge.mergeSection,
    merge.setMergeGroups, merge.setSelectedMerge, merge.setMergeResult,
    merge.setIsMerging, merge.setMergingEntitiesIds, merge.setIsScanningMerge,
    merge.setSelectedMergeIdx, merge.setShowMergeOverlay, merge.setIsMergeOverlayClosing,
    merge.setMergeSection,
    merge.scanForMergeDuplicates, merge.handleMergeSelection,
    merge.confirmMerge, merge.skipMerge, merge.closeMergeOverlay,
    expandedIds, setExpandedIds,
  ]);

  return <NovelContext.Provider value={value}>{children}</NovelContext.Provider>;
};

NovelProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useNovel = () => useContext(NovelContext);
