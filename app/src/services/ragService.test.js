import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockVectorsAdd, mockVectorsToArray, mockVectorsDelete, mockBulkDelete } = vi.hoisted(() => ({
  mockVectorsAdd: vi.fn(() => Promise.resolve(1)),
  mockVectorsToArray: vi.fn(() => Promise.resolve([])),
  mockVectorsDelete: vi.fn(() => Promise.resolve()),
  mockBulkDelete: vi.fn(() => Promise.resolve()),
}))

vi.mock('../db/database', () => ({
  db: {
    vectors: {
      add: mockVectorsAdd,
      bulkDelete: mockBulkDelete,
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: mockVectorsToArray,
          delete: mockVectorsDelete,
        })),
      })),
    },
    acts: { where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })) },
    chapters: { where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })) },
    scenes: { where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })) },
  },
}))

vi.mock('./ragWorker.js', () => ({ default: {} }))

global.Worker = vi.fn(() => ({
  postMessage: vi.fn(),
  onmessage: null,
  onerror: null,
}))

import { chunkText, deleteVectorsForScene, deleteVectorsForNovel, getVectorStats } from './ragService'

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const result = chunkText('Hello world', 250, 30)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('Hello world')
  })

  it('splits long text into multiple chunks', () => {
    const longText = Array(600).fill('word').join(' ')
    const result = chunkText(longText, 250, 30)
    expect(result.length).toBeGreaterThan(1)
  })

  it('each chunk is within maxWords limit', () => {
    const longText = Array(1000).fill('word').join(' ')
    const result = chunkText(longText, 250, 30)
    for (const chunk of result) {
      expect(chunk.split(/\s+/).length).toBeLessThanOrEqual(251)
    }
  })
})

describe('deleteVectorsForScene', () => {
  it('calls db.vectors.where().equals().delete()', async () => {
    await deleteVectorsForScene(42)
    expect(mockVectorsDelete).toHaveBeenCalled()
  })
})

describe('deleteVectorsForNovel', () => {
  it('calls db.vectors.where().equals().delete()', async () => {
    await deleteVectorsForNovel(7)
    expect(mockVectorsDelete).toHaveBeenCalled()
  })
})

describe('getVectorStats', () => {
  it('returns empty stats for no vectors', async () => {
    mockVectorsToArray.mockResolvedValueOnce([])
    const stats = await getVectorStats(1)
    expect(stats.totalVectors).toBe(0)
    expect(stats.byChapter.size).toBe(0)
    expect(stats.byAct.size).toBe(0)
  })

  it('aggregates vectors by chapter and act', async () => {
    mockVectorsToArray.mockResolvedValueOnce([
      { chapterId: 1, actId: 10 },
      { chapterId: 1, actId: 10 },
      { chapterId: 2, actId: 10 },
      { chapterId: 3, actId: 11 },
    ])
    const stats = await getVectorStats(1)
    expect(stats.totalVectors).toBe(4)
    expect(stats.byChapter.get(1)).toBe(2)
    expect(stats.byChapter.get(2)).toBe(1)
    expect(stats.byAct.get(10)).toBe(3)
    expect(stats.byAct.get(11)).toBe(1)
  })
})
