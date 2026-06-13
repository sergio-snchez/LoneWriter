import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callGemini, callGeminiChat } from './gemini';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('callGemini', () => {
  const mockSuccessResponse = (text, usage = {}) => ({
    ok: true,
    json: () => Promise.resolve({
      candidates: [{ content: { parts: [{ text: `  ${text}  ` }] } }],
      usageMetadata: {
        promptTokenCount: usage.prompt_tokens || 10,
        candidatesTokenCount: usage.completion_tokens || 5,
        totalTokenCount: usage.total_tokens || 15,
      },
    }),
  });

  it('returns text and usage on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockSuccessResponse('Gemini response', { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }));

    const result = await callGemini('Test prompt', 'AIza-test', 'gemini-2.0-flash');
    expect(result.text).toBe('Gemini response');
    expect(result.usage.total_tokens).toBe(15);
  });

  it('uses the provided model in the URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockSuccessResponse('ok'));
    await callGemini('Test', 'AIza-test', 'gemini-2.0-flash');
    expect(fetch.mock.calls[0][0]).toContain('gemini-2.0-flash');
  });

  it('passes null model as-is into URL (no fallback in this function)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockSuccessResponse('ok'));
    await callGemini('Test', 'AIza-test', null);
    expect(fetch.mock.calls[0][0]).toContain('/null:generateContent');
  });

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'API key invalid' } }),
    });
    await expect(callGemini('Test', 'AIza-test', 'gemini-2.0-flash')).rejects.toThrow('API key invalid');
  });

  it('handles missing content gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: null }] } }], usageMetadata: {} }),
    });
    const result = await callGemini('Test', 'AIza-test', 'gemini-2.0-flash');
    expect(result.text).toBe('Error al generar la respuesta.');
  });
});

describe('callGeminiChat', () => {
  it('sends conversation history correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: 'Reply' }] } }],
        usageMetadata: {},
      }),
    });

    const messages = [
      { role: 'user', content: 'Hi' },
      { role: 'model', content: 'Hello' },
    ];
    await callGeminiChat('System prompt', messages, 'AIza-test', 'gemini-2.0-flash');
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody.contents).toBeDefined();
    expect(callBody.system_instruction).toBeDefined();
    expect(callBody.system_instruction.parts[0].text).toBe('System prompt');
  });
});
