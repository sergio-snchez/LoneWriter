import { useCallback, useEffect, useRef } from 'react'
import { db } from '../../db/database'
import { extractCandidates, analyzeWithAI, loadRegisteredEntityNames, loadIgnoredNames } from '../../services'

export function useEditorMpc({
  activeNovel,
  activeScene,
  isMpcEnabled,
  apiKey,
  provider,
  currentModel,
  localBaseUrl,
  mpcCooldownRef,
  MPC_COOLDOWN_MS,
  mpcStatus,
  setMpcStatus,
  addMpcProposals,
  logAIUsage,
}) {
  const mpcDebounceRef = useRef(null)

  const triggerMpcAnalysis = useCallback((html) => {
    if (!isMpcEnabled) return
    if (!apiKey && provider !== 'local') return
    if (!activeNovel) return

    if (mpcDebounceRef.current) clearTimeout(mpcDebounceRef.current)

    mpcDebounceRef.current = setTimeout(async () => {
      const now = Date.now()
      if (mpcCooldownRef.current && (now - mpcCooldownRef.current) < MPC_COOLDOWN_MS) return

      const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (plainText.length < 20) return

      const [registeredNames, ignoredNames] = await Promise.all([
        loadRegisteredEntityNames(activeNovel.id),
        loadIgnoredNames(activeNovel.id),
      ])
      const candidates = extractCandidates(plainText, registeredNames, ignoredNames)
      if (candidates.length === 0) return

      setMpcStatus('analyzing')
      mpcCooldownRef.current = now

      try {
        const aiConfig = { provider, apiKey, model: currentModel, localBaseUrl }
        const [chars, locs, objs, loreEntries] = await Promise.all([
          db.characters.where('novelId').equals(activeNovel.id).toArray(),
          db.locations.where('novelId').equals(activeNovel.id).toArray(),
          db.objects.where('novelId').equals(activeNovel.id).toArray(),
          db.lore.where('novelId').equals(activeNovel.id).toArray(),
        ])
        const compendiumByType = {
          characters: chars.map(c => c.name).filter(Boolean),
          locations: locs.map(l => l.name).filter(Boolean),
          objects: objs.map(o => o.name).filter(Boolean),
          lore: loreEntries.map(l => l.title).filter(Boolean),
        }

        const { proposals, usage } = await analyzeWithAI(candidates, plainText, registeredNames, ignoredNames, aiConfig, 5, compendiumByType)
        logAIUsage(usage)
        if (proposals.length > 0) addMpcProposals(proposals)
      } catch (err) {
        // Silently fail — MPC is best-effort
      } finally {
        setMpcStatus('idle')
      }
    }, 2000)
  }, [activeNovel, apiKey, provider, currentModel, localBaseUrl, mpcCooldownRef, MPC_COOLDOWN_MS, setMpcStatus, addMpcProposals, isMpcEnabled, logAIUsage])

  const handleManualMpcScan = useCallback(async () => {
    if (mpcStatus === 'analyzing') return
    if (!activeScene?.content) return
    if (!activeNovel?.id) return

    const html = activeScene.content
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (plainText.length < 10) return

    setMpcStatus('analyzing')
    try {
      const [registeredNames, ignoredNames] = await Promise.all([
        loadRegisteredEntityNames(activeNovel.id),
        loadIgnoredNames(activeNovel.id),
      ])
      const candidates = extractCandidates(plainText, registeredNames, ignoredNames)
      if (candidates.length === 0) { setMpcStatus('idle'); return }

      const [chars, locs, objs, loreEntries] = await Promise.all([
        db.characters.where('novelId').equals(activeNovel.id).toArray(),
        db.locations.where('novelId').equals(activeNovel.id).toArray(),
        db.objects.where('novelId').equals(activeNovel.id).toArray(),
        db.lore.where('novelId').equals(activeNovel.id).toArray(),
      ])
      const compendiumByType = {
        characters: chars.map(c => c.name).filter(Boolean),
        locations: locs.map(l => l.name).filter(Boolean),
        objects: objs.map(o => o.name).filter(Boolean),
        lore: loreEntries.map(l => l.title).filter(Boolean),
      }

      const { proposals, usage } = await analyzeWithAI(candidates, plainText, registeredNames, ignoredNames, { provider, apiKey, model: currentModel, localBaseUrl }, 8, compendiumByType)
      logAIUsage(usage)
      if (proposals.length > 0) addMpcProposals(proposals)
    } catch (err) {
      console.error('[MPC] Error in handleManualMpcScan:', err)
    } finally {
      setMpcStatus('idle')
    }
  }, [activeScene, activeNovel, apiKey, provider, currentModel, localBaseUrl, mpcStatus, setMpcStatus, addMpcProposals, logAIUsage])

  // MPC manual scan listener
  useEffect(() => {
    const handler = () => {
      if (!activeScene || !activeNovel || mpcStatus === 'analyzing') return
      handleManualMpcScan()
    }
    window.addEventListener('mpc-manual-scan', handler)
    return () => window.removeEventListener('mpc-manual-scan', handler)
  }, [activeScene, activeNovel, mpcStatus, handleManualMpcScan])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (mpcDebounceRef.current) clearTimeout(mpcDebounceRef.current)
    }
  }, [])

  return { triggerMpcAnalysis, handleManualMpcScan }
}
