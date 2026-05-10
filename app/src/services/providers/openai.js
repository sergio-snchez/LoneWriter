/**
 * openai.js — OpenAI API provider.
 * Handles both single-turn (completion) and multi-turn (chat) calls.
 */
import { fetchWithRetry } from './fetchWithRetry';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Single-turn completion.
 * @param {string} prompt
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function callOpenAI(prompt, apiKey, model) {
  try {
    const response = await fetchWithRetry(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Error en la API de OpenAI');
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
    console.error('Error in callOpenAI:', error);
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
export async function callOpenAIChat(systemPrompt, messages, apiKey, model) {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.8,
        max_tokens: 1024,
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Error en la API de OpenAI');
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
    console.error('Error in callOpenAIChat:', error);
    throw error;
  }
}
