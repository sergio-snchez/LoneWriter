import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCloudSync } from './useCloudSync'

const mockIsAuthenticated = vi.fn()
const mockFindBackupFile = vi.fn()
const mockSaveBackup = vi.fn()
vi.mock('../services', () => ({
  GoogleDriveService: {
    isAuthenticated: (...args) => mockIsAuthenticated(...args),
    findBackupFile: (...args) => mockFindBackupFile(...args),
    saveBackup: (...args) => mockSaveBackup(...args),
  },
}))

const mockToArray = vi.fn()
const mockDb = {
  tables: [
    { name: 'novels', toArray: () => mockToArray() },
    { name: 'acts', toArray: () => mockToArray() },
  ],
}

describe('useCloudSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockIsAuthenticated.mockReturnValue(false)
    mockFindBackupFile.mockResolvedValue(null)
    mockSaveBackup.mockResolvedValue(undefined)
    mockToArray.mockResolvedValue([])
  })

  it('starts with sync disabled when localStorage is not set', () => {
    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    expect(result.current.isCloudSyncEnabled).toBe(false)
    expect(result.current.cloudSyncStatus).toBe('idle')
    expect(result.current.pendingSync).toBe(false)
  })

  it('reads sync enabled state from localStorage', () => {
    localStorage.setItem('lw_cloud_sync', 'true')
    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    expect(result.current.isCloudSyncEnabled).toBe(true)
  })

  it('toggleCloudSync enables sync and sets pending', () => {
    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    act(() => result.current.toggleCloudSync(true))
    expect(result.current.isCloudSyncEnabled).toBe(true)
    expect(result.current.pendingSync).toBe(true)
    expect(localStorage.getItem('lw_cloud_sync')).toBe('true')
  })

  it('toggleCloudSync disables sync', () => {
    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    act(() => result.current.toggleCloudSync(false))
    expect(result.current.isCloudSyncEnabled).toBe(false)
    expect(localStorage.getItem('lw_cloud_sync')).toBe('false')
  })

  it('performCloudSync does nothing when sync is disabled', async () => {
    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    await act(async () => result.current.performCloudSync())
    expect(mockSaveBackup).not.toHaveBeenCalled()
  })

  it('performCloudSync exports and saves backup when authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockFindBackupFile.mockResolvedValue(null)
    mockToArray.mockResolvedValue([])
    localStorage.setItem('lw_cloud_sync', 'true')

    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    await act(async () => result.current.performCloudSync())

    expect(mockSaveBackup).toHaveBeenCalled()
    expect(result.current.cloudSyncStatus).toBe('success')
    expect(result.current.pendingSync).toBe(false)
  })

  it('performCloudSync aborts when cloud has newer data', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    const futureDate = new Date(Date.now() + 60000).toISOString()
    mockFindBackupFile.mockResolvedValue({ modifiedTime: futureDate, id: 'cloud-id' })
    localStorage.setItem('lw_cloud_sync', 'true')
    localStorage.setItem('lw_last_cloud_sync', new Date(Date.now() - 60000).toISOString())

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    await act(async () => result.current.performCloudSync())

    expect(mockSaveBackup).not.toHaveBeenCalled()
    expect(result.current.cloudSyncStatus).toBe('idle')
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cloud-version-available' })
    )
  })

  it('checkCloudBackupStatus dispatches event when cloud file is newer', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    const futureDate = new Date(Date.now() + 60000).toISOString()
    mockFindBackupFile.mockResolvedValue({ modifiedTime: futureDate, id: 'cloud-id' })

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    await act(async () => result.current.checkCloudBackupStatus())

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cloud-version-available' })
    )
  })

  it('checkCloudBackupStatus does not dispatch when cloud is older', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    const pastDate = new Date(Date.now() - 60000).toISOString()
    mockFindBackupFile.mockResolvedValue({ modifiedTime: pastDate, id: 'cloud-id' })
    localStorage.setItem('lw_last_cloud_sync', new Date().toISOString())

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    await act(async () => result.current.checkCloudBackupStatus())

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('checkCloudBackupStatus does nothing when not authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false)

    const { result } = renderHook(() => useCloudSync({ db: mockDb }))
    await act(async () => result.current.checkCloudBackupStatus())

    expect(mockFindBackupFile).not.toHaveBeenCalled()
  })
})
