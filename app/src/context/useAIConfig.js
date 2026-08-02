/**
 * useAIConfig.js — Provider selection, model config, API keys, and rewrite prompts.
 * Extracted from AIContext to isolate settings changes from live AI interactions.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import i18n from '../i18n/i18n'
import { db } from '../db/database'
import { loadUserStopwords } from '../i18n/stopwords'
import { encryptValue, decryptValue } from '../utils/crypto'

const AI_PROVIDERS = ['google', 'openai', 'anthropic', 'openrouter', 'local']
const emptyProviderConfig = { model: '', apiKey: '', localBaseUrl: '', verified: false }

export const DEFAULT_MODELS = {
  google:      'gemini-2.0-flash',
  openai:      'gpt-4o-mini',
  anthropic:   'claude-3-5-sonnet-20241022',
  openrouter:  'openrouter/auto',
  local:       'local-model',
}

const DEFAULT_PROMPTS = () => ({
  style:     i18n.t('ai:rewrite_prompts.style'),
  language:  i18n.t('ai:rewrite_prompts.language'),
  tone:      i18n.t('ai:rewrite_prompts.tone'),
  length:    i18n.t('ai:rewrite_prompts.length'),
  clarity:   i18n.t('ai:rewrite_prompts.clarity'),
  rhythm:    i18n.t('ai:rewrite_prompts.rhythm'),
  cohesion:  i18n.t('ai:rewrite_prompts.cohesion'),
  character: i18n.t('ai:rewrite_prompts.character'),
})

export function useAIConfig() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [provider, setProvider] = useState(
    () => localStorage.getItem('ai_provider') || 'google'
  )
  const [allConfigs, setAllConfigs] = useState(() => {
    const initial = {}
    for (const p of AI_PROVIDERS) initial[p] = { ...emptyProviderConfig }
    return initial
  })
  const [configsLoaded, setConfigsLoaded] = useState(false)
  const [prompts, setPrompts] = useState(() => DEFAULT_PROMPTS())

  // ── Effects ────────────────────────────────────────────────────────────────

  // Load all provider configs from Dexie on mount
  useEffect(() => {
    const loadAllConfigs = async () => {
      try {
        const rows = await db.aiProviderConfigs.toArray()
        const loaded = {}
        for (const p of AI_PROVIDERS) loaded[p] = { ...emptyProviderConfig }
        for (const row of rows) {
          if (loaded[row.provider]) {
            loaded[row.provider] = {
              model:        loaded[row.provider].model        || row.model        || '',
              apiKey:       loaded[row.provider].apiKey       || (row.apiKey ? await decryptValue(row.apiKey) : ''),
              localBaseUrl: loaded[row.provider].localBaseUrl || row.localBaseUrl || '',
              verified:     loaded[row.provider].verified     || !!row.verified,
            }
          }
        }
        setAllConfigs(loaded)
        setConfigsLoaded(true)
      } catch (err) {
        console.error('[useAIConfig] Error loading configs:', err)
        setConfigsLoaded(true)
      }
    }
    loadAllConfigs()
    loadUserStopwords()
  }, [])

  useEffect(() => { localStorage.setItem('ai_provider', provider) }, [provider])
  useEffect(() => { localStorage.setItem('ai_custom_prompts', JSON.stringify(prompts)) }, [prompts])
  useEffect(() => { setPrompts(DEFAULT_PROMPTS()) }, [i18n.language])

  // ── Derived values ─────────────────────────────────────────────────────────
  const currentConfig = allConfigs[provider] || emptyProviderConfig
  const apiKey        = currentConfig.apiKey || ''
  const selectedModel = currentConfig.model ? currentConfig.model : DEFAULT_MODELS[provider]
  const currentModel  = selectedModel
  const localBaseUrl  = currentConfig.localBaseUrl || 'http://localhost:1234/v1'

  // ── Actions ────────────────────────────────────────────────────────────────

  const saveProviderConfig = async (prov, updates) => {
    try {
      const existing = await db.aiProviderConfigs.where('provider').equals(prov).first()
      const hasApiKeyUpdate = Object.hasOwn(updates, 'apiKey')
      let apiKeyToStore
      if (hasApiKeyUpdate) {
        apiKeyToStore = updates.apiKey ? await encryptValue(updates.apiKey) : ''
      }
      const data = { provider: prov, ...updates, updatedAt: new Date().toISOString() }
      if (apiKeyToStore !== undefined) data.apiKey = apiKeyToStore
      if (existing) {
        data.id = existing.id
        if (!updates.model        && existing.model)        data.model        = existing.model
        if (!hasApiKeyUpdate       && existing.apiKey)      data.apiKey       = existing.apiKey
        if (!updates.localBaseUrl && existing.localBaseUrl) data.localBaseUrl = existing.localBaseUrl
      }
      await db.aiProviderConfigs.put(data)
    } catch (err) {
      console.error('[useAIConfig] Save error:', err)
    }
  }

  const setApiKey = useCallback(async (val, prov) => {
    const target = prov || provider
    setAllConfigs(prev => ({ ...prev, [target]: { ...prev[target], apiKey: val, verified: false } }))
    await saveProviderConfig(target, { apiKey: val, verified: false })
  }, [provider])

  const setModelForProvider = useCallback(async (prov, modelId) => {
    setAllConfigs(prev => ({ ...prev, [prov]: { ...prev[prov], model: modelId, verified: false } }))
    await saveProviderConfig(prov, { model: modelId, verified: false })
  }, [])

  const setLocalBaseUrl = useCallback(async (val) => {
    setAllConfigs(prev => ({ ...prev, local: { ...prev.local, localBaseUrl: val, verified: false } }))
    await saveProviderConfig('local', { localBaseUrl: val, verified: false })
  }, [])

  const setProviderVerified = useCallback(async (prov, verified) => {
    setAllConfigs(prev => ({ ...prev, [prov]: { ...prev[prov], verified } }))
    await saveProviderConfig(prov, { verified })
  }, [])

  const updatePrompt = (id, value) => setPrompts(prev => ({ ...prev, [id]: value }))
  const resetPrompt  = (id)        => setPrompts(prev => ({ ...prev, [id]: DEFAULT_PROMPTS()[id] }))

  // ── Derived values ─────────────────────────────────────────────────────────
  const verifiedByProvider = useMemo(() => {
    const map = {}
    for (const p of AI_PROVIDERS) map[p] = !!allConfigs[p]?.verified
    return map
  }, [allConfigs])

  // ── Exports ────────────────────────────────────────────────────────────────
  return useMemo(() => ({
    provider, setProvider,
    allConfigs, configsLoaded,
    apiKey, setApiKey,
    localBaseUrl, setLocalBaseUrl,
    setModelForProvider,
    currentModel, selectedModel,
    verifiedByProvider, setProviderVerified,
    prompts, updatePrompt, resetPrompt,
  }), [
    provider, allConfigs, configsLoaded, apiKey, localBaseUrl,
    currentModel, selectedModel, verifiedByProvider, prompts,
    setProvider, setApiKey, setLocalBaseUrl,
    setModelForProvider, setProviderVerified,
    updatePrompt, resetPrompt,
  ])
}
