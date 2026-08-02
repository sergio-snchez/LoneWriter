import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callLocal, callLocalChat, normalizeBaseUrl } from './local';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('callLocal', () => {
  it('returns text and usage on success with default URL', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '  Local response  ' } }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await callLocal('Test prompt', 'local-model');
    expect(result.text).toBe('Local response');
    expect(result.usage.total_tokens).toBe(8);
  });

  it('uses custom baseUrl', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'ok' } }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await callLocal('Test', 'my-model', 'http://localhost:11434/v1');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.any(Object),
    );
  });

  it('auto-adds /v1 when baseUrl lacks it (e.g. Ollama raw port)', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'ok' } }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await callLocal('Test', 'model', 'http://localhost:11434');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.any(Object),
    );
  });

  it('does not duplicate /v1 when baseUrl already includes it', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'ok' } }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await callLocal('Test', 'model', 'http://localhost:11434/v1');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.any(Object),
    );
  });

  it('normalizes trailing slash in baseUrl', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'ok' } }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await callLocal('Test', 'model', 'http://localhost:11434/v1/');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.any(Object),
    );
  });

  it('uses default model when none provided', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'ok' } }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await callLocal('Test', null, 'http://localhost:1234/v1');
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('local-model');
  });

  it('throws an actionable error on fetch TypeError', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(callLocal('Test', 'model')).rejects.toThrow(
      'No se pudo conectar con el servidor local',
    );
  });

  it('throws on empty content response', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: null } }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(callLocal('Test', 'model')).rejects.toThrow(
      'no devolvió contenido',
    );
  });
});

describe('normalizeBaseUrl', () => {
  it('appends /v1 when missing', () => {
    expect(normalizeBaseUrl('http://localhost:11434')).toBe('http://localhost:11434/v1');
  });

  it('keeps URL unchanged when it already ends with /v1', () => {
    expect(normalizeBaseUrl('http://localhost:11434/v1')).toBe('http://localhost:11434/v1');
  });

  it('strips trailing slashes before appending /v1', () => {
    expect(normalizeBaseUrl('http://localhost:11434/')).toBe('http://localhost:11434/v1');
    expect(normalizeBaseUrl('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1');
  });

  it('respects /V1 case-insensitively without duplicating', () => {
    expect(normalizeBaseUrl('http://localhost:11434/V1')).toBe('http://localhost:11434/V1');
  });

  it('falls back to the default URL when empty', () => {
    expect(normalizeBaseUrl('')).toBe('http://localhost:1234/v1');
  });
});

describe('callLocalChat', () => {
  it('sends system prompt and messages', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Chat response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const messages = [{ role: 'user', content: 'Hello' }];
    const result = await callLocalChat('System prompt', messages, 'local-model');
    expect(result.text).toBe('Chat response');
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody.messages[0].role).toBe('system');
    expect(callBody.messages[1]).toEqual(messages[0]);
  });
});
