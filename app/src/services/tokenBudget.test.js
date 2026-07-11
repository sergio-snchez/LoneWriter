import { describe, it, expect } from 'vitest'
import { estimateTokens, truncateToBudget, buildContextWithBudget, PROVIDER_DEFAULTS } from './tokenBudget'

describe('estimateTokens', () => {
  it('returns 0 for empty/null input', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens(null)).toBe(0)
    expect(estimateTokens(undefined)).toBe(0)
  })

  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('hola')).toBe(1)
    expect(estimateTokens('hola mundo')).toBe(3) // 10 chars / 4 = 3 (ceil)
    expect(estimateTokens('a'.repeat(100))).toBe(25)
  })
})

describe('truncateToBudget', () => {
  it('returns original text when under budget', () => {
    const result = truncateToBudget('short text', 100)
    expect(result.text).toBe('short text')
    expect(result.truncated).toBe(false)
    expect(result.originalTokens).toBe(3)
  })

  it('truncates text exceeding budget', () => {
    const longText = 'a'.repeat(400) // 100 tokens
    const result = truncateToBudget(longText, 20) // max 80 chars
    expect(result.truncated).toBe(true)
    expect(result.originalTokens).toBe(100)
    expect(result.text.length).toBeLessThanOrEqual(80 + 100) // maxChars + indicator
    expect(result.text).toContain('[... truncado')
  })

  it('handles null/empty input', () => {
    const result = truncateToBudget(null, 100)
    expect(result.text).toBe('')
    expect(result.truncated).toBe(false)
    expect(result.originalTokens).toBe(0)
  })
})

describe('buildContextWithBudget', () => {
  it('never truncates prompt or compendium', () => {
    const result = buildContextWithBudget({
      prompt: 'a'.repeat(4000),   // 1000 tokens
      compendium: 'b'.repeat(4000), // 1000 tokens
      sceneText: 'c'.repeat(4000),
      ragFragments: ['d'.repeat(4000)],
    }, 3000) // 12000 chars budget

    expect(result.prompt.length).toBe(4000)
    expect(result.compendium.length).toBe(4000)
  })

  it('truncates sceneText before RAG fragments', () => {
    const result = buildContextWithBudget({
      prompt: 'x'.repeat(100),   // 25 tokens
      compendium: '',              // 0 tokens
      sceneText: 'a'.repeat(10000), // 2500 tokens
      ragFragments: ['b'.repeat(10000)], // 2500 tokens
    }, 100) // 400 chars budget after prompt

    expect(result.sceneText.length).toBeLessThan(10000)
    expect(result.sceneText).toContain('[... truncado')
    expect(result.ragFragments).toHaveLength(0)
  })

  it('includes ragFragments only if budget allows', () => {
    const result = buildContextWithBudget({
      prompt: 'short',
      compendium: '',
      sceneText: '',
      ragFragments: ['fragment1', 'fragment2', 'fragment3'],
    }, 100) // generous budget

    expect(result.ragFragments).toHaveLength(3)
    expect(result.truncated).toBe(false)
  })

  it('returns warnings when truncation occurs', () => {
    const result = buildContextWithBudget({
      prompt: '',
      compendium: '',
      sceneText: 'a'.repeat(10000),
      ragFragments: [],
    }, 10)

    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.truncated).toBe(true)
  })
})

describe('PROVIDER_DEFAULTS', () => {
  it('has expected providers', () => {
    expect(PROVIDER_DEFAULTS.local).toBe(8000)
    expect(PROVIDER_DEFAULTS.openai).toBe(128000)
    expect(PROVIDER_DEFAULTS.google).toBe(1000000)
    expect(PROVIDER_DEFAULTS.anthropic).toBe(200000)
  })
})
