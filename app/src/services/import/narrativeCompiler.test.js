import { describe, it, expect } from 'vitest'
import { compileNarrativeStructure, COMPILER_DEFAULTS } from './narrativeCompiler'

function t(type, text, confidence = 1.0) {
  return { type, text, confidence }
}

describe('compileNarrativeStructure', () => {
  describe('empty / null input', () => {
    it('returns flat structure for null tokens', () => {
      const result = compileNarrativeStructure(null)
      expect(result.hasStructure).toBe(false)
      expect(result.sections).toHaveLength(1)
      expect(result.sections[0].chapters).toHaveLength(1)
      expect(result.sections[0].chapters[0].scenes).toHaveLength(1)
    })

    it('returns flat structure for empty array', () => {
      const result = compileNarrativeStructure([])
      expect(result.hasStructure).toBe(false)
    })
  })

  describe('no headings (only NORMAL tokens)', () => {
    it('returns hasStructure=false with single scene', () => {
      const tokens = [
        t('NORMAL', 'First paragraph'),
        t('NORMAL', 'Second paragraph'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.hasStructure).toBe(false)
      expect(result.sections[0].chapters[0].scenes).toHaveLength(1)
      expect(result.sections[0].chapters[0].scenes[0].text).toBe('First paragraph\nSecond paragraph')
    })
  })

  describe('only H1 tokens', () => {
    it('creates acts with chapters containing accumulated text', () => {
      const tokens = [
        t('H1', 'Acto I'),
        t('NORMAL', 'Scene text here'),
        t('H1', 'Acto II'),
        t('NORMAL', 'More text'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.hasStructure).toBe(true)
      expect(result.sections).toHaveLength(2)
      expect(result.sections[0].title).toBe('Acto I')
      expect(result.sections[1].title).toBe('Acto II')
      expect(result.sections[0].chapters[0].scenes[0].text).toBe('Scene text here')
    })
  })

  describe('H1 + H2 structure', () => {
    it('builds acts with chapters', () => {
      const tokens = [
        t('H1', 'Acto I'),
        t('H2', 'Capítulo 1'),
        t('NORMAL', 'Text of chapter 1'),
        t('H2', 'Capítulo 2'),
        t('NORMAL', 'Text of chapter 2'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections).toHaveLength(1)
      expect(result.sections[0].title).toBe('Acto I')
      expect(result.sections[0].chapters).toHaveLength(2)
      expect(result.sections[0].chapters[0].title).toBe('Capítulo 1')
      expect(result.sections[0].chapters[1].title).toBe('Capítulo 2')
    })

    it('creates Interludio for text before first H2 in act', () => {
      const tokens = [
        t('H1', 'Acto I'),
        t('NORMAL', 'Text before any chapter'),
        t('H2', 'Capítulo 1'),
        t('NORMAL', 'Chapter text'),
      ]
      const result = compileNarrativeStructure(tokens)
      const scenes = result.sections[0].chapters[0].scenes
      expect(scenes[0].title).toBe('Interludio')
      expect(scenes[0].text).toBe('Text before any chapter')
    })

    it('does not create Interludio when no text before first H2', () => {
      const tokens = [
        t('H1', 'Acto I'),
        t('H2', 'Capítulo 1'),
        t('NORMAL', 'Chapter text'),
      ]
      const result = compileNarrativeStructure(tokens)
      const scenes = result.sections[0].chapters[0].scenes
      expect(scenes[0].title).not.toBe('Interludio')
    })
  })

  describe('H2 only (no H1)', () => {
    it('wraps in a single act with empty title', () => {
      const tokens = [
        t('H2', 'Chapter A'),
        t('NORMAL', 'Content A'),
        t('H2', 'Chapter B'),
        t('NORMAL', 'Content B'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections).toHaveLength(1)
      expect(result.sections[0].title).toBe('')
      expect(result.sections[0].chapters).toHaveLength(2)
    })

    it('creates Interludio for text before first H2', () => {
      const tokens = [
        t('NORMAL', 'Intro text'),
        t('H2', 'Chapter 1'),
        t('NORMAL', 'Chapter content'),
      ]
      const result = compileNarrativeStructure(tokens)
      const firstChapter = result.sections[0].chapters[0]
      expect(firstChapter.scenes[0].title).toBe('Interludio')
      expect(firstChapter.scenes[0].text).toBe('Intro text')
    })
  })

  describe('H3 structure', () => {
    it('creates scenes from H3 tokens', () => {
      const tokens = [
        t('H2', 'Chapter 1'),
        t('H3', 'Scene 1'),
        t('NORMAL', 'Scene 1 text'),
        t('H3', 'Scene 2'),
        t('NORMAL', 'Scene 2 text'),
      ]
      const result = compileNarrativeStructure(tokens)
      const scenes = result.sections[0].chapters[0].scenes
      expect(scenes).toHaveLength(2)
      expect(scenes[0].title).toBe('Scene 1')
      expect(scenes[1].title).toBe('Scene 2')
    })

    it('creates Interludio for text before first H3 in chapter', () => {
      const tokens = [
        t('H2', 'Chapter 1'),
        t('NORMAL', 'Text before scene'),
        t('H3', 'Scene 1'),
        t('NORMAL', 'Scene text'),
      ]
      const result = compileNarrativeStructure(tokens)
      const scenes = result.sections[0].chapters[0].scenes
      expect(scenes[0].title).toBe('Interludio')
      expect(scenes[0].text).toBe('Text before scene')
    })
  })

  describe('full H1 + H2 + H3', () => {
    it('builds complete structure', () => {
      const tokens = [
        t('H1', 'Acto I'),
        t('H2', 'Capítulo 1'),
        t('H3', 'Escena 1'),
        t('NORMAL', 'Escena 1 text'),
        t('H3', 'Escena 2'),
        t('NORMAL', 'Escena 2 text'),
        t('H2', 'Capítulo 2'),
        t('H3', 'Escena 3'),
        t('NORMAL', 'Escena 3 text'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections).toHaveLength(1)
      expect(result.sections[0].chapters).toHaveLength(2)
      expect(result.sections[0].chapters[0].scenes).toHaveLength(2)
      expect(result.sections[0].chapters[1].scenes).toHaveLength(1)
    })
  })

  describe('multiple acts', () => {
    it('separates content by H1 boundaries', () => {
      const tokens = [
        t('H1', 'Acto I'),
        t('H2', 'Cap 1'),
        t('NORMAL', 'Act 1 Ch 1'),
        t('H1', 'Acto II'),
        t('H2', 'Cap 2'),
        t('NORMAL', 'Act 2 Ch 1'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections).toHaveLength(2)
      expect(result.sections[0].chapters[0].scenes[0].text).toBe('Act 1 Ch 1')
      expect(result.sections[1].chapters[0].scenes[0].text).toBe('Act 2 Ch 1')
    })
  })

  describe('confidence filtering', () => {
    it('ignores headings below minConfidence', () => {
      const tokens = [
        t('H1', 'Real Act', 1.0),
        t('NORMAL', 'Text'),
        { type: 'H2', text: 'Fake Chapter', confidence: 0.3 },
        t('NORMAL', 'More text'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections[0].chapters).toHaveLength(1)
      expect(result.sections[0].chapters[0].title).toBe('')
    })

    it('respects custom minConfidence option', () => {
      const tokens = [
        t('H1', 'Act', 1.0),
        { type: 'H2', text: 'Low conf', confidence: 0.7 },
        t('NORMAL', 'Text'),
      ]
      const result = compileNarrativeStructure(tokens, { minConfidence: 0.8 })
      expect(result.sections[0].chapters).toHaveLength(1)
      expect(result.sections[0].chapters[0].title).toBe('')
    })

    it('accepts tokens with null confidence (treated as 1.0)', () => {
      const tokens = [
        { type: 'H1', text: 'Act', confidence: null },
        t('NORMAL', 'Text'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections[0].title).toBe('Act')
    })
  })

  describe('fallback paragraph splitting', () => {
    it('splits by paragraphs when no H3 in chapter', () => {
      const longPara1 = 'Word '.repeat(60).trim()
      const longPara2 = 'Other '.repeat(60).trim()
      const tokens = [
        t('H2', 'Chapter 1'),
        t('NORMAL', longPara1),
        t('NORMAL', longPara2),
      ]
      const result = compileNarrativeStructure(tokens)
      const scenes = result.sections[0].chapters[0].scenes
      expect(scenes.length).toBeGreaterThanOrEqual(2)
    })

    it('uses first line as title if <= maxTitleLength', () => {
      const shortFirstLine = 'Short title'
      const rest = 'Word '.repeat(60).trim()
      const tokens = [
        t('H2', 'Chapter 1'),
        t('NORMAL', shortFirstLine + '\n' + rest),
      ]
      const result = compileNarrativeStructure(tokens)
      const scenes = result.sections[0].chapters[0].scenes
      expect(scenes[0].title).toBe('Short title')
    })

    it('does not use first line as title if > maxTitleLength', () => {
      const longFirstLine = 'X'.repeat(100)
      const tokens = [
        t('H2', 'Chapter 1'),
        t('NORMAL', longFirstLine),
      ]
      const result = compileNarrativeStructure(tokens)
      const scenes = result.sections[0].chapters[0].scenes
      expect(scenes[0].title).toBe('')
    })
  })

  describe('edge cases', () => {
    it('handles single H1 with no content', () => {
      const tokens = [t('H1', 'Only Act')]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections).toHaveLength(1)
      expect(result.sections[0].chapters).toHaveLength(1)
    })

    it('handles consecutive headings without content', () => {
      const tokens = [
        t('H1', 'Acto I'),
        t('H2', 'Cap 1'),
        t('H2', 'Cap 2'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections[0].chapters).toHaveLength(2)
    })

    it('handles empty text tokens', () => {
      const tokens = [
        t('H1', 'Act'),
        t('NORMAL', ''),
        t('H2', 'Chapter'),
        t('NORMAL', ''),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections[0].chapters[0].scenes[0].text).toBe('')
    })

    it('handles tokens with whitespace-only text', () => {
      const tokens = [
        t('H1', 'Act'),
        t('NORMAL', '   '),
        t('H2', 'Chapter'),
        t('NORMAL', 'Real content'),
      ]
      const result = compileNarrativeStructure(tokens)
      expect(result.sections[0].chapters[0].scenes).toHaveLength(1)
      expect(result.sections[0].chapters[0].scenes[0].text).toBe('Real content')
    })
  })

  describe('COMPILER_DEFAULTS', () => {
    it('exports expected defaults', () => {
      expect(COMPILER_DEFAULTS.minSceneChars).toBe(200)
      expect(COMPILER_DEFAULTS.maxTitleLength).toBe(80)
      expect(COMPILER_DEFAULTS.minConfidence).toBe(0.6)
    })
  })
})
