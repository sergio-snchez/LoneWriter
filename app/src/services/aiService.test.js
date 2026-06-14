import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock i18n before importing AIService
vi.mock('../i18n/i18n', () => ({
  default: {
    language: 'es',
    t: (key) => {
      const map = {
        'compendium:unificar.sin_ia': 'Se requiere una clave API',
        'compendium:unificar.error_provider': 'Proveedor desconocido',
        'compendium:unificar.error_no_json': 'No se pudo parsear JSON',
      };
      return map[key] || key;
    },
  },
}));

// Mock all providers
vi.mock('./providers/gemini', () => ({
  callGemini: vi.fn(() => Promise.resolve({ text: 'gemini-response', usage: { total_tokens: 10 } })),
  callGeminiChat: vi.fn(() => Promise.resolve({ text: 'gemini-chat-response', usage: { total_tokens: 10 } })),
}));

vi.mock('./providers/openai', () => ({
  callOpenAI: vi.fn(() => Promise.resolve({ text: 'openai-response', usage: { total_tokens: 10 } })),
  callOpenAIChat: vi.fn(() => Promise.resolve({ text: 'openai-chat-response', usage: { total_tokens: 10 } })),
}));

vi.mock('./providers/claude', () => ({
  callClaude: vi.fn(() => Promise.resolve({ text: 'claude-response', usage: { total_tokens: 10 } })),
  callClaudeChat: vi.fn(() => Promise.resolve({ text: 'claude-chat-response', usage: { total_tokens: 10 } })),
}));

vi.mock('./providers/openrouter', () => ({
  callOpenRouter: vi.fn(() => Promise.resolve({ text: 'openrouter-response', usage: { total_tokens: 10 } })),
  callOpenRouterChat: vi.fn(() => Promise.resolve({ text: 'openrouter-chat-response', usage: { total_tokens: 10 } })),
}));

vi.mock('./providers/local', () => ({
  callLocal: vi.fn((prompt, model, baseUrl) => Promise.resolve({ text: 'local-response', usage: { total_tokens: 10 } })),
  callLocalChat: vi.fn(() => Promise.resolve({ text: 'local-chat-response', usage: { total_tokens: 10 } })),
}));

import { AIService } from './aiService';

