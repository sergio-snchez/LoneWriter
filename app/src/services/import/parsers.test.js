import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('mammoth', () => ({
  default: { extractRawText: vi.fn(() => Promise.resolve({ value: 'docx content' })) },
}))

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: vi.fn((n) => Promise.resolve({
        getTextContent: vi.fn(() => Promise.resolve({
          items: [{ str: `Page ${n} text` }],
        })),
      })),
    }),
  })),
}))

vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(() => Promise.resolve({
      file: vi.fn((name) => {
        if (name === 'content.xml') {
          return { async: vi.fn(() => Promise.resolve(
            '<text:p>Hello World</text:p><text:p>Second paragraph</text:p>'
          )) }
        }
        return null
      }),
    })),
  },
}))

import { computeFileHash, supportsFile, parseFile, MAX_FILE_SIZE } from './parsers'

function makeFile(name, content = 'test content', size) {
  const blob = new Blob([content])
  const file = new File([blob], name, { type: 'application/octet-stream' })
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size })
  }
  return file
}

describe('computeFileHash', () => {
  it('returns a hex string hash', async () => {
    const file = makeFile('test.txt', 'hello world')
    const hash = await computeFileHash(file)
    expect(typeof hash).toBe('string')
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('returns same hash for same content', async () => {
    const file1 = makeFile('a.txt', 'identical')
    const file2 = makeFile('b.txt', 'identical')
    expect(await computeFileHash(file1)).toBe(await computeFileHash(file2))
  })

  it('returns different hash for different content', async () => {
    const file1 = makeFile('a.txt', 'content A')
    const file2 = makeFile('b.txt', 'content B')
    expect(await computeFileHash(file1)).not.toBe(await computeFileHash(file2))
  })
})

describe('supportsFile', () => {
  it('accepts allowed extensions', () => {
    expect(supportsFile(makeFile('chapter.txt'))).toBe(true)
    expect(supportsFile(makeFile('notes.md'))).toBe(true)
    expect(supportsFile(makeFile('book.docx'))).toBe(true)
    expect(supportsFile(makeFile('paper.pdf'))).toBe(true)
    expect(supportsFile(makeFile('draft.odt'))).toBe(true)
  })

  it('rejects disallowed extensions', () => {
    expect(supportsFile(makeFile('image.png'))).toBe(false)
    expect(supportsFile(makeFile('data.csv'))).toBe(false)
    expect(supportsFile(makeFile('noext'))).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(supportsFile(makeFile('FILE.TXT'))).toBe(true)
    expect(supportsFile(makeFile('Book.PDF'))).toBe(true)
  })
})

describe('parseFile', () => {
  it('rejects files exceeding MAX_FILE_SIZE', async () => {
    const hugeSize = MAX_FILE_SIZE + 1
    const file = makeFile('huge.txt', 'x', hugeSize)
    await expect(parseFile(file)).rejects.toThrow('File too large')
  })

  it('rejects unsupported file extensions', async () => {
    const file = makeFile('data.json', '{}')
    await expect(parseFile(file)).rejects.toThrow('Unsupported format')
  })

  it('parses .txt files', async () => {
    const file = makeFile('chapter.txt', 'First line\nSecond line')
    const result = await parseFile(file)
    expect(result.metadata.format).toBe('TXT')
    expect(result.metadata.fileName).toBe('chapter.txt')
    expect(result.metadata.contentHash).toBeDefined()
    expect(result.pages).toBeDefined()
    expect(result.pages.length).toBeGreaterThan(0)
  })

  it('parses .md files', async () => {
    const file = makeFile('notes.md', '# Title\n\nBody text here')
    const result = await parseFile(file)
    expect(result.metadata.format).toBe('MD')
    expect(result.metadata.contentHash).toMatch(/^[0-9a-f]+$/)
  })

  it('includes contentHash in metadata', async () => {
    const file = makeFile('test.txt', 'same content')
    const result = await parseFile(file)
    expect(result.metadata.contentHash).toBeDefined()
    expect(typeof result.metadata.contentHash).toBe('string')
  })
})
