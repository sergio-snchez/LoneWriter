import { useCallback } from 'react'
import { db } from '../db/database'

export function useNovelProgress() {
  const trackDailyProgress = useCallback(async (novelId, wordsDiff) => {
    if (wordsDiff === 0) return
    const today = new Date().toISOString().split('T')[0]
    const entry = await db.dailyProgress.where({ novelId, date: today }).first()
    if (entry) {
      await db.dailyProgress.update(entry.id, { wordsWritten: entry.wordsWritten + wordsDiff })
    } else {
      await db.dailyProgress.add({ novelId, date: today, wordsWritten: Math.max(0, wordsDiff) })
    }
  }, [])

  const getStreak = useCallback(async (novelId) => {
    const history = await db.dailyProgress.where('novelId').equals(novelId).sortBy('date')
    if (history.length === 0) return 0
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    let checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)
    for (const entry of sorted) {
      const entryDate = new Date(entry.date)
      entryDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((checkDate - entryDate) / (1000 * 60 * 60 * 24))
      if (diffDays === 0) {
        if (entry.wordsWritten > 0) streak++
      } else if (diffDays === 1) {
        if (entry.wordsWritten > 0) { streak++; checkDate = entryDate } else break
      } else break
    }
    return streak
  }, [])

  return { trackDailyProgress, getStreak }
}
