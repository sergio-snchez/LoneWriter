import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAdd, mockUpdate, mockDelete, mockWhere } = vi.hoisted(() => ({
  mockAdd: vi.fn(() => Promise.resolve(1)),
  mockUpdate: vi.fn(() => Promise.resolve(1)),
  mockDelete: vi.fn(() => Promise.resolve()),
  mockWhere: vi.fn(() => ({
    equals: vi.fn(() => ({
      and: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([])),
      })),
      toArray: vi.fn(() => Promise.resolve([])),
    })),
  })),
}))

vi.mock('../../db/database', () => ({
  db: {
    novels: { add: mockAdd },
    acts: { add: mockAdd, delete: mockDelete },
    chapters: {
      add: mockAdd,
      delete: mockDelete,
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
        })),
      })),
    },
    scenes: {
      add: mockAdd,
      delete: mockDelete,
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
        })),
      })),
    },
    resources: {
      add: mockAdd,
      update: mockUpdate,
      where: mockWhere,
    },
  },
}))

vi.mock('../ragService', () => ({
  upsertVector: vi.fn(() => Promise.resolve()),
  deleteVectorsForScene: vi.fn(() => Promise.resolve()),
}))

vi.mock('./parsers', () => ({
  parseFile: vi.fn(() => Promise.resolve({
    metadata: { format: 'TXT', fileName: 'test.txt', fileSize: 100, wordCount: 10, contentHash: 'abc123' },
    pages: [{ text: 'Hello world', headings: [] }],
    rawContent: 'Hello world',
  })),
  supportsFile: vi.fn(() => true),
  computeFileHash: vi.fn(() => Promise.resolve('abc123')),
  ALLOWED_EXTENSIONS: ['txt', 'md', 'docx', 'pdf', 'odt'],
  MAX_FILE_SIZE: 50 * 1024 * 1024,
}))

import { findExistingImport, confirmImport } from './importService'
import { db } from '../../db/database'

describe('findExistingImport', () => {
  it('returns null for missing params', async () => {
    expect(await findExistingImport(null, 1)).toBeNull()
    expect(await findExistingImport('hash', null)).toBeNull()
  })

  it('returns null when no match found', async () => {
    const result = await findExistingImport('abc123', 1)
    expect(result).toBeNull()
  })
})

describe('confirmImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new novel when createNewNovel is true', async () => {
    const analysis = {
      metadata: { format: 'TXT', fileName: 'test.txt', fileSize: 100, wordCount: 10, contentHash: 'abc' },
      sections: [{
        title: 'Act 1',
        chapters: [{
          title: 'Ch 1',
          scenes: [{ title: 'Scene 1', text: 'Hello world' }],
        }],
      }],
      rawContent: 'Hello world',
    }
    const file = new File(['test'], 'test.txt')
    const result = await confirmImport(analysis, file, {
      createNewNovel: true,
      novelTitle: 'My Novel',
    })
    expect(result.novelId).toBeDefined()
    expect(result.createdSceneIds).toBeDefined()
  })

  it('uses existingNovelId when not creating new', async () => {
    const analysis = {
      metadata: { format: 'TXT', fileName: 'test.txt', fileSize: 100, wordCount: 10, contentHash: 'abc' },
      sections: [{
        title: 'Act 1',
        chapters: [{
          title: 'Ch 1',
          scenes: [{ title: 'Scene 1', text: 'Content here' }],
        }],
      }],
      rawContent: 'Content here',
    }
    const file = new File(['test'], 'test.txt')
    const result = await confirmImport(analysis, file, {
      createNewNovel: false,
      existingNovelId: 42,
    })
    expect(result.novelId).toBe(42)
  })

  it('in update mode, deletes old scenes before recreating', async () => {
    const existingResource = {
      id: 10,
      importedSceneIds: [100, 101],
      importedActIds: [200],
    }
    const analysis = {
      metadata: { format: 'TXT', fileName: 'test.txt', fileSize: 100, wordCount: 10, contentHash: 'abc' },
      sections: [{
        title: 'Act 1',
        chapters: [{
          title: 'Ch 1',
          scenes: [{ title: 'Scene 1', text: 'Updated content' }],
        }],
      }],
      rawContent: 'Updated content',
    }
    const file = new File(['test'], 'test.txt')
    const { deleteVectorsForScene } = await import('../ragService')
    await confirmImport(analysis, file, {
      createNewNovel: false,
      existingNovelId: 1,
      importMode: 'update',
      existingResource,
    })
    expect(deleteVectorsForScene).toHaveBeenCalledWith(100)
    expect(deleteVectorsForScene).toHaveBeenCalledWith(101)
  })

  it('in duplicate mode, does not delete old resources', async () => {
    const existingResource = { id: 10, importedSceneIds: [100] }
    const analysis = {
      metadata: { format: 'TXT', fileName: 'test.txt', fileSize: 100, wordCount: 10, contentHash: 'abc' },
      sections: [{
        title: 'Act 1',
        chapters: [{
          title: 'Ch 1',
          scenes: [{ title: 'Scene 1', text: 'New copy' }],
        }],
      }],
      rawContent: 'New copy',
    }
    const file = new File(['test'], 'test.txt')
    const { deleteVectorsForScene } = await import('../ragService')
    await confirmImport(analysis, file, {
      createNewNovel: false,
      existingNovelId: 1,
      importMode: 'duplicate',
      existingResource,
    })
    expect(deleteVectorsForScene).not.toHaveBeenCalled()
  })
})
