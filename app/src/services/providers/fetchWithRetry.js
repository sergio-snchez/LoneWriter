/**
 * fetchWithRetry — HTTP wrapper with exponential-backoff retry.
 * Shared across all AI provider modules.
 */

/** HTTP status codes that are safe to retry (rate-limit / server overload) */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * fetch() wrapper with exponential backoff retry.
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options (method, headers, body, etc.)
 * @param {number} [maxRetries=3] - Maximum number of retry attempts
 * @returns {Promise<Response>} The fetch Response object
 * @throws {Error} If all retries fail with a non-retryable error
 */
export async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
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
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}
