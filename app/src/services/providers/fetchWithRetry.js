/**
 * fetchWithRetry — HTTP wrapper with exponential-backoff retry.
 * Shared across all AI provider modules.
 */

/** HTTP status codes that are safe to retry (rate-limit / server overload) */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/** Default timeout per attempt (30s). */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * fetch() wrapper with exponential backoff retry and timeout.
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options (method, headers, body, etc.)
 * @param {number} [maxRetries=3] - Maximum number of retry attempts
 * @param {number} [timeoutMs=30000] - Timeout per attempt in ms
 * @returns {Promise<Response>} The fetch Response object
 * @throws {Error} If all retries fail with a non-retryable error
 */
export async function fetchWithRetry(url, options, maxRetries = 3, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (RETRYABLE_STATUSES.has(response.status)) {
        const waitMs = Math.min(1000 * 2 ** attempt, 8000);
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        return response;
      }
      return response;
    } catch (err) {
      clearTimeout();
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}
