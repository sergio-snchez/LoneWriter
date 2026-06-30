import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNovelCrud } from './useNovelCrud'

vi.mock('../i18n/i18n', () => ({
  default: {
    t: (key) => key,
    language: 'es',
  },
}))

const mockDeleteVectorsForScene = vi.fn()
const mockDeleteVectorsForNovel = vi.fn()
vi.mock('../services', () => ({
  deleteVectorsForScene: (...args) => mockDeleteVectorsForScene(...args),
  deleteVectorsForNovel: (...args) => mockDeleteVectorsForNovel(...args),
}))

function tableMock() {
  const obj = {
    get: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    where: vi.fn(() => tableWhere()),
  }
  return obj
}

function tableWhere() {
  return {
    equals: vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      first: vi.fn(),
    })),
  }
}

function noopTableMock() {
  return { where: vi.fn(() => tableWhere()) }
}

const mockDb = vi.hoisted(() => ({
  novels: tableMock(),
  acts: tableMock(),
  chapters: tableMock(),
  scenes: tableMock(),
  characters: noopTableMock(),
  locations: noopTableMock(),
  objects: noopTableMock(),
  lore: noopTableMock(),
  resources: noopTableMock(),
  dailyProgress: noopTableMock(),
  nexusLinks: noopTableMock(),
  debateAgents: noopTableMock(),
  debateSessions: noopTableMock(),
  oracleEntries: noopTableMock(),
  lastRewrite: noopTableMock(),
  mpcIgnored: noopTableMock(),
  transaction: vi.fn((mode, tables, fn) => fn()),
}))

vi.mock('../db/database', () => ({ db: mockDb }))

