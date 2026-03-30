import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/database';

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
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };

    initializeDB();
  }, []);

  const refreshAllNovels = async () => {
    const novels = await db.novels.toArray();
    // Sort by lastEdited descending
    const sorted = novels.sort((a, b) => new Date(b.lastEdited || 0) - new Date(a.lastEdited || 0));
    setAllNovels(sorted);
    
    // Auto-load removed per user request: "siempre mostrar pantalla de bienvenida"
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
      // Sync word count on switch to fix any discrepancies
      const realWords = await syncNovelWordCount(id);
      setActiveNovel({ ...novel, wordCount: realWords });
      localStorage.setItem('activeNovelId', id);
      await reloadData(id);
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
    
    // Also update the novel object in state to ensure wordCount is fresh
    const updatedNovel = await db.novels.get(novelId);
    setActiveNovel(updatedNovel);
  };

  const updateNovelTarget = async (novelId, targetWords, targetScenes) => {
    const data = {};
    if (targetWords !== undefined) data.targetWords = targetWords;
    if (targetScenes !== undefined) data.targetScenes = targetScenes;
    
    await db.novels.update(novelId, data);
    await refreshAllNovels();
    if (activeNovel?.id === novelId) {
      setActiveNovel(prev => ({ ...prev, ...data }));
    }
  };

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
        author: 'Autor',
        status: 'Borrador',
        wordCount: 0,
        targetWords: 100000,
        targetScenes: 60,
        lastEdited: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      // Add an initial Act
      await addAct(novelId, 'Acto I: Inicio');
      await refreshAllNovels();
      await switchNovel(novelId);
    } catch (error) {
      console.error('[LoneWriter] Error creating novel:', error);
    }
  };

  const deleteNovel = async (id) => {
    await db.transaction('rw', [
      db.novels, db.acts, db.chapters, db.scenes,
      db.characters, db.locations, db.objects, db.lore,
      db.resources, db.dailyProgress, db.debateAgents, db.debateSessions
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
      // Delete AI debate data
      await db.debateAgents.where('novelId').equals(id).delete();
      await db.debateSessions.where('novelId').equals(id).delete();
      // Delete the novel itself
      await db.novels.delete(id);
    });
    setAllNovels(prev => prev.filter(n => n.id !== id));
    if (activeNovel?.id === id) setActiveNovel(null);
  };

  // ---- Acts, Chapters, Scenes CRUD ----
  const addAct = async (novelId, title) => {
    const count = await db.acts.where('novelId').equals(novelId).count();
    const id = await db.acts.add({ novelId, title, order: count, wordCount: 0 });
    await reloadData(novelId);
    return id;
  };

  const deleteAct = async (id) => {
    const act = await db.acts.get(id);
    const chapters = await db.chapters.where('actId').equals(id).toArray();
    for (const ch of chapters) {
      await db.scenes.where('chapterId').equals(ch.id).delete();
    }
    await db.chapters.where('actId').equals(id).delete();
    await db.acts.delete(id);
    await reloadData(act.novelId);
  };

  const addChapter = async (actId, title) => {
    const act = await db.acts.get(actId);
    const count = await db.chapters.where('actId').equals(actId).count();
    const id = await db.chapters.add({ actId, title, order: count, number: count + 1, wordCount: 0 });
    await reloadData(act.novelId);
    return id;
  };

  const deleteChapter = async (id) => {
    const ch = await db.chapters.get(id);
    const act = await db.acts.get(ch.actId);
    await db.scenes.where('chapterId').equals(id).delete();
    await db.chapters.delete(id);
    await reloadData(act.novelId);
  };

  const addScene = async (chapterId, title) => {
    const ch = await db.chapters.get(chapterId);
    const act = await db.acts.get(ch.actId);
    const count = await db.scenes.where('chapterId').equals(chapterId).count();
    const id = await db.scenes.add({ chapterId, title, order: count, number: count + 1, status: 'Borrador', pov: '', wordCount: 0, content: '' });
    await reloadData(act.novelId);
    return id;
  };

  const deleteScene = async (id) => {
    const sc = await db.scenes.get(id);
    const ch = await db.chapters.get(sc.chapterId);
    const act = await db.acts.get(ch.actId);
    await db.scenes.delete(id);
    await reloadData(act.novelId);
  };

  const updateAct = async (id, data) => {
    await db.acts.update(id, data);
    if (activeNovel) reloadData(activeNovel.id);
  };

  const updateChapter = async (id, data) => {
    await db.chapters.update(id, data);
    if (activeNovel) reloadData(activeNovel.id);
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
  };

  const updateActOrder = async (novelId, actIds) => {
    await db.transaction('rw', db.acts, async () => {
      for (let i = 0; i < actIds.length; i++) {
        await db.acts.update(actIds[i], { order: i });
      }
    });
    await reloadData(novelId);
  };

  const updateChapterOrder = async (novelId, chapterIds) => {
    await db.transaction('rw', db.chapters, async () => {
      for (let i = 0; i < chapterIds.length; i++) {
        await db.chapters.update(chapterIds[i], { order: i });
      }
    });
    await reloadData(novelId);
  };

  const updateSceneOrder = async (novelId, sceneIds) => {
    await db.transaction('rw', db.scenes, async () => {
      for (let i = 0; i < sceneIds.length; i++) {
        await db.scenes.update(sceneIds[i], { order: i });
      }
    });
    await reloadData(novelId);
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
  };

  // ---- Compendium CRUD ----
  const addCompendiumEntry = async (table, data) => {
    if (!activeNovel) return;
    const id = await db[table].add({ ...data, novelId: activeNovel.id });
    await reloadData(activeNovel.id);
    return id;
  };

  const updateCompendiumEntry = async (table, id, data) => {
    if (!activeNovel) return;
    await db[table].update(id, data);
    await reloadData(activeNovel.id);
  };

  const deleteCompendiumEntry = async (table, id) => {
    if (!activeNovel) return;
    await db[table].delete(id);
    await reloadData(activeNovel.id);
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
    getStreak,
    addCompendiumEntry,
    updateCompendiumEntry,
    deleteCompendiumEntry,
  };

  return <NovelContext.Provider value={value}>{children}</NovelContext.Provider>;
};

export const useNovel = () => useContext(NovelContext);
