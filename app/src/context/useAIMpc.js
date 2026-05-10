/**
 * useAIMpc.js — Monitor de Propuestas del Compendio (MPC).
 * Encapsulates proposal state, drawer visibility, and the enabled toggle.
 * Extracted from AIContext to prevent MPC updates from triggering Oracle/Debate re-renders.
 *
 * @param {object} deps
 * @param {object|null} deps.activeNovel - current active novel from NovelContext
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToIgnoredNames } from '../services/mpcService'

export const MPC_COOLDOWN_MS = 15_000 // 15s between AI analysis calls

export function useAIMpc({ activeNovel }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [mpcStatus, setMpcStatus]           = useState('idle') // 'idle' | 'analyzing' | 'error'
  const [mpcProposals, setMpcProposals]     = useState([])
  const [isMpcDrawerOpen, setIsMpcDrawerOpen] = useState(false)
  const [isMpcEnabled, setIsMpcEnabled]     = useState(() => {
    const saved = localStorage.getItem('ai_mpc_enabled')
    return saved === null ? true : saved === 'true'
  })
  const mpcCooldownRef = useRef(null)

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('ai_mpc_enabled', isMpcEnabled ? 'true' : 'false')
  }, [isMpcEnabled])

  // Restore proposals from localStorage when active novel changes
  const activeNovelId = activeNovel?.id
  useEffect(() => {
    if (!activeNovelId) {
      setMpcProposals([])
      return
    }
    const savedStr = localStorage.getItem(`mpc_prop_${activeNovelId}`)
    if (savedStr) {
      try { setMpcProposals(JSON.parse(savedStr)) }
      catch { setMpcProposals([]) }
    } else {
      setMpcProposals([])
    }
  }, [activeNovelId])

  // Persist proposals when they change
  useEffect(() => {
    if (activeNovelId) {
      localStorage.setItem(`mpc_prop_${activeNovelId}`, JSON.stringify(mpcProposals))
    }
  }, [mpcProposals, activeNovelId])

  // ── Actions ────────────────────────────────────────────────────────────────

  const dismissMpcProposal = useCallback((proposalId) => {
    setMpcProposals(prev => prev.filter(p => p.id !== proposalId))
  }, [])

  const dismissMpcProposalPermanently = useCallback(async (proposal) => {
    if (!activeNovel) return
    const name = proposal.name || proposal.title || ''
    if (name) await addToIgnoredNames(activeNovel.id, name, proposal.type)
    setMpcProposals(prev => prev.filter(p => p.id !== proposal.id))
  }, [activeNovel])

  const acceptMpcProposal = useCallback((proposalId) => {
    setMpcProposals(prev => prev.filter(p => p.id !== proposalId))
  }, [])

  const clearMpcProposals = useCallback(() => {
    setMpcProposals([])
  }, [])

  const addMpcProposals = useCallback((newProposals) => {
    setMpcProposals(prev => {
      const existingNames = new Set(prev.map(p => (p.name || p.title || '').toLowerCase()))
      const filtered = newProposals.filter(p => {
        const n = (p.name || p.title || '').toLowerCase()
        return n && !existingNames.has(n)
      })
      return [...prev, ...filtered]
    })
  }, [])

  // ── Exports ────────────────────────────────────────────────────────────────
  return {
    mpcStatus, setMpcStatus,
    mpcProposals,
    isMpcDrawerOpen, setIsMpcDrawerOpen,
    isMpcEnabled, setIsMpcEnabled,
    mpcCooldownRef,
    MPC_COOLDOWN_MS,
    dismissMpcProposal,
    dismissMpcProposalPermanently,
    acceptMpcProposal,
    clearMpcProposals,
    addMpcProposals,
  }
}
