import { normalizeBaseUrl } from './providers/local';

export async function testConnection(config) {
  const { provider, apiKey, model, localBaseUrl } = config;
  const startTime = Date.now();
  const isEmpty = (val) => !val || typeof val !== 'string' || val.trim().length === 0;

  if (!provider) return { success: false, error: 'Selecciona un proveedor', latency: 0 };
  if (provider === 'local') {
    if (isEmpty(localBaseUrl)) return { success: false, error: 'URL del servidor no configurada', latency: 0 };
  } else {
    if (isEmpty(apiKey)) return { success: false, error: 'API key no configurada', latency: 0 };
    if (isEmpty(model)) return { success: false, error: 'Modelo no seleccionado', latency: 0 };
  }

  try {
    if (provider === 'openai') {
      const keyResponse = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      let latency = Date.now() - startTime;
      if (!keyResponse.ok) {
        if (keyResponse.status === 401) return { success: false, error: 'API key inválida', latency };
        if (keyResponse.status === 403) return { success: false, error: 'Sin permisos', latency };
        const err = await keyResponse.json();
        return { success: false, error: err.error?.message || `Error ${keyResponse.status}`, latency };
      }
      await keyResponse.json().catch(() => ({}));

      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 })
      });
      latency = Date.now() - startTime;

      if (!chatResponse.ok) {
        if (chatResponse.status === 401) return { success: false, error: 'API key inválida', latency };
        if (chatResponse.status === 403) return { success: false, error: 'Sin permisos', latency };
        if (chatResponse.status === 400) {
          const err = await chatResponse.json();
          return { success: false, error: err.error?.message || 'Modelo no válido', latency };
        }
        const err = await chatResponse.json();
        return { success: false, error: err.error?.message || `Error ${chatResponse.status}`, latency };
      }
      const chatData = await chatResponse.json().catch(() => ({}));
      if (chatData.choices && chatData.choices.length > 0) return { success: true, latency };
      return { success: false, error: 'El modelo no devolvió respuesta', latency };
    }

    if (provider === 'google') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
      });
      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.error) return { success: false, error: data.error.message || 'Error de Google API', latency };
        return { success: true, latency };
      }

      const err = await response.json().catch(() => ({}));
      if (response.status === 401 || err.error?.message?.includes('API_KEY')) return { success: false, error: 'API key inválida', latency };
      if (response.status === 403) return { success: false, error: 'Sin permisos', latency };
      if (response.status === 400 || err.error?.message?.includes('model')) return { success: false, error: err.error?.message || 'Modelo no válido', latency };
      return { success: false, error: err.error?.message || `Error ${response.status}`, latency };
    }

    if (provider === 'anthropic') {
      const keyResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: model, max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] })
      });
      const latency = Date.now() - startTime;

      if (!keyResponse.ok) {
        if (keyResponse.status === 401) return { success: false, error: 'API key inválida', latency };
        if (keyResponse.status === 403) return { success: false, error: 'Sin permisos', latency };
        if (keyResponse.status === 429) return { success: false, error: 'Límite excedido (rate limit)', latency };
        if (keyResponse.status === 400) {
          const err = await keyResponse.json();
          return { success: false, error: err.error?.message || 'Modelo no válido', latency };
        }
        const err = await keyResponse.json();
        return { success: false, error: err.error?.message || `Error ${keyResponse.status}`, latency };
      }
      await keyResponse.json().catch(() => ({}));
      return { success: true, latency };
    }

    if (provider === 'openrouter') {
      const keyResponse = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://lonewriter.app', 'X-Title': 'LoneWriter' }
      });
      let latency = Date.now() - startTime;

      if (!keyResponse.ok) {
        const errText = await keyResponse.text();
        if (keyResponse.status === 401) return { success: false, error: 'API key inválida', latency };
        if (keyResponse.status === 403) return { success: false, error: 'Sin permisos', latency };
        try {
          const err = JSON.parse(errText);
          return { success: false, error: err.error?.message || `Error ${keyResponse.status}`, latency };
        } catch {
          return { success: false, error: `Error ${keyResponse.status}`, latency };
        }
      }
      await keyResponse.json().catch(() => ({}));

      const chatResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://lonewriter.app', 'X-Title': 'LoneWriter' },
        body: JSON.stringify({ model: model || 'openrouter/auto', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 })
      });
      latency = Date.now() - startTime;

      if (!chatResponse.ok) {
        const errText = await chatResponse.text();
        if (chatResponse.status === 401) return { success: false, error: 'API key inválida', latency };
        if (chatResponse.status === 403) return { success: false, error: 'Sin permisos', latency };
        if (chatResponse.status === 400) {
          try {
            const err = JSON.parse(errText);
            return { success: false, error: err.error?.message || 'Modelo no válido o no disponible', latency };
          } catch {
            return { success: false, error: 'Modelo no válido o no disponible', latency };
          }
        }
        try {
          const err = JSON.parse(errText);
          return { success: false, error: err.error?.message || `Error ${chatResponse.status}`, latency };
        } catch {
          return { success: false, error: `Error ${chatResponse.status}`, latency };
        }
      }

      const chatData = await chatResponse.json().catch(() => ({}));
      if (chatData.choices && chatData.choices.length > 0) return { success: true, latency };
      return { success: false, error: 'El modelo no devolvió respuesta', latency };
    }

    if (provider === 'local') {
      const base = normalizeBaseUrl(localBaseUrl);
      const root = base.replace(/\/v1$/i, '');
      const fetchWithTimeout = (url) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
      };

      try {
        const openAiRes = await fetchWithTimeout(`${base}/models`);
        if (openAiRes.ok) {
          const data = await openAiRes.json().catch(() => ({}));
          if (Array.isArray(data.data) && data.data.length > 0) return { success: true, latency: Date.now() - startTime };
          return { success: false, error: 'Servidor conectado pero sin modelos cargados', latency: Date.now() - startTime };
        }

        const ollamaRes = await fetchWithTimeout(`${root}/api/tags`);
        if (ollamaRes.ok) {
          const data = await ollamaRes.json().catch(() => ({}));
          if (Array.isArray(data.models) && data.models.length > 0) return { success: true, latency: Date.now() - startTime };
          return { success: false, error: 'Servidor conectado pero sin modelos cargados', latency: Date.now() - startTime };
        }

        const err = await openAiRes.json().catch(() => ({}));
        if (openAiRes.status === 404) {
          return { success: false, error: 'Error 404: el servidor no reconoce la ruta. Verifica la URL base (ej. http://localhost:11434/v1)', latency: Date.now() - startTime };
        }
        return { success: false, error: err.error?.message || `Error ${openAiRes.status}`, latency: Date.now() - startTime };
      } catch (err) {
        const latency = Date.now() - startTime;
        if (err.name === 'AbortError') return { success: false, error: 'Sin respuesta (servidor caído)', latency };
        return { success: false, error: 'No se pudo conectar', latency };
      }
    }

    return { success: false, error: 'Proveedor desconocido' };
  } catch (err) {
    const latency = Date.now() - startTime;
    return { success: false, error: err.message || 'Error de conexión', latency };
  }
}
