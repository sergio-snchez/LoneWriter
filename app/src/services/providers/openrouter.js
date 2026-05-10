/**
 * openrouter.js — OpenRouter API provider.
 * Handles both single-turn (completion) and multi-turn (chat) calls.
 */
import { fetchWithRetry } from './fetchWithRetry';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const OPENROUTER_HEADERS = {
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://lonewriter.app',
  'X-Title': 'LoneWriter',
};

/**
 * Single-turn completion.
 * @param {string} prompt
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function callOpenRouter(prompt, apiKey, model) {
  try {
    const response = await fetchWithRetry(OPENROUTER_API_URL, {
      method: 'POST',
      headers: { ...OPENROUTER_HEADERS, 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'openrouter/auto',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Error en la API de OpenRouter');
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content?.trim() || 'Error al generar la respuesta.',
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error('Error in callOpenRouter:', error);
    throw error;
  }
}

/**
 * Multi-turn chat.
 * @param {string} systemPrompt
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function callOpenRouterChat(systemPrompt, messages, apiKey, model) {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: { ...OPENROUTER_HEADERS, 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'openrouter/auto',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.8,
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Error en la API de OpenRouter');
    }
    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.',
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error('Error in callOpenRouterChat:', error);
    throw error;
  }
}
