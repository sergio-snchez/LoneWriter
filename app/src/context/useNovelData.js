import { useState, useEffect, useCallback } from 'react'
import { db } from '../db/database'

/**
 * Hook that manages all loaded data state (novels, acts, compendium, nexus links, etc.)
 * and provides reload/refresh functions.
 *
 * Owns the following state: allNovels, activeNovel, activeScene, loading,
 * acts, characters, locations, objects, lore, resources, nexusLinks, expandedIds.
 */
export function useNovelData() {
  // ── Novel-level state ──────────────────────────────────────────────────────
  const [allNovels, setAllNovels] = useState([])
  const [activeNovel, setActiveNovel] = useState(null)
  const [activeScene, setActiveScene] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Loaded data state (populated by reloadData) ────────────────────────────
  const [acts, setActs] = useState([])
  const [characters, setCharacters] = useState([])
  const [locations, setLocations] = useState([])
  const [objects, setObjects] = useState([])
  const [lore, setLore] = useState([])
  const [resources, setResources] = useState([])
  const [nexusLinks, setNexusLinks] = useState([])
  const [expandedIds, setExpandedIds] = useState(new Set())

  // ── Initial seeding and loading ────────────────────────────────────────────
  useEffect(() => {
    const initializeDB = async () => {
      // One-time wipe of example content for existing users
      const hasWiped = localStorage.getItem('lw_v2_wiped')
      if (!hasWiped) {
        await db.transaction('rw', [
          db.novels, db.acts, db.chapters, db.scenes,
          db.characters, db.locations, db.objects, db.lore,
          db.resources, db.dailyProgress,
        ], async () => {
          await db.novels.clear()
          await db.acts.clear()
          await db.chapters.clear()
          await db.scenes.clear()
          await db.characters.clear()
          await db.locations.clear()
          await db.objects.clear()
          await db.lore.clear()
          await db.resources.clear()
          await db.dailyProgress.clear()
        })
        localStorage.setItem('lw_v2_wiped', 'true')
        localStorage.removeItem('activeNovelId')
        setActiveNovel(null)
        setActs([])
      }

      await refreshAllNovels()
      setLoading(false)
    }

    initializeDB()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Data loading helpers ───────────────────────────────────────────────────
  const refreshAllNovels = useCallback(async () => {
    const novels = await db.novels.toArray()
    const sorted = novels.sort((a, b) => new Date(b.lastEdited || 0) - new Date(a.lastEdited || 0))
    setAllNovels(sorted)
  }, [])

  const refreshAfterRestore = useCallback(async () => {
    await refreshAllNovels()
    setActiveNovel(null)
    setActiveScene(null)
    setActs([])
    setCharacters([])
    setLocations([])
    setObjects([])
    setLore([])
    setResources([])
    setNexusLinks([])
  }, [refreshAllNovels])

  const syncNovelWordCount = useCallback(async (novelId) => {
    const listActs = await db.acts.where('novelId').equals(novelId).toArray()
    let totalWords = 0
    for (const act of listActs) {
      const chapters = await db.chapters.where('actId').equals(act.id).toArray()
      let actWords = 0
      for (const ch of chapters) {
        const scenes = await db.scenes.where('chapterId').equals(ch.id).toArray()
        const chWords = scenes.reduce((acc, s) => acc + (s.wordCount || 0), 0)
        await db.chapters.update(ch.id, { wordCount: chWords })
        actWords += chWords
      }
      await db.acts.update(act.id, { wordCount: actWords })
      totalWords += actWords
    }
    await db.novels.update(novelId, { wordCount: totalWords })
    return totalWords
  }, [])

  const getNovelUIExpanded = useCallback(async (novelId) => {
    const novel = await db.novels.get(novelId)
    if (novel?.uiExpanded) {
      try {
        return new Set(JSON.parse(novel.uiExpanded))
      } catch {
        return new Set()
      }
    }
    return new Set()
  }, [])

  const updateNovelUIExpanded = useCallback(async (novelId, ids) => {
    const data = { uiExpanded: JSON.stringify([...ids]) }
    await db.novels.update(novelId, data)
    setActiveNovel(prev => (prev?.id === novelId ? { ...prev, ...data } : prev))
  }, [])

  /**
   * Full data reload for a given novel — acts, compendium, nexus, UI state.
   */
  const reloadData = useCallback(async (novelId) => {
    const listActs = await db.acts.where('novelId').equals(novelId).sortBy('order')
    for (const act of listActs) {
      act.chapters = await db.chapters.where('actId').equals(act.id).sortBy('order')
      for (const ch of act.chapters) {
        ch.scenes = await db.scenes.where('chapterId').equals(ch.id).sortBy('order')
      }
    }
    setActs(listActs)
    setCharacters(await db.characters.where('novelId').equals(novelId).toArray())
    setLocations(await db.locations.where('novelId').equals(novelId).toArray())
    setObjects(await db.objects.where('novelId').equals(novelId).toArray())
    setLore(await db.lore.where('novelId').equals(novelId).toArray())
    setResources(await db.resources.where('novelId').equals(novelId).toArray())
    setNexusLinks(await db.nexusLinks.where('novelId').equals(novelId).toArray())

    const savedExpanded = await getNovelUIExpanded(novelId)
    setExpandedIds(savedExpanded)

    const updatedNovel = await db.novels.get(novelId)
    setActiveNovel(updatedNovel)
  }, [getNovelUIExpanded])

  // ── Global navigation listener ────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalNavigate = (e) => {
      const { sceneId } = e.detail
      if (!sceneId || acts.length === 0) return

      const allS = acts.flatMap(a => (a.chapters || []).flatMap(c => c.scenes || []))
      const targetScene = allS.find(s => String(s.id) === String(sceneId))

      if (targetScene) {
        let actId = null
        let chId = null
        for (const act of acts) {
          for (const ch of act.chapters || []) {
            if (ch.scenes?.some(s => String(s.id) === String(sceneId))) {
              actId = act.id
              chId = ch.id
              break
            }
          }
          if (actId) break
        }

        if (actId && chId) {
          setExpandedIds(prev => new Set([...prev, `act-${actId}`, `ch-${chId}`]))
        }

        setActiveScene(targetScene)
      }
    }

    window.addEventListener('navigate-to-scene', handleGlobalNavigate)
    return () => window.removeEventListener('navigate-to-scene', handleGlobalNavigate)
  }, [acts])

  // ── Persist expanded IDs when they change ─────────────────────────────────
  useEffect(() => {
    if (!activeNovel?.id) return
    const timer = setTimeout(() => {
      updateNovelUIExpanded(activeNovel.id, expandedIds)
    }, 1000)
    return () => clearTimeout(timer)
  }, [expandedIds, activeNovel?.id, updateNovelUIExpanded])

  return {
    // State
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
    // Functions
    reloadData,
    refreshAllNovels,
    refreshAfterRestore,
    syncNovelWordCount,
    getNovelUIExpanded,
    updateNovelUIExpanded,
  }
}
