import { useCallback } from 'react'
import i18n from '../i18n/i18n'
import { db } from '../db/database'
import { deleteVectorsForScene, deleteVectorsForNovel, indexPendingScenes } from '../services'

/**
 * Hook that provides all CRUD operations for novels, acts, chapters,
 * scenes, and compendium entries.
 */
export function useNovelCrud({
  activeNovel,
  setActiveNovel,
  setActiveScene,
  reloadData,
  refreshAllNovels,
  syncNovelWordCount,
  trackDailyProgress,
  setPendingSync,
}) {
  // ── Novel CRUD ─────────────────────────────────────────────────────────────
  const switchNovel = useCallback(async (id) => {
    const novel = await db.novels.get(id)
    if (novel) {
      const realWords = await syncNovelWordCount(id)
      await reloadData(id)
      setActiveNovel({ ...novel, wordCount: realWords })
      setActiveScene(null)
      localStorage.setItem('activeNovelId', id)
      indexPendingScenes(id)
    }
  }, [syncNovelWordCount, reloadData, setActiveNovel, setActiveScene])

  const createNovel = useCallback(async (title) => {
    try {
      const novelId = await db.novels.add({
        title,
        author: i18n.t('app:autor_defecto'),
        status: 'Borrador',
        wordCount: 0,
        targetWords: 100000,
        targetScenes: 60,
        lastEdited: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })

      const actId = await db.acts.add({
        novelId,
        title: i18n.t('editor:acto_inicial'),
        order: 0,
        wordCount: 0,
      })

      const chapterId = await db.chapters.add({
        actId,
        title: i18n.t('editor:nuevo.capitulo_placeholder'),
        order: 0,
        number: 1,
        wordCount: 0,
      })

      const welcomeText = i18n.t('editor:bienvenida.texto')
      const welcomeHtml = welcomeText.split('\n\n').map(p => `<p>${p}</p>`).join('')
      const words = welcomeText.trim().split(/\s+/).length

      const sceneId = await db.scenes.add({
        chapterId,
        title: i18n.t('editor:nuevo.escena_placeholder'),
        order: 0,
        number: 1,
        status: 'Sin comenzar',
        pov: '',
        inGameDate: '',
        wordCount: words,
        content: welcomeHtml,
      })

      await db.chapters.update(chapterId, { wordCount: words })
      await db.acts.update(actId, { wordCount: words })
      await db.novels.update(novelId, { wordCount: words })

      const expanded = new Set([`act-${actId}`, `ch-${chapterId}`])
      await db.novels.update(novelId, { uiExpanded: JSON.stringify([...expanded]) })

      await refreshAllNovels()
      await switchNovel(novelId)

      const scene = await db.scenes.get(sceneId)
      if (scene) setActiveScene(scene)

      setPendingSync(true)
    } catch (error) {
      console.error('[LoneWriter] Error creating novel:', error)
    }
  }, [refreshAllNovels, switchNovel, setActiveScene, setPendingSync])

  const deleteNovel = useCallback(async (id) => {
    await db.transaction('rw', [
      db.novels, db.acts, db.chapters, db.scenes,
      db.characters, db.locations, db.objects, db.lore,
      db.resources, db.dailyProgress, db.debateAgents, db.debateSessions,
      db.oracleEntries, db.lastRewrite, db.mpcIgnored, db.nexusLinks,
    ], async () => {
      const actsToDelete = await db.acts.where('novelId').equals(id).toArray()
      for (const act of actsToDelete) {
        const chapters = await db.chapters.where('actId').equals(act.id).toArray()
        for (const ch of chapters) {
          await db.scenes.where('chapterId').equals(ch.id).delete()
        }
        await db.chapters.where('actId').equals(act.id).delete()
      }
      await db.acts.where('novelId').equals(id).delete()
      await db.characters.where('novelId').equals(id).delete()
      await db.locations.where('novelId').equals(id).delete()
      await db.objects.where('novelId').equals(id).delete()
      await db.lore.where('novelId').equals(id).delete()
      await db.resources.where('novelId').equals(id).delete()
      await db.dailyProgress.where('novelId').equals(id).delete()
      await db.nexusLinks.where('novelId').equals(id).delete()
      await db.debateAgents.where('novelId').equals(id).delete()
      await db.debateSessions.where('novelId').equals(id).delete()
      await db.oracleEntries.where('novelId').equals(id).delete()
      await db.lastRewrite.where('novelId').equals(id).delete()
      await db.mpcIgnored.where('novelId').equals(id).delete()
      await db.novels.delete(id)
    })
    await deleteVectorsForNovel(id)
    await refreshAllNovels()
    if (activeNovel?.id === id) {
      setActiveNovel(null)
      setActiveScene(null)
    }
    setPendingSync(true)
  }, [activeNovel, refreshAllNovels, setActiveNovel, setActiveScene, setPendingSync])

  const updateNovel = useCallback(async (novelId, data) => {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
    if (Object.keys(cleanData).length === 0) return

    await db.novels.update(novelId, cleanData)
    await refreshAllNovels()
    if (activeNovel?.id === novelId) {
      setActiveNovel(prev => ({ ...prev, ...cleanData }))
    }
    setPendingSync(true)
  }, [activeNovel, refreshAllNovels, setActiveNovel, setPendingSync])

  const updateNovelTarget = useCallback(async (novelId, targetWords, targetScenes) => {
    await updateNovel(novelId, { targetWords, targetScenes })
  }, [updateNovel])

  // ── Acts / Chapters / Scenes CRUD ─────────────────────────────────────────
  const addAct = useCallback(async (novelId, title) => {
    const count = await db.acts.where('novelId').equals(novelId).count()
    const id = await db.acts.add({ novelId, title, order: count, wordCount: 0 })
    await reloadData(novelId)
    setPendingSync(true)
    return id
  }, [reloadData, setPendingSync])

  const deleteAct = useCallback(async (id) => {
    const act = await db.acts.get(id)
    const chapters = await db.chapters.where('actId').equals(id).toArray()
    for (const ch of chapters) {
      const scenes = await db.scenes.where('chapterId').equals(ch.id).toArray()
      for (const sc of scenes) {
        await deleteVectorsForScene(sc.id)
      }
      await db.scenes.where('chapterId').equals(ch.id).delete()
    }
    await db.chapters.where('actId').equals(id).delete()
    await db.acts.delete(id)
    await reloadData(act.novelId)
    setPendingSync(true)
  }, [reloadData, setPendingSync])

  const addChapter = useCallback(async (actId, title) => {
    const act = await db.acts.get(actId)
    const count = await db.chapters.where('actId').equals(actId).count()
    const id = await db.chapters.add({ actId, title, order: count, number: count + 1, wordCount: 0 })
    await reloadData(act.novelId)
    setPendingSync(true)
    return id
  }, [reloadData, setPendingSync])

  const deleteChapter = useCallback(async (id) => {
    const ch = await db.chapters.get(id)
    const act = await db.acts.get(ch.actId)
    const scenes = await db.scenes.where('chapterId').equals(id).toArray()
    for (const sc of scenes) {
      await deleteVectorsForScene(sc.id)
    }
    await db.scenes.where('chapterId').equals(id).delete()
    await db.chapters.delete(id)
    await reloadData(act.novelId)
    setPendingSync(true)
  }, [reloadData, setPendingSync])

  const addScene = useCallback(async (chapterId, title) => {
    const ch = await db.chapters.get(chapterId)
    const act = await db.acts.get(ch.actId)
    const count = await db.scenes.where('chapterId').equals(chapterId).count()
    const id = await db.scenes.add({
      chapterId, title, order: count, number: count + 1,
      status: 'Sin comenzar', pov: '', inGameDate: '',
      wordCount: 0, content: '',
    })
    await reloadData(act.novelId)
    setPendingSync(true)
    return id
  }, [reloadData, setPendingSync])

  const deleteScene = useCallback(async (id) => {
    const sc = await db.scenes.get(id)
    const ch = await db.chapters.get(sc.chapterId)
    const act = await db.acts.get(ch.actId)
    await db.scenes.delete(id)
    await deleteVectorsForScene(id)
    await reloadData(act.novelId)
    setPendingSync(true)
  }, [reloadData, setPendingSync])

  const updateAct = useCallback(async (id, data) => {
    await db.acts.update(id, data)
    if (activeNovel) reloadData(activeNovel.id)
    setPendingSync(true)
  }, [activeNovel, reloadData, setPendingSync])

  const updateChapter = useCallback(async (id, data) => {
    await db.chapters.update(id, data)
    if (activeNovel) reloadData(activeNovel.id)
    setPendingSync(true)
  }, [activeNovel, reloadData, setPendingSync])

  const updateScene = useCallback(async (id, data) => {
    const oldScene = await db.scenes.get(id)
    await db.scenes.update(id, data)

    if (data.wordCount !== undefined && activeNovel) {
      const diff = data.wordCount - (oldScene.wordCount || 0)
      if (diff !== 0) {
        const newTotal = (activeNovel.wordCount || 0) + diff
        await db.novels.update(activeNovel.id, {
          wordCount: Math.max(0, newTotal),
          lastEdited: new Date().toISOString(),
        })
        await trackDailyProgress(activeNovel.id, diff)
      } else {
        await db.novels.update(activeNovel.id, {
          lastEdited: new Date().toISOString(),
        })
      }
    }

    if (activeNovel) reloadData(activeNovel.id)
    setPendingSync(true)
  }, [activeNovel, reloadData, trackDailyProgress, setPendingSync])

  // ── Ordering ───────────────────────────────────────────────────────────────
  const updateActOrder = useCallback(async (novelId, actIds) => {
    await db.transaction('rw', db.acts, async () => {
      for (let i = 0; i < actIds.length; i++) {
        await db.acts.update(actIds[i], { order: i })
      }
    })
    await reloadData(novelId)
    setPendingSync(true)
  }, [reloadData, setPendingSync])

  const updateChapterOrder = useCallback(async (novelId, chapterIds) => {
    await db.transaction('rw', db.chapters, async () => {
      for (let i = 0; i < chapterIds.length; i++) {
        await db.chapters.update(chapterIds[i], { order: i })
      }
    })
    await reloadData(novelId)
    setPendingSync(true)
  }, [reloadData, setPendingSync])

  const updateSceneOrder = useCallback(async (novelId, sceneIds) => {
    await db.transaction('rw', db.scenes, async () => {
      for (let i = 0; i < sceneIds.length; i++) {
        await db.scenes.update(sceneIds[i], { order: i })
      }
    })
    await reloadData(novelId)
    setPendingSync(true)
  }, [reloadData, setPendingSync])

  // ── Move operations ────────────────────────────────────────────────────────
  const moveScene = useCallback(async (sceneId, targetChapterId, newOrderIds) => {
    await db.transaction('rw', db.scenes, async () => {
      await db.scenes.update(sceneId, { chapterId: targetChapterId })
      for (let i = 0; i < newOrderIds.length; i++) {
        await db.scenes.update(newOrderIds[i], { order: i })
      }
    })
    if (activeNovel) await reloadData(activeNovel.id)
    setPendingSync(true)
  }, [activeNovel, reloadData, setPendingSync])

  const moveChapter = useCallback(async (chapterId, targetActId, newOrderIds) => {
    await db.transaction('rw', db.chapters, async () => {
      await db.chapters.update(chapterId, { actId: targetActId })
      for (let i = 0; i < newOrderIds.length; i++) {
        await db.chapters.update(newOrderIds[i], { order: i })
      }
    })
    if (activeNovel) await reloadData(activeNovel.id)
    setPendingSync(true)
  }, [activeNovel, reloadData, setPendingSync])

  // ── Compendium CRUD ────────────────────────────────────────────────────────
  const addCompendiumEntry = useCallback(async (table, data) => {
    if (!activeNovel) return
    const id = await db[table].add({ ...data, novelId: activeNovel.id })
    await reloadData(activeNovel.id)
    setPendingSync(true)
    return id
  }, [activeNovel, reloadData, setPendingSync])

  const updateCompendiumEntry = useCallback(async (table, id, data) => {
    if (!activeNovel) return
    await db[table].update(id, data)
    await reloadData(activeNovel.id)
    setPendingSync(true)
  }, [activeNovel, reloadData, setPendingSync])

  const deleteCompendiumEntry = useCallback(async (table, id) => {
    if (!activeNovel) return
    await db[table].delete(id)
    await reloadData(activeNovel.id)
    setPendingSync(true)
  }, [activeNovel, reloadData, setPendingSync])

  return {
    createNovel,
    deleteNovel,
    switchNovel,
    updateNovel,
    updateNovelTarget,
    addAct,
    deleteAct,
    updateAct,
    addChapter,
    deleteChapter,
    updateChapter,
    addScene,
    deleteScene,
    updateScene,
    updateActOrder,
    updateChapterOrder,
    updateSceneOrder,
    moveScene,
    moveChapter,
    addCompendiumEntry,
    updateCompendiumEntry,
    deleteCompendiumEntry,
  }
}
