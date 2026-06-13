import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callOpenAI, callOpenAIChat } from './openai';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('callOpenAI', () => {
  it('returns text and usage on success', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '  Hello World  ' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await callOpenAI('Test prompt', 'sk-test', 'gpt-4o');
    expect(result.text).toBe('Hello World');
    expect(result.usage.total_tokens).toBe(15);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      }),
    );
  });

  it('uses default model when none provided', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'response' } }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await callOpenAI('Test prompt', 'sk-test', null);
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('gpt-4o-mini');
  });

  it('throws on non-ok response', async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(callOpenAI('Test prompt', 'sk-test', 'gpt-4o')).rejects.toThrow('Rate limit exceeded');
  });

  it('handles missing content gracefully', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: null } }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await callOpenAI('Test', 'sk-test', 'gpt-4o');
    expect(result.text).toBe('Error al generar la respuesta.');
  });
});

describe('callOpenAIChat', () => {
  it('sends system prompt and messages correctly', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Chat response' } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const messages = [{ role: 'user', content: 'Hello' }];
    const result = await callOpenAIChat('You are a helper', messages, 'sk-test', 'gpt-4o');

    expect(result.text).toBe('Chat response');
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody.messages[0].role).toBe('system');
    expect(callBody.messages[0].content).toBe('You are a helper');
    expect(callBody.messages[1]).toEqual(messages[0]);
  });
});
