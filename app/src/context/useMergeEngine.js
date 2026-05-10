/**
 * useMergeEngine.js — Encapsulates all Compendium Merge state and logic.
 * Extracted from NovelContext to prevent merge operations from triggering
 * re-renders across the entire novel data tree.
 *
 * @param {object} deps - Data and CRUD functions needed by merge operations
 * @param {Array}  deps.characters
 * @param {Array}  deps.locations
 * @param {Array}  deps.objects
 * @param {Array}  deps.lore
 * @param {Function} deps.addCompendiumEntry
 * @param {Function} deps.deleteCompendiumEntry
 */
import { useState } from 'react'
import { findSimilarEntities } from '../services/entityDetector'
import { AIService } from '../services/aiService'

export function useMergeEngine({ characters, locations, objects, lore, addCompendiumEntry, deleteCompendiumEntry }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [mergeGroups, setMergeGroups] = useState([])
  const [selectedMerge, setSelectedMerge] = useState(null)
  const [mergeResult, setMergeResult] = useState(null)
  const [isMerging, setIsMerging] = useState(false)
  const [mergingEntitiesIds, setMergingEntitiesIds] = useState([])
  const [isScanningMerge, setIsScanningMerge] = useState(false)
  const [selectedMergeIdx, setSelectedMergeIdx] = useState(0)
  const [showMergeOverlay, setShowMergeOverlay] = useState(false)
  const [isMergeOverlayClosing, setIsMergeOverlayClosing] = useState(false)
  const [mergeSection, setMergeSection] = useState('characters')

  // ── Actions ────────────────────────────────────────────────────────────────

  const scanForMergeDuplicates = async (activeSection, config = {}) => {
    let items = []
    setMergeSection(activeSection)
    if (activeSection === 'characters') items = characters
    else if (activeSection === 'locations') items = locations
    else if (activeSection === 'objects') items = objects
    else if (activeSection === 'lore') items = lore

    if (items.length < 2) return

    setIsScanningMerge(true)
    setMergeGroups([])
    setSelectedMerge(null)
    setMergeResult(null)

    try {
      const result = await findSimilarEntities(items, 0.70)
      setMergeGroups(result.groups || [])
      setShowMergeOverlay(true)
    } catch (err) {
      console.error('[useMergeEngine] Scan error:', err)
      throw err
    } finally {
      setIsScanningMerge(false)
    }
  }

  const handleMergeSelection = async (entities, activeSection, aiConfig, logAIUsage) => {
    if (entities.length < 2) return

    setIsMerging(true)
    setMergingEntitiesIds(entities.map(e => e.id))
    setMergeResult(null)

    try {
      const result = await AIService.fuseMultipleEntities(entities, activeSection, aiConfig)
      if (logAIUsage) logAIUsage(result.usage)

      const nameField = activeSection === 'lore' ? 'title' : 'name'
      const candidate = {
        entity1: entities[0],
        entity2: entities[1],
        _allEntities: entities,
        name1: entities[0][nameField],
        name2: entities[1][nameField]
      }

      setSelectedMerge(candidate)
      setMergeResult(result.data)
    } catch (err) {
      console.error('[useMergeEngine] Merge error:', err)
      throw err
    } finally {
      setIsMerging(false)
    }
  }

  const confirmMerge = async (activeSection, finalData = null) => {
    if (!mergeResult || !selectedMerge) return

    try {
      const table = activeSection
      const data = finalData || { ...mergeResult }

      // CRITICAL: Remove any ID to prevent IndexedDB key errors
      delete data.id

      // Normalize name/title
      if (table === 'lore' && data.name && !data.title) {
        data.title = data.name
        delete data.name
      } else if (table !== 'lore' && data.title && !data.name) {
        data.name = data.title
        delete data.title
      }

      if (table === 'characters') {
        data.name = data.name || 'Nuevo personaje'
        data.initials = data.initials || (data.name || '').substring(0, 2).toUpperCase()
        data.color = data.color || '#6b9fd4'
      } else if (table === 'locations') {
        data.name = data.name || 'Nueva localización'
        data.color = data.color || '#6b9fd4'
      } else if (table === 'objects') {
        data.name = data.name || 'Nuevo objeto'
      } else if (table === 'lore') {
        data.title = data.title || 'Nueva entrada de lore'
      }

      if (selectedMerge._allEntities) {
        for (const e of selectedMerge._allEntities) {
          await deleteCompendiumEntry(table, e.id)
        }
      } else {
        await deleteCompendiumEntry(table, selectedMerge.entity1.id)
        await deleteCompendiumEntry(table, selectedMerge.entity2.id)
      }

      await addCompendiumEntry(table, data)

      const mergedIds = new Set(selectedMerge._allEntities.map(e => e.id))
      setMergeGroups(prev => prev.filter(g => !g.entities.some(e => mergedIds.has(e.id))))

      setSelectedMerge(null)
      setMergingEntitiesIds([])
      setMergeResult(null)
    } catch (err) {
      console.error('[useMergeEngine] Confirm error:', err)
      throw err
    }
  }

  const skipMerge = () => {
    setSelectedMerge(null)
    setMergingEntitiesIds([])
    setMergeResult(null)
  }

  const closeMergeOverlay = () => {
    setIsMergeOverlayClosing(true)
    setTimeout(() => {
      setShowMergeOverlay(false)
      setIsMergeOverlayClosing(false)
      if (!isMerging && !mergeResult) {
        setMergeGroups([])
        setSelectedMerge(null)
        setMergingEntitiesIds([])
        setSelectedMergeIdx(0)
      }
    }, 220)
  }

  // ── Exports ────────────────────────────────────────────────────────────────
  return {
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
  }
}
