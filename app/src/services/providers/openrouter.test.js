import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callOpenRouter, callOpenRouterChat } from './openrouter';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('callOpenRouter', () => {
  it('returns text and usage on success', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '  OR response  ' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await callOpenRouter('Test prompt', 'sk-or-test', 'openai/gpt-4o');
    expect(result.text).toBe('OR response');
    expect(result.usage.total_tokens).toBe(15);
  });

  it('sends OpenRouter-specific headers', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'ok' } }],
        usage: {},
      }),
    });

    await callOpenRouter('Test', 'sk-or-test', 'openai/gpt-4o');
    expect(fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-or-test',
          'HTTP-Referer': expect.any(String),
          'X-Title': expect.any(String),
        }),
      }),
    );
  });
});

describe('callOpenRouterChat', () => {
  it('sends chat messages correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Reply' } }],
        usage: {},
      }),
    });

    const messages = [{ role: 'user', content: 'Hello' }];
    await callOpenRouterChat('System prompt', messages, 'sk-or-test', 'openai/gpt-4o');
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody.messages[0].role).toBe('system');
    expect(callBody.messages[1]).toEqual(messages[0]);
  });
});
