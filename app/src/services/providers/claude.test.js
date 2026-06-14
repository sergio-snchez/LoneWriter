import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callClaude, callClaudeChat } from './claude';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('callClaude', () => {
  it('returns text and usage on success', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: '  Claude response  ' }],
        usage: { input_tokens: 15, output_tokens: 8 },
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await callClaude('Test prompt', 'sk-ant-test', 'claude-3-haiku');
    expect(result.text).toBe('Claude response');
    expect(result.usage.prompt_tokens).toBe(15);
    expect(result.usage.completion_tokens).toBe(8);
    expect(result.usage.total_tokens).toBe(23);
  });

  it('sends Anthropic-specific headers', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: 'ok' }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await callClaude('Test', 'sk-ant-test', 'claude-3-haiku');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test',
          'anthropic-version': '2023-06-01',
        }),
      }),
    );
  });
});

describe('callClaudeChat', () => {
  it('normalizes consecutive same-role messages', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: 'ok' }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const messages = [
      { role: 'user', content: 'Hi' },
      { role: 'user', content: 'Hello again' },
    ];
    await callClaudeChat('System prompt', messages, 'sk-ant-test', 'claude-3-haiku');
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);

    // Should have merged the two user messages
    expect(callBody.messages).toHaveLength(1);
    expect(callBody.messages[0].content).toContain('Hi');
    expect(callBody.messages[0].content).toContain('Hello again');
  });

  it('prepends a user message if history starts with assistant', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: 'ok' }],
        usage: {},
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await callClaudeChat('System', [{ role: 'assistant', content: 'Hello' }], 'sk-ant-test', 'claude-3-haiku');
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody.messages[0].role).toBe('user');
  });
});
