/**
 * gemini.js — Google Gemini API provider.
 * Handles both single-turn (completion) and multi-turn (chat) calls.
 */
import { fetchWithRetry } from './fetchWithRetry';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Single-turn completion (used by rewrite, summarize, autocomplete, fuse).
 * @param {string} prompt
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function callGemini(prompt, apiKey, model) {
  try {
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Error en la API de Gemini');
    }

    const data = await response.json();
    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Error al generar la respuesta.',
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  } catch (error) {
    console.error('Error in callGemini:', error);
    throw error;
  }
}

/**
 * Multi-turn chat (used by Debate agentChat).
 * @param {string} systemPrompt
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function callGeminiChat(systemPrompt, messages, apiKey, model) {
  const url = `${GEMINI_API_BASE}/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`;
  // Gemini uses 'contents' with 'user'/'model' roles
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Error en la API de Gemini');
    }
    const data = await response.json();
    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Sin respuesta.',
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  } catch (error) {
    console.error('Error in callGeminiChat:', error);
    throw error;
  }
}
