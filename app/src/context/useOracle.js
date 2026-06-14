import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createDebouncedEntityDetector, parseOracleResponse } from '../services'
import { db } from '../db/database'
import i18n from '../i18n/i18n'

export function useOracle({ activeNovel, activeScene }) {
  const [oracleText, setOracleText] = useState('')
  const [oracleHistory, setOracleHistory] = useState([])
  const [oracleStatus, setOracleStatus] = useState({
    status: 'idle',
    detectedEntities: [],
    lastContradiction: null,
  })
  const entityDetectorRef = useRef(createDebouncedEntityDetector(() => {}, 2000))

  // Entity detection + traffic light status (only current paragraph/selection)
  useEffect(() => {
    if (!activeNovel || !oracleText) {
      setOracleStatus({ status: 'idle', detectedEntities: [], lastContradiction: null })
      entityDetectorRef.current.cancel()
      return
    }

    const plainText = oracleText.trim()
    if (plainText.length < 3) {
      setOracleStatus({ status: 'idle', detectedEntities: [], lastContradiction: null })
      return
    }

    entityDetectorRef.current.immediate(plainText, activeNovel.id, i18n.language)
      .then(({ entityData, detections }) => {
        const criticalDetections = detections.filter(d => d.severity === 'critical')
        const doubtfulDetections = detections.filter(d => d.severity === 'doubtful')

        if (criticalDetections.length > 0) {
          setOracleStatus(prev => ({ ...prev, status: 'suspicious', detectedEntities: criticalDetections }))
        } else if (doubtfulDetections.length >= 2) {
          setOracleStatus(prev => ({ ...prev, status: 'suspicious', detectedEntities: doubtfulDetections }))
        } else {
          setOracleStatus(prev => ({ ...prev, status: 'idle', detectedEntities: [] }))
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('[LoneWriter] Entity detection error:', err)
        }
      })
  }, [activeNovel, oracleText, activeScene?.id])

  const forceEntityRecheck = useCallback(() => {
    if (!activeNovel || !oracleText) return
    const plainText = oracleText.trim()
    if (plainText.length < 3) return
    entityDetectorRef.current.immediate(plainText, activeNovel.id, i18n.language)
      .then(({ detections }) => {
        const criticalDetections = detections.filter(d => d.severity === 'critical')
        const doubtfulDetections = detections.filter(d => d.severity === 'doubtful')
        if (criticalDetections.length > 0) {
          setOracleStatus(prev => ({ ...prev, status: 'suspicious', detectedEntities: criticalDetections }))
        } else if (doubtfulDetections.length >= 2) {
          setOracleStatus(prev => ({ ...prev, status: 'suspicious', detectedEntities: doubtfulDetections }))
        } else {
          setOracleStatus(prev => ({ ...prev, status: 'idle', detectedEntities: [] }))
        }
      })
  }, [activeNovel, oracleText])

  const markOracleContradiction = (message) => {
    setOracleStatus(prev => ({ ...prev, status: 'error', lastContradiction: message }))
  }

  const resetOracleStatus = () => {
    setOracleStatus({ status: 'idle', detectedEntities: [], lastContradiction: null })
  }

  const checkOracleResponse = (aiResponse) => {
    const result = parseOracleResponse(aiResponse)
    if (result.hasContradiction) {
      markOracleContradiction(result.message)
    } else {
      setOracleStatus(prev => ({ ...prev, status: 'success', lastContradiction: null }))
    }
    return result
  }

  const addOracleEntry = async (entry) => {
    if (!activeNovel) return
    const newEntry = {
      ...entry,
      id: undefined,
      novelId: activeNovel.id,
      sceneId: entry.sceneId || null,
      createdAt: new Date().toISOString(),
      isCorrected: entry.hasContradiction === false,
    }
    const id = await db.oracleEntries.add(newEntry)
    newEntry.id = id
    setOracleHistory(prev => [...prev, newEntry])
  }

  const clearOracleHistory = async () => {
    if (!activeNovel) return
    await db.oracleEntries.where('novelId').equals(activeNovel.id).delete()
    setOracleHistory([])
  }

  const deleteOracleEntry = async (entryId) => {
    if (!activeNovel) return
    await db.oracleEntries.delete(entryId)
    setOracleHistory(prev => prev.filter(e => e.id !== entryId))
  }

  const toggleOracleCorrected = async (entryId) => {
    if (!activeNovel) return
    const entry = oracleHistory.find(e => e.id === entryId)
    if (!entry) return
    const newCorrectedState = !entry.isCorrected
    await db.oracleEntries.update(entryId, { isCorrected: newCorrectedState })
    setOracleHistory(prev => prev.map(e => e.id === entryId ? { ...e, isCorrected: newCorrectedState } : e))
  }

  const checkedEntries = new Set(oracleHistory.filter(e => e.isCorrected).map(e => e.id))

  return useMemo(() => ({
    oracleText, setOracleText,
    oracleStatus, oracleHistory,
    forceEntityRecheck,
    checkOracleResponse, resetOracleStatus, markOracleContradiction,
    addOracleEntry, clearOracleHistory, deleteOracleEntry, toggleOracleCorrected, checkedEntries,
  }), [
    oracleText, oracleStatus, oracleHistory, checkedEntries,
    setOracleText, forceEntityRecheck,
    checkOracleResponse, resetOracleStatus, markOracleContradiction,
    addOracleEntry, clearOracleHistory, deleteOracleEntry, toggleOracleCorrected,
  ])
}
