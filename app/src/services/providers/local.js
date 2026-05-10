/**
 * local.js — Local model provider (LM Studio / Ollama).
 * Both expose an OpenAI-compatible API at a configurable base URL.
 *
 * LM Studio default: http://localhost:1234/v1
 * Ollama default:    http://localhost:11434/v1
 */

const DEFAULT_BASE_URL = 'http://localhost:1234/v1';

function buildUrl(baseUrl) {
  return `${(baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')}/chat/completions`;
}

/**
 * Single-turn completion.
 * @param {string} prompt
 * @param {string} model
 * @param {string} baseUrl
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function callLocal(prompt, model, baseUrl) {
  const url = buildUrl(baseUrl);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'local-model',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error ${response.status} conectando con el servidor local (${url})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('La IA local no devolvió contenido. Verifica que el modelo esté cargado correctamente en LM Studio.');
    }

    return {
      text: content.trim(),
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`No se pudo conectar con el servidor local en ${url}. Asegúrate de que LM Studio u Ollama está en ejecución.`);
    }
    throw error;
  }
}

/**
 * Multi-turn chat.
 * @param {string} systemPrompt
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} model
 * @param {string} baseUrl
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function callLocalChat(systemPrompt, messages, model, baseUrl) {
  const url = buildUrl(baseUrl);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'local-model',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.8,
        stream: false,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error ${response.status}`);
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
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`No se pudo conectar con el servidor local en ${url}.`);
    }
    console.error('Error in callLocalChat:', error);
    throw error;
  }
}
