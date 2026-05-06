import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import i18n from '../i18n/i18n';
import { db } from '../db/database';
import { ExportService } from '../services/exportService';
import { GoogleDriveService } from '../services/googleDriveService';
import { deleteVectorsForScene, deleteVectorsForNovel, indexPendingScenes } from '../services/ragService';
import { AIService } from '../services/aiService';
import { findSimilarEntities } from '../services/entityDetector';

const NovelContext = createContext();

export const NovelProvider = ({ children }) => {
  const [activeNovel, setActiveNovel] = useState(null);
  const [activeScene, setActiveScene] = useState(null);
  const [allNovels, setAllNovels] = useState([]);
  const [acts, setActs] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [objects, setObjects] = useState([]);
  const [lore, setLore] = useState([]);
  const [resources, setResources] = useState([]);
  const [nexusLinks, setNexusLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cloud Sync State
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState(localStorage.getItem('lw_cloud_sync') === 'true');
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'
  const [lastCloudSync, setLastCloudSync] = useState(localStorage.getItem('lw_last_cloud_sync'));
  const [pendingSync, setPendingSync] = useState(false);
  const cloudCheckInProgress = useRef(false);
  
  // Compendium Merge State (Global for background processing)
  const [mergeGroups, setMergeGroups] = useState([]);
  const [selectedMerge, setSelectedMerge] = useState(null);
  const [mergeResult, setMergeResult] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergingEntitiesIds, setMergingEntitiesIds] = useState([]);
  const [isScanningMerge, setIsScanningMerge] = useState(false);
  const [selectedMergeIdx, setSelectedMergeIdx] = useState(0);
  const [showMergeOverlay, setShowMergeOverlay] = useState(false);
  const [isMergeOverlayClosing, setIsMergeOverlayClosing] = useState(false);
  const [mergeSection, setMergeSection] = useState('characters');
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Initial seeding and loading
  useEffect(() => {
    const initializeDB = async () => {
      // One-time wipe of example content for existing users
      const hasWiped = localStorage.getItem('lw_v2_wiped');
      if (!hasWiped) {
        await db.transaction('rw', [db.novels, db.acts, db.chapters, db.scenes, db.characters, db.locations, db.objects, db.lore, db.resources, db.dailyProgress], async () => {
          await db.novels.clear();
          await db.acts.clear();
          await db.chapters.clear();
          await db.scenes.clear();
          await db.characters.clear();
          await db.locations.clear();
          await db.objects.clear();
          await db.lore.clear();
          await db.resources.clear();
          await db.dailyProgress.clear();
        });
        localStorage.setItem('lw_v2_wiped', 'true');
        localStorage.removeItem('activeNovelId');
        setActiveNovel(null);
        setActs([]);
      }

      await refreshAllNovels();
      
      // Check for updates in cloud if enabled
      if (localStorage.getItem('lw_cloud_sync') === 'true') {
        checkCloudBackupStatus();
      }

      setLoading(false);
    };

    initializeDB();
  }, []);

  const checkCloudBackupStatus = async () => {
    if (cloudCheckInProgress.current) return;
    cloudCheckInProgress.current = true;

    try {
      if (!GoogleDriveService.isAuthenticated()) return;
      
      const cloudFile = await GoogleDriveService.findBackupFile();
      if (cloudFile && cloudFile.modifiedTime) {
        const cloudDate = new Date(cloudFile.modifiedTime);
        // Leer directamente de localStorage para evitar problemas de timing con el estado
        const localSync = localStorage.getItem('lw_last_cloud_sync');
        const localDate = localSync ? new Date(localSync) : new Date(0);
        
        if (cloudDate > localDate) {
          // Cloud version is newer — trigger UI notification
          await new Promise(resolve => setTimeout(resolve, 100));
          window.dispatchEvent(new CustomEvent('cloud-version-available', { 
            detail: { date: cloudFile.modifiedTime, id: cloudFile.id } 
          }));
        }
      }
    } catch (e) {
      console.warn('[LoneWriter] Error verificando backup en la nube al inicio');
    } finally {
      cloudCheckInProgress.current = false;
    }
  };

  // Debounced Auto-Sync Effect
  useEffect(() => {
    if (!isCloudSyncEnabled || !pendingSync || cloudSyncStatus === 'syncing') return;

    const timer = setTimeout(async () => {
      await performCloudSync();
    }, 30000); // 30 segundos de inactividad tras cambios

    return () => clearTimeout(timer);
  }, [pendingSync, isCloudSyncEnabled]);

  const performCloudSync = async () => {
    if (!isCloudSyncEnabled) return;
    if (cloudCheckInProgress.current) return;
    
    setCloudSyncStatus('syncing');
    cloudCheckInProgress.current = true;

    try {
      // ── SAFETY CHECK: Verify cloud isn't newer before uploading ──────────
      // This prevents overwriting a backup made from another device/session.
      if (GoogleDriveService.isAuthenticated()) {
        const cloudFile = await GoogleDriveService.findBackupFile();
        if (cloudFile && cloudFile.modifiedTime) {
          const cloudDate = new Date(cloudFile.modifiedTime);
          // Leer directamente de localStorage para evitar problemas de timing
          const localSync = localStorage.getItem('lw_last_cloud_sync');
          const localSyncDate = localSync ? new Date(localSync) : new Date(0);
          const tolerance = 5000; // 5 segundos de tolerancia

          if (cloudDate.getTime() > localSyncDate.getTime() + tolerance) {
            console.warn('[LoneWriter] La nube tiene datos más recientes. Abortando subida para evitar sobreescribir.');
            setCloudSyncStatus('idle');
            setPendingSync(false);
            // Surface the "restore from cloud?" dialog
            await new Promise(resolve => setTimeout(resolve, 100));
            window.dispatchEvent(new CustomEvent('cloud-version-available', {
              detail: { date: cloudFile.modifiedTime, id: cloudFile.id }
            }));
            return;
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // Build the full database export
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: {}
      };
      for (const table of db.tables) {
        data.tables[table.name] = await table.toArray();
      }
      
      await GoogleDriveService.saveBackup(data);
      
      const now = new Date().toISOString();
      setLastCloudSync(now);
      localStorage.setItem('lw_last_cloud_sync', now);
      setCloudSyncStatus('success');
      setPendingSync(false);
      
      setTimeout(() => setCloudSyncStatus('idle'), 5000);
    } catch (error) {
      console.error('[LoneWriter] Error en auto-sincronización:', error);
      setCloudSyncStatus('error');
    } finally {
      cloudCheckInProgress.current = false;
    }
  };

  const toggleCloudSync = (enabled) => {
    setIsCloudSyncEnabled(enabled);
    localStorage.setItem('lw_cloud_sync', enabled ? 'true' : 'false');
    if (enabled) setPendingSync(true); // Trigger initial sync
  };

  const refreshAllNovels = async () => {
    const novels = await db.novels.toArray();
    // Sort by lastEdited descending
    const sorted = novels.sort((a, b) => new Date(b.lastEdited || 0) - new Date(a.lastEdited || 0));
    setAllNovels(sorted);
    
    // Auto-load removed per user request: "siempre mostrar pantalla de bienvenida"
  };

  const refreshAfterRestore = async () => {
    await refreshAllNovels();
    setActiveNovel(null);
    setActiveScene(null);
    setActs([]);
    setCharacters([]);
    setLocations([]);
    setObjects([]);
    setLore([]);
    setResources([]);
    setNexusLinks([]);
  };

  const syncNovelWordCount = async (novelId) => {
    const listActs = await db.acts.where('novelId').equals(novelId).toArray();
    let totalWords = 0;
    for (const act of listActs) {
      const chapters = await db.chapters.where('actId').equals(act.id).toArray();
      let actWords = 0;
      for (const ch of chapters) {
        const scenes = await db.scenes.where('chapterId').equals(ch.id).toArray();
        const chWords = scenes.reduce((acc, s) => acc + (s.wordCount || 0), 0);
        await db.chapters.update(ch.id, { wordCount: chWords });
        actWords += chWords;
      }
      await db.acts.update(act.id, { wordCount: actWords });
      totalWords += actWords;
    }
    await db.novels.update(novelId, { wordCount: totalWords });
    return totalWords;
  };

  const switchNovel = async (id) => {
    const novel = await db.novels.get(id);
    if (novel) {
      const realWords = await syncNovelWordCount(id);
      await reloadData(id);
      setActiveNovel({ ...novel, wordCount: realWords });
      setActiveScene(null);
      localStorage.setItem('activeNovelId', id);
      
      // Auto-index scenes that don't have RAG vectors yet (e.g. from older sessions)
      indexPendingScenes(id);
    }
  };

  const reloadData = async (novelId) => {
    const listActs = await db.acts.where('novelId').equals(novelId).sortBy('order');
    for (const act of listActs) {
      act.chapters = await db.chapters.where('actId').equals(act.id).sortBy('order');
      for (const ch of act.chapters) {
        ch.scenes = await db.scenes.where('chapterId').equals(ch.id).sortBy('order');
      }
    }
    setActs(listActs);
    setCharacters(await db.characters.where('novelId').equals(novelId).toArray());
    setLocations(await db.locations.where('novelId').equals(novelId).toArray());
    const objects = await db.objects.where('novelId').equals(novelId).toArray();
    setObjects(objects);
    setLore(await db.lore.where('novelId').equals(novelId).toArray());
    setResources(await db.resources.where('novelId').equals(novelId).toArray());
    setNexusLinks(await db.nexusLinks.where('novelId').equals(novelId).toArray());
    
    // Load UI state
    const savedExpanded = await getNovelUIExpanded(novelId);
    setExpandedIds(savedExpanded);
    
    // Also update the novel object in state to ensure wordCount is fresh
    const updatedNovel = await db.novels.get(novelId);
    setActiveNovel(updatedNovel);
  };

  // Global navigation listener
  useEffect(() => {
    const handleGlobalNavigate = (e) => {
      const { sceneId } = e.detail;
      if (!sceneId || acts.length === 0) return;

      const allS = acts.flatMap(a => (a.chapters || []).flatMap(c => c.scenes || []));
      const targetScene = allS.find(s => String(s.id) === String(sceneId));

      if (targetScene) {
        let actId = null;
        let chId = null;
        for (const act of acts) {
          for (const ch of act.chapters || []) {
            if (ch.scenes?.some(s => String(s.id) === String(sceneId))) {
              actId = act.id;
              chId = ch.id;
              break;
            }
          }
          if (actId) break;
        }

        if (actId && chId) {
          setExpandedIds(prev => new Set([...prev, `act-${actId}`, `ch-${chId}`]));
        }
        
        setActiveScene(targetScene);
      }
    };

    window.addEventListener('navigate-to-scene', handleGlobalNavigate);
    return () => window.removeEventListener('navigate-to-scene', handleGlobalNavigate);
  }, [acts]);

  // Persist expanded IDs when they change
  useEffect(() => {
    if (!activeNovel?.id) return;
    const timer = setTimeout(() => {
      updateNovelUIExpanded(activeNovel.id, expandedIds);
    }, 1000);
    return () => clearTimeout(timer);
  }, [expandedIds, activeNovel?.id]);

  const updateNovelTarget = async (novelId, targetWords, targetScenes) => {
    await updateNovel(novelId, { targetWords, targetScenes });
  };

  const updateNovel = async (novelId, data) => {
    // Filter out undefined values
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (Object.keys(cleanData).length === 0) return;

    await db.novels.update(novelId, cleanData);
    await refreshAllNovels();
    if (activeNovel?.id === novelId) {
      setActiveNovel(prev => ({ ...prev, ...cleanData }));
    }
    setPendingSync(true);
  };

  const getNovelUIExpanded = useCallback(async (novelId) => {
    const novel = await db.novels.get(novelId);
    if (novel?.uiExpanded) {
      try {
        return new Set(JSON.parse(novel.uiExpanded));
      } catch {
        return new Set();
      }
    }
    return new Set();
  }, []);

  const updateNovelUIExpanded = useCallback(async (novelId, expandedIds) => {
    const data = { uiExpanded: JSON.stringify([...expandedIds]) };
    await db.novels.update(novelId, data);
    if (activeNovel?.id === novelId) {
      setActiveNovel(prev => ({ ...prev, ...data }));
    }
  }, [activeNovel?.id]);

  const trackDailyProgress = async (novelId, wordsDiff) => {
    if (wordsDiff === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const entry = await db.dailyProgress.where({ novelId, date: today }).first();
    if (entry) {
      await db.dailyProgress.update(entry.id, { wordsWritten: entry.wordsWritten + wordsDiff });
    } else {
      await db.dailyProgress.add({ novelId, date: today, wordsWritten: Math.max(0, wordsDiff) });
    }
  };

  const getStreak = async (novelId) => {
    const history = await db.dailyProgress.where('novelId').equals(novelId).sortBy('date');
    if (history.length === 0) return 0;

    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    for (const entry of sorted) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((checkDate - entryDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        if (entry.wordsWritten > 0) streak++;
      } else if (diffDays === 1) {
        if (entry.wordsWritten > 0) {
          streak++;
          checkDate = entryDate;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return streak;
  };

  // ---- Novel CRUD ----
  const createNovel = async (title) => {
    try {
      const novelId = await db.novels.add({
        title,
        author: i18n.t('app:autor_defecto'),
        status: 'Borrador',
        wordCount: 0,
        targetWords: 100000,
        targetScenes: 60,
        lastEdited: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      // Add an initial Act
      await addAct(novelId, i18n.t('editor:acto_inicial'));
      await refreshAllNovels();
      await switchNovel(novelId);
      setPendingSync(true);
    } catch (error) {
      console.error('[LoneWriter] Error creating novel:', error);
    }
  };

  const deleteNovel = async (id) => {
    await db.transaction('rw', [
      db.novels, db.acts, db.chapters, db.scenes,
      db.characters, db.locations, db.objects, db.lore,
      db.resources, db.dailyProgress, db.debateAgents, db.debateSessions,
      db.oracleEntries, db.lastRewrite, db.mpcIgnored, db.nexusLinks
    ], async () => {
      // Delete narrative structure
      const actsToDelete = await db.acts.where('novelId').equals(id).toArray();
      for (const act of actsToDelete) {
        const chapters = await db.chapters.where('actId').equals(act.id).toArray();
        for (const ch of chapters) {
          await db.scenes.where('chapterId').equals(ch.id).delete();
        }
        await db.chapters.where('actId').equals(act.id).delete();
      }
      await db.acts.where('novelId').equals(id).delete();
      // Delete compendium data
      await db.characters.where('novelId').equals(id).delete();
      await db.locations.where('novelId').equals(id).delete();
      await db.objects.where('novelId').equals(id).delete();
      await db.lore.where('novelId').equals(id).delete();
      await db.resources.where('novelId').equals(id).delete();
      await db.dailyProgress.where('novelId').equals(id).delete();
      await db.nexusLinks.where('novelId').equals(id).delete();
      // Delete AI debate data
      await db.debateAgents.where('novelId').equals(id).delete();
      await db.debateSessions.where('novelId').equals(id).delete();
      // Delete extra AI tables
      await db.oracleEntries.where('novelId').equals(id).delete();
      await db.lastRewrite.where('novelId').equals(id).delete();
      await db.mpcIgnored.where('novelId').equals(id).delete();
      // Delete the novel itself
      await db.novels.delete(id);
    });
    // ── RAG: remove all embeddings for this novel ──
    await deleteVectorsForNovel(id);
    setAllNovels(prev => prev.filter(n => n.id !== id));
    if (activeNovel?.id === id) {
      setActiveNovel(null);
      setActiveScene(null);
    }
    setPendingSync(true);
  };

  // ---- Acts, Chapters, Scenes CRUD ----
  const addAct = async (novelId, title) => {
    const count = await db.acts.where('novelId').equals(novelId).count();
    const id = await db.acts.add({ novelId, title, order: count, wordCount: 0 });
    await reloadData(novelId);
    setPendingSync(true);
    return id;
  };

  const deleteAct = async (id) => {
    const act = await db.acts.get(id);
    const chapters = await db.chapters.where('actId').equals(id).toArray();
    for (const ch of chapters) {
      const scenes = await db.scenes.where('chapterId').equals(ch.id).toArray();
      for (const sc of scenes) {
        await deleteVectorsForScene(sc.id); // ── RAG cascade
      }
      await db.scenes.where('chapterId').equals(ch.id).delete();
    }
    await db.chapters.where('actId').equals(id).delete();
    await db.acts.delete(id);
    await reloadData(act.novelId);
    setPendingSync(true);
  };

  const addChapter = async (actId, title) => {
    const act = await db.acts.get(actId);
    const count = await db.chapters.where('actId').equals(actId).count();
    const id = await db.chapters.add({ actId, title, order: count, number: count + 1, wordCount: 0 });
    await reloadData(act.novelId);
    setPendingSync(true);
    return id;
  };

  const deleteChapter = async (id) => {
    const ch = await db.chapters.get(id);
    const act = await db.acts.get(ch.actId);
    const scenes = await db.scenes.where('chapterId').equals(id).toArray();
    for (const sc of scenes) {
      await deleteVectorsForScene(sc.id); // ── RAG cascade
    }
    await db.scenes.where('chapterId').equals(id).delete();
    await db.chapters.delete(id);
    await reloadData(act.novelId);
    setPendingSync(true);
  };

  const addScene = async (chapterId, title) => {
    const ch = await db.chapters.get(chapterId);
    const act = await db.acts.get(ch.actId);
    const count = await db.scenes.where('chapterId').equals(chapterId).count();
    const id = await db.scenes.add({ chapterId, title, order: count, number: count + 1, status: 'Borrador', pov: '', inGameDate: '', wordCount: 0, content: '' });
    await reloadData(act.novelId);
    setPendingSync(true);
    return id;
  };

  const deleteScene = async (id) => {
    const sc = await db.scenes.get(id);
    const ch = await db.chapters.get(sc.chapterId);
    const act = await db.acts.get(ch.actId);
    await db.scenes.delete(id);
    await deleteVectorsForScene(id); // ── RAG cascade
    await reloadData(act.novelId);
    setPendingSync(true);
  };

  const updateAct = async (id, data) => {
    await db.acts.update(id, data);
    if (activeNovel) reloadData(activeNovel.id);
    setPendingSync(true);
  };

  const updateChapter = async (id, data) => {
    await db.chapters.update(id, data);
    if (activeNovel) reloadData(activeNovel.id);
    setPendingSync(true);
  };

  const updateScene = async (id, data) => {
    const oldScene = await db.scenes.get(id);
    await db.scenes.update(id, data);
    
    if (data.wordCount !== undefined && activeNovel) {
      const diff = data.wordCount - (oldScene.wordCount || 0);
      if (diff !== 0) {
        const newTotal = (activeNovel.wordCount || 0) + diff;
        await db.novels.update(activeNovel.id, { 
          wordCount: Math.max(0, newTotal),
          lastEdited: new Date().toISOString()
        });
        await trackDailyProgress(activeNovel.id, diff);
      } else {
        // Even if word count hasn't changed, update lastEdited
        await db.novels.update(activeNovel.id, { 
          lastEdited: new Date().toISOString()
        });
      }
    }

    if (activeNovel) reloadData(activeNovel.id);
    setPendingSync(true);
  };

  const updateActOrder = async (novelId, actIds) => {
    await db.transaction('rw', db.acts, async () => {
      for (let i = 0; i < actIds.length; i++) {
        await db.acts.update(actIds[i], { order: i });
      }
    });
    await reloadData(novelId);
    setPendingSync(true);
  };

  const updateChapterOrder = async (novelId, chapterIds) => {
    await db.transaction('rw', db.chapters, async () => {
      for (let i = 0; i < chapterIds.length; i++) {
        await db.chapters.update(chapterIds[i], { order: i });
      }
    });
    await reloadData(novelId);
    setPendingSync(true);
  };

  const updateSceneOrder = async (novelId, sceneIds) => {
    await db.transaction('rw', db.scenes, async () => {
      for (let i = 0; i < sceneIds.length; i++) {
        await db.scenes.update(sceneIds[i], { order: i });
      }
    });
    await reloadData(novelId);
    setPendingSync(true);
  };

  const moveScene = async (sceneId, targetChapterId, newOrderIds) => {
    await db.transaction('rw', db.scenes, async () => {
      // 1. Update the parent
      await db.scenes.update(sceneId, { chapterId: targetChapterId });
      // 2. Reorder everything in the target chapter including the new scene
      for (let i = 0; i < newOrderIds.length; i++) {
        await db.scenes.update(newOrderIds[i], { order: i });
      }
    });
    if (activeNovel) await reloadData(activeNovel.id);
    setPendingSync(true);
  };

  const moveChapter = async (chapterId, targetActId, newOrderIds) => {
    await db.transaction('rw', db.chapters, async () => {
      // 1. Update the parent act
      await db.chapters.update(chapterId, { actId: targetActId });
      // 2. Reorder all chapters in the target act
      for (let i = 0; i < newOrderIds.length; i++) {
        await db.chapters.update(newOrderIds[i], { order: i });
      }
    });
    if (activeNovel) await reloadData(activeNovel.id);
    setPendingSync(true);
  };

  // ---- Compendium CRUD ----
  const addCompendiumEntry = async (table, data) => {
    if (!activeNovel) return;
    const id = await db[table].add({ ...data, novelId: activeNovel.id });
    await reloadData(activeNovel.id);
    setPendingSync(true);
    return id;
  };

  const updateCompendiumEntry = async (table, id, data) => {
    if (!activeNovel) return;
    await db[table].update(id, data);
    await reloadData(activeNovel.id);
    setPendingSync(true);
  };

  const deleteCompendiumEntry = async (table, id) => {
    if (!activeNovel) return;
    await db[table].delete(id);
    await reloadData(activeNovel.id);
    setPendingSync(true);
  };

  const scanForMergeDuplicates = async (activeSection, config = {}) => {
    let items = [];
    setMergeSection(activeSection);
    if (activeSection === 'characters') items = characters;
    else if (activeSection === 'locations') items = locations;
    else if (activeSection === 'objects') items = objects;
    else if (activeSection === 'lore') items = lore;

    if (items.length < 2) return;

    setIsScanningMerge(true);
    setMergeGroups([]);
    setSelectedMerge(null);
    setMergeResult(null);

    try {
      const result = await findSimilarEntities(items, 0.70);
      setMergeGroups(result.groups || []);
      setShowMergeOverlay(true);
    } catch (err) {
      console.error('[NovelContext] Scan error:', err);
      throw err;
    } finally {
      setIsScanningMerge(false);
    }
  };

  const handleMergeSelection = async (entities, activeSection, aiConfig, logAIUsage) => {
    if (entities.length < 2) return;

    setIsMerging(true);
    setMergingEntitiesIds(entities.map(e => e.id));
    setMergeResult(null);

    try {
      const result = await AIService.fuseMultipleEntities(entities, activeSection, aiConfig);
      if (logAIUsage) logAIUsage(result.usage);
      
      const nameField = activeSection === 'lore' ? 'title' : 'name';
      const candidate = {
        entity1: entities[0],
        entity2: entities[1],
        _allEntities: entities,
        name1: entities[0][nameField],
        name2: entities[1][nameField]
      };
      
      setSelectedMerge(candidate);
      setMergeResult(result.data);
    } catch (err) {
      console.error('[NovelContext] Merge error:', err);
      throw err;
    } finally {
      setIsMerging(false);
    }
  };

  const confirmMerge = async (activeSection, finalData = null) => {
    if (!mergeResult || !selectedMerge) return;

    try {
      const table = activeSection;
      const data = finalData || { ...mergeResult };
      
      // CRITICAL FIX: Remove any ID to prevent IndexedDB key errors
      delete data.id;

      // Normalize name/title
      if (table === 'lore' && data.name && !data.title) {
        data.title = data.name;
        delete data.name;
      } else if (table !== 'lore' && data.title && !data.name) {
        data.name = data.title;
        delete data.title;
      }

      if (table === 'characters') {
        data.name = data.name || 'Nuevo personaje';
        data.initials = data.initials || (data.name || '').substring(0, 2).toUpperCase();
        data.color = data.color || '#6b9fd4';
      } else if (table === 'locations') {
        data.name = data.name || 'Nueva localización';
        data.color = data.color || '#6b9fd4';
      } else if (table === 'objects') {
        data.name = data.name || 'Nuevo objeto';
      } else if (table === 'lore') {
        data.title = data.title || 'Nueva entrada de lore';
      }

      if (selectedMerge._allEntities) {
        for (const e of selectedMerge._allEntities) {
          await deleteCompendiumEntry(table, e.id);
        }
      } else {
        await deleteCompendiumEntry(table, selectedMerge.entity1.id);
        await deleteCompendiumEntry(table, selectedMerge.entity2.id);
      }

      await addCompendiumEntry(table, data);
      
      const mergedIds = new Set(selectedMerge._allEntities.map(e => e.id));
      setMergeGroups(prev => prev.filter(g => !g.entities.some(e => mergedIds.has(e.id))));

      setSelectedMerge(null);
      setMergingEntitiesIds([]);
      setMergeResult(null);
    } catch (err) {
      console.error('[NovelContext] Confirm error:', err);
      throw err;
    }
  };

  const skipMerge = () => {
    setSelectedMerge(null);
    setMergingEntitiesIds([]);
    setMergeResult(null);
  };

  const closeMergeOverlay = () => {
    setIsMergeOverlayClosing(true);
    setTimeout(() => {
      setShowMergeOverlay(false);
      setIsMergeOverlayClosing(false);
      if (!isMerging && !mergeResult) {
        setMergeGroups([]);
        setSelectedMerge(null);
        setMergingEntitiesIds([]);
        setSelectedMergeIdx(0);
      }
    }, 220);
  };

  const value = {
    activeNovel,
    activeScene,
    setActiveScene,
    allNovels,
    acts,
    characters,
    locations,
    objects,
    lore,
    resources,
    nexusLinks,
    loading,
    createNovel,
    switchNovel,
    deleteNovel,
    addAct,
    updateAct,
    deleteAct,
    addChapter,
    updateChapter,
    deleteChapter,
    addScene,
    deleteScene,
    updateScene,
    updateActOrder,
    updateChapterOrder,
    updateSceneOrder,
    moveScene,
    moveChapter,
    updateNovelTarget,
    updateNovel,
    getNovelUIExpanded,
    updateNovelUIExpanded,
    getStreak,
    addCompendiumEntry,
    updateCompendiumEntry,
    deleteCompendiumEntry,
    isCloudSyncEnabled,
    cloudSyncStatus,
    lastCloudSync,
    toggleCloudSync,
    performCloudSync,
    refreshAfterRestore,
    // Merge Exports
    mergeGroups, setMergeGroups,
    selectedMerge, setSelectedMerge,
    mergeResult, setMergeResult,
    isMerging, setIsMerging,
    mergingEntitiesIds, setMergingEntitiesIds,
    isScanningMerge, setIsScanningMerge,
    selectedMergeIdx, setSelectedMergeIdx,
    showMergeOverlay, setShowMergeOverlay,
    isMergeOverlayClosing, setIsMergeOverlayClosing,
    mergeSection, setMergeSection,
    scanForMergeDuplicates,
    handleMergeSelection,
    confirmMerge,
    skipMerge,
    closeMergeOverlay,
    expandedIds,
    setExpandedIds
  };

  return <NovelContext.Provider value={value}>{children}</NovelContext.Provider>;
};

export const useNovel = () => useContext(NovelContext);