const baseConfig = { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' };
const localConfig = { provider: 'local', apiKey: null, model: 'local-model', localBaseUrl: 'http://localhost:1234/v1' };

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('_callWithConfig', () => {
    it('routes to the correct provider', async () => {
      const result = await AIService._callWithConfig('test prompt', baseConfig);
      expect(result.text).toBe('openai-response');
    });

    it('routes to local provider', async () => {
      const result = await AIService._callWithConfig('test prompt', localConfig);
      expect(result.text).toBe('local-response');
    });

    it('throws for unknown provider', async () => {
      await expect(AIService._callWithConfig('test', { ...baseConfig, provider: 'unknown' }))
        .rejects.toThrow('Proveedor de IA desconocido');
    });

    it('throws when API key is missing for non-local provider', async () => {
      await expect(AIService._callWithConfig('test', { ...baseConfig, apiKey: '' }))
        .rejects.toThrow('requiere una clave API');
    });

    it('allows missing API key for local provider', async () => {
      const result = await AIService._callWithConfig('test', { provider: 'local', apiKey: '', model: 'm', localBaseUrl: 'http://localhost:1234/v1' });
      expect(result.text).toBe('local-response');
    });
  });

  describe('rewrite', () => {
    const rewriteConfig = {
      ...baseConfig,
      customInstructions: 'make it dramatic',
      pov: 'protagonist',
    };

    it('returns rewritten text from correct provider', async () => {
      const result = await AIService.rewrite('original text', 'tone', 'Rewrite this: [TONE]', rewriteConfig);
      expect(result.text).toBe('openai-response');
    });

    it('routes to local provider', async () => {
      const result = await AIService.rewrite('text', 'tone', 'Rewrite: [TONE]', { ...rewriteConfig, ...localConfig });
      expect(result.text).toBe('local-response');
    });

    it('throws for unknown provider in rewrite', async () => {
      await expect(AIService.rewrite('text', 'tone', 'Rewrite', { ...rewriteConfig, provider: 'unknown' }))
        .rejects.toThrow('Proveedor de IA desconocido');
    });

    it('includes previous context when provided', async () => {
      const result = await AIService.rewrite('new text', 'tone', 'Rewrite: [TONE]', {
        ...rewriteConfig,
        previousContext: 'previous paragraph',
      });
      expect(result.text).toBeDefined();
    });

    it('includes knowledge base when provided', async () => {
      const result = await AIService.rewrite('text', 'tone', 'Rewrite: [TONE]', {
        ...rewriteConfig,
        knowledgeBase: 'worldbuilding data',
      });
      expect(result.text).toBeDefined();
    });
  });

  describe('summarizeScene', () => {
    it('returns summary from correct provider', async () => {
      const result = await AIService.summarizeScene('scene text', baseConfig);
      expect(result.text).toBe('openai-response');
    });

    it('routes to local provider', async () => {
      const result = await AIService.summarizeScene('scene text', localConfig);
      expect(result.text).toBe('local-response');
    });

    it('throws for unknown provider', async () => {
      await expect(AIService.summarizeScene('text', { ...baseConfig, provider: 'unknown' }))
        .rejects.toThrow('Proveedor de IA desconocido');
    });
  });

  describe('autoCompleteCompendiumEntry', () => {
    const jsonResponse = JSON.stringify({ name: 'John', role: 'hero', description: 'A brave hero' });

    it('returns completed entry from correct provider (JSON parsed)', async () => {
      // Override mock for this test to return valid JSON
      const { callOpenAI } = await import('./providers/openai');
      callOpenAI.mockResolvedValueOnce({ text: jsonResponse, usage: { total_tokens: 10 } });

      const result = await AIService.autoCompleteCompendiumEntry('scene text', 'characters', 'John', { role: 'hero' }, baseConfig);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('John');
      expect(result.usage.total_tokens).toBe(10);
    });

    it('throws for unknown provider', async () => {
      await expect(AIService.autoCompleteCompendiumEntry('text', 'characters', 'John', {}, { ...baseConfig, provider: 'unknown' }))
        .rejects.toThrow('Proveedor de IA desconocido');
    });
  });

  describe('agentChat', () => {
    const agent = { id: 1, name: 'Critic', systemPrompt: 'You are a harsh critic' };
    const chatConfig = {
      ...baseConfig,
      sceneContent: 'scene text',
      pov: 'protagonist',
      roundInstruction: 'Be aggressive',
    };

    it('returns agent response', async () => {
      const result = await AIService.agentChat(agent, [{ role: 'user', text: 'What do you think?' }], chatConfig);
      expect(result.text).toBe('openai-chat-response');
    });

    it('routes to local provider', async () => {
      const result = await AIService.agentChat(agent, [{ role: 'user', text: 'What do you think?' }], { ...chatConfig, ...localConfig });
      expect(result.text).toBe('local-chat-response');
    });

    it('throws for unknown provider', async () => {
      await expect(AIService.agentChat(agent, [], { ...chatConfig, provider: 'unknown' }))
        .rejects.toThrow('Proveedor de IA desconocido');
    });
  });

  describe('fuseEntities', () => {
    const jsonResponse = JSON.stringify({ name: 'Entity A', description: 'Combined description', role: 'hero' });

    it('fuses two entities', async () => {
      const { callOpenAI } = await import('./providers/openai');
      callOpenAI.mockResolvedValueOnce({ text: jsonResponse, usage: { total_tokens: 10 } });

      const result = await AIService.fuseEntities(
        { name: 'Entity A', description: 'Desc A' },
        { name: 'Entity B', description: 'Desc B' },
        'characters',
        baseConfig,
      );
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('Entity A');
      expect(result.usage.total_tokens).toBe(10);
    });

    it('throws for unknown provider', async () => {
      await expect(AIService.fuseEntities({}, {}, 'characters', { ...baseConfig, provider: 'unknown' }))
        .rejects.toThrow('Proveedor desconocido');
    });
  });

  describe('fuseMultipleEntities', () => {
    const jsonResponse = JSON.stringify({ name: 'A', description: 'Combined', type: 'city' });

    it('fuses multiple entities', async () => {
      const { callOpenAI } = await import('./providers/openai');
      callOpenAI.mockResolvedValueOnce({ text: jsonResponse, usage: { total_tokens: 10 } });

      const result = await AIService.fuseMultipleEntities(
        [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        'locations',
        baseConfig,
      );
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('A');
      expect(result.usage.total_tokens).toBe(10);
    });
  });
});
