/**
 * useAIUsage.js — AI usage statistics tracking (tokens + requests per day).
 * Extracted from AIContext to isolate DB read/write from active AI interactions.
 *
 * @param {object} deps
 * @param {object} deps.db - Dexie database instance
 * @param {string} deps.provider - active AI provider key
 * @param {string} deps.currentModel - active model identifier
 */
import { useState, useEffect, useCallback } from 'react'

export function useAIUsage({ db, provider, currentModel }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [usageStats, setUsageStats] = useState({ tokens: 0, requests: 0 })

  // ── Actions ────────────────────────────────────────────────────────────────

  const refreshUsage = useCallback(async () => {
    if (!provider || !currentModel) return
    const today = new Date().toISOString().split('T')[0]
    try {
      const entry = await db.aiUsage
        .where('[date+provider+model]')
        .equals([today, provider, currentModel])
        .first()
      setUsageStats(entry || { tokens: 0, requests: 0 })
    } catch (err) {
      console.error('[useAIUsage] Error loading usage stats:', err)
    }
  }, [provider, currentModel])

  useEffect(() => { refreshUsage() }, [refreshUsage])

  const logAIUsage = useCallback(async (usage) => {
    if (!usage) return
    const today = new Date().toISOString().split('T')[0]
    try {
      await db.transaction('rw', db.aiUsage, async () => {
        let entry = await db.aiUsage
          .where('[date+provider+model]')
          .equals([today, provider, currentModel])
          .first()
        if (entry) {
          await db.aiUsage.update(entry.id, {
            tokens:   (entry.tokens   || 0) + (usage.total_tokens || 0),
            requests: (entry.requests || 0) + 1,
          })
        } else {
          await db.aiUsage.add({
            date: today,
            provider,
            model:    currentModel,
            tokens:   usage.total_tokens || 0,
            requests: 1,
          })
        }
      })
      refreshUsage()
    } catch (err) {
      console.error('[useAIUsage] Error logging usage:', err)
    }
  }, [provider, currentModel, refreshUsage])

  // ── Exports ────────────────────────────────────────────────────────────────
  return { usageStats, logAIUsage, refreshUsage }
}
