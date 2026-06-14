import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithRetry } from './fetchWithRetry';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchWithRetry', () => {
  it('returns response on first success', async () => {
    const mockResponse = { ok: true, status: 200 };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchWithRetry('https://api.test.com', {});
    expect(result).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 status', async () => {
    const mockError = { ok: false, status: 429, json: () => Promise.resolve({}) };
    const mockSuccess = { ok: true, status: 200, json: () => Promise.resolve({}) };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(mockError)
      .mockResolvedValueOnce(mockError)
      .mockResolvedValueOnce(mockSuccess);

    const resultPromise = fetchWithRetry('https://api.test.com', {}, 3);
    // Fast-forward past all retry delays
    await vi.advanceTimersByTimeAsync(10000);
    const result = await resultPromise;

    expect(result).toBe(mockSuccess);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('returns response even after all retries are exhausted (does not throw)', async () => {
    const mockError = { ok: false, status: 500, json: () => Promise.resolve({}) };
    globalThis.fetch = vi.fn().mockResolvedValue(mockError);

    const resultPromise = fetchWithRetry('https://api.test.com', {}, 2);
    await vi.advanceTimersByTimeAsync(10000);
    const result = await resultPromise;
    expect(result).toBe(mockError); // Returns the last response, does NOT throw
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 400 status', async () => {
    const mock400 = { ok: false, status: 400, json: () => Promise.resolve({}) };
    globalThis.fetch = vi.fn().mockResolvedValue(mock400);

    const resultPromise = fetchWithRetry('https://api.test.com', {}, 3);
    await vi.advanceTimersByTimeAsync(10000);
    const result = await resultPromise;

    expect(result).toBe(mock400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on fetch network error', async () => {
    const networkError = new Error('Network failure');
    const mockSuccess = { ok: true, status: 200 };
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(mockSuccess);

    const resultPromise = fetchWithRetry('https://api.test.com', {}, 2);
    await vi.advanceTimersByTimeAsync(10000);
    const result = await resultPromise;

    expect(result).toBe(mockSuccess);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses custom maxRetries', async () => {
    const mock503 = { ok: false, status: 503, json: () => Promise.resolve({}) };
    globalThis.fetch = vi.fn().mockResolvedValue(mock503);

    const resultPromise = fetchWithRetry('https://api.test.com', {}, 5);
    await vi.advanceTimersByTimeAsync(60000);
    const result = await resultPromise;
    expect(result).toBe(mock503);
    expect(fetch).toHaveBeenCalledTimes(5);
  });
});
