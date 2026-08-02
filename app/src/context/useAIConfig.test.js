import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIConfig } from './useAIConfig'

const mockT = vi.fn((key) => key)
vi.mock('../i18n/i18n', () => ({
  default: {
    t: (...args) => mockT(...args),
    language: 'es',
  },
}))

vi.mock('../i18n/stopwords', () => ({
  loadUserStopwords: vi.fn(),
}))

const mockEncryptValue = vi.fn((v) => Promise.resolve(`enc_${v}`))
const mockDecryptValue = vi.fn((v) => Promise.resolve(v ? v.replace('enc_', '') : ''))
vi.mock('../utils/crypto', () => ({
  encryptValue: (...args) => mockEncryptValue(...args),
  decryptValue: (...args) => mockDecryptValue(...args),
}))

const mockToArray = vi.fn()
const mockFirst = vi.fn()
const mockPut = vi.fn()
vi.mock('../db/database', () => ({
  db: {
    aiProviderConfigs: {
      toArray: (...args) => mockToArray(...args),
      where: () => ({
        equals: () => ({
          first: (...args) => mockFirst(...args),
        }),
      }),
      put: (...args) => mockPut(...args),
    },
  },
}))

describe('useAIConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockToArray.mockResolvedValue([])
    mockFirst.mockResolvedValue(null)
    mockPut.mockResolvedValue(undefined)
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('reads provider from localStorage', () => {
    localStorage.setItem('ai_provider', 'anthropic')
    const { result } = renderHook(() => useAIConfig())
    expect(result.current.provider).toBe('anthropic')
  })

  it('defaults provider to google when no localStorage value', () => {
    const { result } = renderHook(() => useAIConfig())
    expect(result.current.provider).toBe('google')
  })

  it('loads aiProviderConfigs from Dexie on mount', async () => {
    mockToArray.mockResolvedValue([
      { provider: 'openai', model: 'gpt-4', apiKey: 'enc_sk-123', localBaseUrl: '', verified: true },
    ])
    const { result } = renderHook(() => useAIConfig())
    await vi.waitFor(() => expect(result.current.configsLoaded).toBe(true))
    expect(result.current.allConfigs.openai.model).toBe('gpt-4')
    expect(result.current.verifiedByProvider.openai).toBe(true)
  })

  it('handles Dexie load error gracefully', async () => {
    mockToArray.mockRejectedValue(new Error('DB error'))
    const { result } = renderHook(() => useAIConfig())
    await vi.waitFor(() => expect(result.current.configsLoaded).toBe(true))
    expect(result.current.configsLoaded).toBe(true)
  })

  it('setProvider updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => result.current.setProvider('openai'))
    expect(result.current.provider).toBe('openai')
    expect(localStorage.getItem('ai_provider')).toBe('openai')
  })

  it('setApiKey updates apiKey in state and saves to Dexie', async () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => { result.current.setApiKey('sk-new') })
    await vi.waitFor(() => expect(result.current.apiKey).toBe('sk-new'))
    await vi.waitFor(() => expect(mockPut).toHaveBeenCalled())
    expect(mockEncryptValue).toHaveBeenCalledWith('sk-new')
  })

  it('setApiKey with empty value does not encrypt', async () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => { result.current.setApiKey('') })
    await vi.waitFor(() => expect(result.current.apiKey).toBe(''))
    expect(mockEncryptValue).not.toHaveBeenCalled()
  })

  it('setModelForProvider updates model for the specified provider', async () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => { result.current.setModelForProvider('anthropic', 'claude-3-opus') })
    await vi.waitFor(() => expect(result.current.allConfigs.anthropic.model).toBe('claude-3-opus'))
    await vi.waitFor(() => expect(mockPut).toHaveBeenCalled())
  })

  it('setLocalBaseUrl updates the local provider config', async () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => { result.current.setLocalBaseUrl('http://localhost:8080/v1') })
    await vi.waitFor(() => expect(result.current.allConfigs.local.localBaseUrl).toBe('http://localhost:8080/v1'))
  })

  it('setProviderVerified persists verified state and reflects in verifiedByProvider', async () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => { result.current.setProviderVerified('local', true) })
    await vi.waitFor(() => expect(result.current.verifiedByProvider.local).toBe(true))
    await vi.waitFor(() => expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ provider: 'local', verified: true })))
  })

  it('setApiKey clears verified for the affected provider', async () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => { result.current.setProviderVerified('openai', true) })
    await vi.waitFor(() => expect(result.current.verifiedByProvider.openai).toBe(true))
    act(() => { result.current.setApiKey('sk-new', 'openai') })
    await vi.waitFor(() => expect(result.current.verifiedByProvider.openai).toBe(false))
    await vi.waitFor(() => expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ provider: 'openai', verified: false })))
  })

  it('setModelForProvider clears verified for the affected provider', async () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => { result.current.setProviderVerified('anthropic', true) })
    await vi.waitFor(() => expect(result.current.verifiedByProvider.anthropic).toBe(true))
    act(() => { result.current.setModelForProvider('anthropic', 'claude-3-opus') })
    await vi.waitFor(() => expect(result.current.verifiedByProvider.anthropic).toBe(false))
  })

  it('setLocalBaseUrl clears verified for the local provider', async () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => { result.current.setProviderVerified('local', true) })
    await vi.waitFor(() => expect(result.current.verifiedByProvider.local).toBe(true))
    act(() => { result.current.setLocalBaseUrl('http://localhost:8080/v1') })
    await vi.waitFor(() => expect(result.current.verifiedByProvider.local).toBe(false))
  })

  it('selectedModel returns default model for current provider', () => {
    const { result } = renderHook(() => useAIConfig())
    expect(result.current.selectedModel).toBe('gemini-2.0-flash')
  })

  it('selectedModel returns custom model when set', async () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => { result.current.setModelForProvider('google', 'gemini-2.0-pro') })
    await vi.waitFor(() => expect(result.current.selectedModel).toBe('gemini-2.0-pro'))
  })

  it('updatePrompt updates a single rewrite prompt', () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => result.current.updatePrompt('style', 'Be concise and clear'))
    expect(result.current.prompts.style).toBe('Be concise and clear')
  })

  it('resetPrompt restores a prompt to its default value', () => {
    const { result } = renderHook(() => useAIConfig())
    act(() => result.current.updatePrompt('style', 'Custom value'))
    act(() => result.current.resetPrompt('style'))
    expect(result.current.prompts.style).toBe('ai:rewrite_prompts.style')
  })
})
