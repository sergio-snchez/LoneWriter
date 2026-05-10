/**
 * useCloudSync.js — Encapsulates all Google Drive cloud sync state and logic.
 * Extracted from NovelContext to isolate sync operations from novel data state.
 *
 * @param {object} deps
 * @param {object} deps.db - Dexie database instance (for full export)
 */
import { useState, useRef, useEffect } from 'react'
import { GoogleDriveService } from '../services/googleDriveService'

export function useCloudSync({ db }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState(
    localStorage.getItem('lw_cloud_sync') === 'true'
  )
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle') // 'idle' | 'syncing' | 'success' | 'error'
  const [lastCloudSync, setLastCloudSync] = useState(
    localStorage.getItem('lw_last_cloud_sync')
  )
  const [pendingSync, setPendingSync] = useState(false)
  const cloudCheckInProgress = useRef(false)

  // ── Actions ────────────────────────────────────────────────────────────────

  const checkCloudBackupStatus = async () => {
    if (cloudCheckInProgress.current) return
    cloudCheckInProgress.current = true

    try {
      if (!GoogleDriveService.isAuthenticated()) return

      const cloudFile = await GoogleDriveService.findBackupFile()
      if (cloudFile && cloudFile.modifiedTime) {
        const cloudDate = new Date(cloudFile.modifiedTime)
        const localSync = localStorage.getItem('lw_last_cloud_sync')
        const localDate = localSync ? new Date(localSync) : new Date(0)

        if (cloudDate > localDate) {
          await new Promise(resolve => setTimeout(resolve, 100))
          window.dispatchEvent(new CustomEvent('cloud-version-available', {
            detail: { date: cloudFile.modifiedTime, id: cloudFile.id }
          }))
        }
      }
    } catch (e) {
      console.warn('[useCloudSync] Error checking backup on startup')
    } finally {
      cloudCheckInProgress.current = false
    }
  }

  const performCloudSync = async () => {
    if (!isCloudSyncEnabled) return
    if (cloudCheckInProgress.current) return

    setCloudSyncStatus('syncing')
    cloudCheckInProgress.current = true

    try {
      // ── Safety check: don't overwrite a newer cloud backup ────────────────
      if (GoogleDriveService.isAuthenticated()) {
        const cloudFile = await GoogleDriveService.findBackupFile()
        if (cloudFile && cloudFile.modifiedTime) {
          const cloudDate = new Date(cloudFile.modifiedTime)
          const localSync = localStorage.getItem('lw_last_cloud_sync')
          const localSyncDate = localSync ? new Date(localSync) : new Date(0)
          const tolerance = 5000 // 5s

          if (cloudDate.getTime() > localSyncDate.getTime() + tolerance) {
            console.warn('[useCloudSync] Cloud has newer data — aborting upload to avoid overwrite.')
            setCloudSyncStatus('idle')
            setPendingSync(false)
            await new Promise(resolve => setTimeout(resolve, 100))
            window.dispatchEvent(new CustomEvent('cloud-version-available', {
              detail: { date: cloudFile.modifiedTime, id: cloudFile.id }
            }))
            return
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: {}
      }
      for (const table of db.tables) {
        data.tables[table.name] = await table.toArray()
      }

      await GoogleDriveService.saveBackup(data)

      const now = new Date().toISOString()
      setLastCloudSync(now)
      localStorage.setItem('lw_last_cloud_sync', now)
      setCloudSyncStatus('success')
      setPendingSync(false)

      setTimeout(() => setCloudSyncStatus('idle'), 5000)
    } catch (error) {
      console.error('[useCloudSync] Auto-sync error:', error)
      setCloudSyncStatus('error')
    } finally {
      cloudCheckInProgress.current = false
    }
  }

  const toggleCloudSync = (enabled) => {
    setIsCloudSyncEnabled(enabled)
    localStorage.setItem('lw_cloud_sync', enabled ? 'true' : 'false')
    if (enabled) setPendingSync(true) // Trigger initial sync
  }

  // ── Debounced Auto-Sync Effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!isCloudSyncEnabled || !pendingSync || cloudSyncStatus === 'syncing') return

    const timer = setTimeout(async () => {
      await performCloudSync()
    }, 30000) // 30s after last change

    return () => clearTimeout(timer)
  }, [pendingSync, isCloudSyncEnabled])

  // ── Exports ────────────────────────────────────────────────────────────────
  return {
    isCloudSyncEnabled,
    cloudSyncStatus,
    lastCloudSync,
    pendingSync,
    setPendingSync,
    toggleCloudSync,
    performCloudSync,
    checkCloudBackupStatus,
  }
}