describe('useNovelCrud', () => {
  const defaultDeps = {
    activeNovel: null,
    setActiveNovel: vi.fn(),
    setActiveScene: vi.fn(),
    reloadData: vi.fn(),
    refreshAllNovels: vi.fn(),
    syncNovelWordCount: vi.fn(),
    trackDailyProgress: vi.fn(),
    setPendingSync: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockDb.novels.get.mockResolvedValue(null)
    mockDb.novels.add.mockResolvedValue('novel-1')
    mockDb.novels.update.mockResolvedValue(undefined)
    mockDb.acts.get.mockResolvedValue({ novelId: 'novel-1' })
    mockDb.acts.add.mockResolvedValue('act-1')
    mockDb.chapters.get.mockResolvedValue({ actId: 'act-1' })
    mockDb.chapters.add.mockResolvedValue('ch-1')
    mockDb.scenes.get.mockResolvedValue(null)
    mockDb.scenes.add.mockResolvedValue('scene-1')
    mockDb.scenes.update.mockResolvedValue(undefined)
  })

  it('switchNovel loads novel and sets it active', async () => {
    const deps = { ...defaultDeps }
    deps.syncNovelWordCount.mockResolvedValue(5000)
    deps.reloadData.mockResolvedValue(undefined)
    mockDb.novels.get.mockResolvedValue({ id: 'novel-1', title: 'Test', wordCount: 5000 })

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.switchNovel('novel-1'))

    expect(deps.setActiveNovel).toHaveBeenCalledWith(expect.objectContaining({ id: 'novel-1', title: 'Test' }))
    expect(deps.setActiveScene).toHaveBeenCalledWith(null)
    expect(localStorage.getItem('activeNovelId')).toBe('novel-1')
  })

  it('createNovel creates novel with initial act, chapter and scene', async () => {
    const deps = { ...defaultDeps }
    deps.refreshAllNovels.mockResolvedValue(undefined)
    deps.syncNovelWordCount.mockResolvedValue(0)
    deps.reloadData.mockResolvedValue(undefined)
    mockDb.novels.get.mockResolvedValueOnce({ id: 'novel-1', title: 'New Novel', wordCount: 0 })
    mockDb.scenes.get.mockResolvedValue({ id: 'scene-1', title: 'Scene 1' })

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.createNovel('New Novel'))

    expect(mockDb.novels.add).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Novel' }))
    expect(mockDb.acts.add).toHaveBeenCalled()
    expect(mockDb.chapters.add).toHaveBeenCalled()
    expect(mockDb.scenes.add).toHaveBeenCalled()
    expect(deps.setPendingSync).toHaveBeenCalledWith(true)
  })

  it('deleteNovel removes novel and all related data', async () => {
    const deps = { ...defaultDeps, activeNovel: { id: 'novel-1' } }
    deps.refreshAllNovels.mockResolvedValue(undefined)

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.deleteNovel('novel-1'))

    expect(mockDb.transaction).toHaveBeenCalled()
    expect(deps.setActiveNovel).toHaveBeenCalledWith(null)
    expect(deps.setPendingSync).toHaveBeenCalledWith(true)
  })

  it('updateNovel updates novel data and refreshes state if active', async () => {
    const deps = { ...defaultDeps, activeNovel: { id: 'novel-1', title: 'Old' } }
    deps.refreshAllNovels.mockResolvedValue(undefined)

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.updateNovel('novel-1', { title: 'Updated' }))

    expect(mockDb.novels.update).toHaveBeenCalledWith('novel-1', { title: 'Updated' })
    expect(deps.setActiveNovel).toHaveBeenCalled()
    expect(deps.setPendingSync).toHaveBeenCalledWith(true)
  })

  it('updateNovel skips update when data has no keys', async () => {
    const deps = { ...defaultDeps, activeNovel: { id: 'novel-1' } }

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.updateNovel('novel-1', {}))

    expect(mockDb.novels.update).not.toHaveBeenCalled()
  })

  it('updateNovel skips undefined values', async () => {
    const deps = { ...defaultDeps, activeNovel: { id: 'novel-1' } }
    deps.refreshAllNovels.mockResolvedValue(undefined)

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.updateNovel('novel-1', { title: undefined }))

    expect(mockDb.novels.update).not.toHaveBeenCalled()
  })

  it('addAct creates an act', async () => {
    const deps = { ...defaultDeps }
    deps.reloadData.mockResolvedValue(undefined)
    mockDb.acts.add.mockResolvedValue('act-new')

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.addAct('novel-1', 'New Act'))

    expect(mockDb.acts.add).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Act' }))
  })

  it('deleteAct removes an act', async () => {
    const deps = { ...defaultDeps }
    deps.reloadData.mockResolvedValue(undefined)
    mockDb.acts.get.mockResolvedValue({ id: 'act-1', novelId: 'novel-1' })

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.deleteAct('act-1'))

    expect(mockDb.acts.delete).toHaveBeenCalledWith('act-1')
  })

  it('addScene creates a scene', async () => {
    const deps = { ...defaultDeps }
    deps.reloadData.mockResolvedValue(undefined)
    mockDb.chapters.get.mockResolvedValue({ id: 'ch-1', actId: 'act-1' })
    mockDb.acts.get.mockResolvedValue({ id: 'act-1', novelId: 'novel-1' })

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.addScene('ch-1', 'New Scene'))

    expect(mockDb.scenes.add).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Scene' }))
  })

  it('updateScene propagates wordCount diff to novel', async () => {
    const deps = { ...defaultDeps, activeNovel: { id: 'novel-1', wordCount: 1000 } }
    deps.reloadData.mockResolvedValue(undefined)
    deps.trackDailyProgress.mockResolvedValue(undefined)
    mockDb.scenes.get.mockResolvedValue({ id: 'scene-1', chapterId: 'ch-1', wordCount: 100 })
    mockDb.novels.update.mockResolvedValue(undefined)

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.updateScene('scene-1', { wordCount: 300 }))

    expect(mockDb.novels.update).toHaveBeenCalledWith('novel-1', expect.objectContaining({
      wordCount: 1200,
    }))
    expect(deps.trackDailyProgress).toHaveBeenCalledWith('novel-1', 200)
  })

  it('addCompendiumEntry does nothing when no activeNovel', async () => {
    const { result } = renderHook(() => useNovelCrud(defaultDeps))
    await act(async () => result.current.addCompendiumEntry('characters', { name: 'Alice' }))
    expect(mockDb.characters.add).toBeUndefined()
  })

  it('addCompendiumEntry adds entry when activeNovel is set', async () => {
    const deps = { ...defaultDeps, activeNovel: { id: 'novel-1' } }
    deps.reloadData.mockResolvedValue(undefined)
    mockDb.characters.add = vi.fn().mockResolvedValue('char-1')

    const { result } = renderHook(() => useNovelCrud(deps))
    await act(async () => result.current.addCompendiumEntry('characters', { name: 'Alice' }))

    expect(mockDb.characters.add).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alice', novelId: 'novel-1' }))
  })
})
