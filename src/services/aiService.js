/**
 * AI Service for LoneWriter
 * Handles communication with AI providers (OpenAI, Google Gemini, Claude, OpenRouter)
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const AIService = {
  /**
   * Generic rewrite function
   * @param {string} text - Original selection
   * @param {string} goal - Goal ID (style, tone, etc.)
   * @param {string} promptTemplate - The prompt to use
   * @param {Object} config - { provider, apiKey, model, customInstructions, pov }
   */
  rewrite: async (text, goal, promptTemplate, config) => {
    const { provider, apiKey, model, customInstructions, pov, knowledgeBase } = config;

    if (!apiKey && provider !== 'local') throw new Error('Se requiere una clave API para usar la IA.');

    let finalPrompt = promptTemplate;

    // Placeholders replacement
    if (goal === 'tone') {
      finalPrompt = finalPrompt.replace('[TONO]', customInstructions || 'más dramático');
    } else if (goal === 'length') {
      finalPrompt = finalPrompt.replace('[LONGITUD]', customInstructions || 'conciso');
    } else if (goal === 'character') {
      finalPrompt = finalPrompt.replace('[PERSONAJE]', pov || 'el protagonista').replace('[CHARACTER]', pov || 'the protagonist');
    }

    let fullPrompt = `${finalPrompt}\n\nTEXTO ORIGINAL:\n"${text}"\n\nINSTRUCCIONES ADICIONALES DEL USUARIO:\n${customInstructions || 'Ninguna.'}`;

    if (knowledgeBase) {
      fullPrompt += `\n\n[BASE DE CONOCIMIENTO Y REFERENCIAS DEL AUTOR]:\n${knowledgeBase}\n---\nTEN EN CUENTA ESTA BASE DE CONOCIMIENTO AL RESPONDER.`;
    }

    fullPrompt += `\n\nRESCRITURA (Responde ÚNICAMENTE con el texto reescrito en formato HTML válido. Usa etiquetas <p>, <strong>, <em>, etc. NO uses Markdown. NO añadas introducciones ni explicaciones):`;

    if (provider === 'google') {
      return await AIService._callGemini(fullPrompt, apiKey, model);
    } else if (provider === 'openai') {
      return await AIService._callOpenAI(fullPrompt, apiKey, model);
    } else if (provider === 'anthropic') {
      return await AIService._callClaude(fullPrompt, apiKey, model);
    } else if (provider === 'openrouter') {
      return await AIService._callOpenRouter(fullPrompt, apiKey, model);
    } else if (provider === 'local') {
      return await AIService._callLocal(fullPrompt, model, config.localBaseUrl);
    } else {
      throw new Error(`Proveedor de IA desconocido: ${provider}`);
    }
  },

  /**
   * Agent chat for the Debate Forum
   * @param {Object} agent - { systemPrompt, name }
   * @param {Array}  history - Debate message history [{ role, agent, text }]
   * @param {Object} config - { provider, apiKey, model, localBaseUrl, sceneContent }
   */
  agentChat: async (agent, history, config) => {
    const { provider, apiKey, model, localBaseUrl, sceneContent, pov, roundInstruction, knowledgeBase, compendiumContext } = config;

    if (!apiKey && provider !== 'local') throw new Error('Se requiere una clave API para usar la IA.');

    let systemPrompt = agent.systemPrompt + `\n\n[DIRECTRIZ CRÍTICA]: Eres ÚNICA y EXCLUSIVAMENTE el ${agent.name}. NUNCA te salgas de tu rol. Habla SIEMPRE en primera persona del singular ("yo", "mi opinión"). NO hables de ti mismo en tercera persona. NO seas genérico ni complaciente. Aporta valor a través de tu especialidad única, y exprésate con tu propia voz. Si discrepas con otros, argumenta tu postura en lugar de simplemente darles la razón.`;

    if (knowledgeBase) {
      systemPrompt += `\n\n[BASE DE CONOCIMIENTO Y REFERENCIAS DEL AUTOR]:\n${knowledgeBase}\n---\nTEN EN CUENTA ESTA BASE DE CONOCIMIENTO AL RESPONDER Y EVALUAR.`;
    }

    if (compendiumContext) {
      systemPrompt += `\n\n${compendiumContext}\n---\nUSA ESTA INFORMACIÓN DEL COMPENDIO PARA DAR OPINIONES MÁS PRECISAS Y FIELES AL UNIVERSO DE LA NOVELA.`;
    }

    if (sceneContent || pov) {
      systemPrompt += `\n\n---\n[CONTEXTO DE LA ESCENA ACTUAL (Para tu referencia)]`;
      if (pov) {
        systemPrompt += `\nLa escena está escrita desde el punto de vista (POV) del personaje: ${pov}. (IMPORTANTE: Tú NO eres este personaje, tú eres ${agent.name} evaluando el texto).`;
      }
      if (sceneContent) {
        systemPrompt += `\nTexto:\n"${sceneContent}"`;
      }
      systemPrompt += `\n---`;
    }

    // Convert debate history into chat-style messages
    // We represent the agent's own previous messages as 'assistant' and everything else as 'user'
    const chatMessages = history.map(msg => {
      if (msg.role === 'user') {
        return { role: 'user', content: `[Autor de la obra]: ${msg.text}` };
      }
      // Agent messages: if it's this agent → assistant, otherwise fold into user context
      if (msg.agent === agent.id) {
        return { role: 'assistant', content: msg.text };
      }
      // Other agents' responses shown as context inside a user turn
      return { role: 'user', content: `[Participante - ${msg.agentName || msg.agent}]: ${msg.text}` };
    });

    // Añadimos siempre un mensaje final como "director del debate" para forzar el foco del modelo
    chatMessages.push({
      role: 'user',
      content: `[TU TURNO]: Ahora te toca intervenir a ti, ${agent.name}. Revisa todo el hilo del debate anterior, sin importar a quién se dirigieran los mensajes. Mantente fiel a tu rol y a tus instrucciones. ${roundInstruction || ''}`
    });

    if (provider === 'google') {
      return await AIService._callGeminiChat(systemPrompt, chatMessages, apiKey, model);
    } else if (provider === 'openai') {
      return await AIService._callOpenAIChat(systemPrompt, chatMessages, apiKey, model);
    } else if (provider === 'anthropic') {
      return await AIService._callClaudeChat(systemPrompt, chatMessages, apiKey, model);
    } else if (provider === 'openrouter') {
      return await AIService._callOpenRouterChat(systemPrompt, chatMessages, apiKey, model);
    } else if (provider === 'local') {
      return await AIService._callLocalChat(systemPrompt, chatMessages, model, localBaseUrl);
    } else {
      throw new Error(`Proveedor de IA desconocido: ${provider}`);
    }
  },

  /**
   * Private method for Google Gemini API
   */
  _callGemini: async (prompt, apiKey, model) => {
    try {
      const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Error en la API de Gemini');
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Error al generar la respuesta.';
    } catch (error) {
      console.error('Error in AIService._callGemini:', error);
      throw error;
    }
  },

  /**
   * Private method for OpenAI API
   */
  _callOpenAI: async (prompt, apiKey, model) => {
    try {
      const response = await fetch(OPENAI_API_URL, {
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
      return data.choices?.[0]?.message?.content?.trim() || 'Error al generar la respuesta.';
    } catch (error) {
      console.error('Error in AIService._callOpenAI:', error);
      throw error;
    }
  },

  /**
   * Private method for Anthropic (Claude) API
   */
  _callClaude: async (prompt, apiKey, model) => {
    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model || 'claude-3-haiku-20240307',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Error en la API de Anthropic');
      }

      const data = await response.json();
      return data.content?.[0]?.text?.trim() || 'Error al generar la respuesta.';
    } catch (error) {
      console.error('Error in AIService._callClaude:', error);
      throw error;
    }
  },

  /**
   * Private method for OpenRouter API
   */
  _callOpenRouter: async (prompt, apiKey, model) => {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://lonewriter.app',
          'X-Title': 'LoneWriter',
        },
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
      return data.choices?.[0]?.message?.content?.trim() || 'Error al generar la respuesta.';
    } catch (error) {
      console.error('Error in AIService._callOpenRouter:', error);
      throw error;
    }
  },

  /**
   * Private method for Local models (LM Studio / Ollama)
   * Both expose an OpenAI-compatible API at a configurable base URL.
   * LM Studio default: http://localhost:1234/v1
   * Ollama default:    http://localhost:11434/v1
   */
  _callLocal: async (prompt, model, baseUrl) => {
    const url = `${(baseUrl || 'http://localhost:1234/v1').replace(/\/$/, '')}/chat/completions`;
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
      return data.choices?.[0]?.message?.content?.trim() || 'Error al generar la respuesta.';
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`No se pudo conectar con el servidor local en ${url}. Asegúrate de que LM Studio u Ollama está en ejecución.`);
      }
      console.error('Error in AIService._callLocal:', error);
      throw error;
    }
  },

  // ── Chat variants (multi-turn) ──────────────────────────────

  _callGeminiChat: async (systemPrompt, messages, apiKey, model) => {
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
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Sin respuesta.';
    } catch (error) {
      console.error('Error in AIService._callGeminiChat:', error);
      throw error;
    }
  },

  _callOpenAIChat: async (systemPrompt, messages, apiKey, model) => {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
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
      return data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.';
    } catch (error) {
      console.error('Error in AIService._callOpenAIChat:', error);
      throw error;
    }
  },

  _callClaudeChat: async (systemPrompt, messages, apiKey, model) => {
    // Anthropic requires messages to alternate user/assistant
    // Ensure we never have two consecutive messages with the same role
    const normalized = [];
    for (const m of messages) {
      if (normalized.length > 0 && normalized[normalized.length - 1].role === m.role) {
        normalized[normalized.length - 1].content += '\n' + m.content;
      } else {
        normalized.push({ ...m });
      }
    }
    // Must start with user
    if (normalized.length === 0 || normalized[0].role !== 'user') {
      normalized.unshift({ role: 'user', content: '.' });
    }
    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-haiku-20240307',
          system: systemPrompt,
          messages: normalized,
          max_tokens: 1024,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Error en la API de Claude');
      }
      const data = await response.json();
      return data.content?.[0]?.text?.trim() || 'Sin respuesta.';
    } catch (error) {
      console.error('Error in AIService._callClaudeChat:', error);
      throw error;
    }
  },

  _callOpenRouterChat: async (systemPrompt, messages, apiKey, model) => {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://lonewriter.app',
          'X-Title': 'LoneWriter',
        },
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
      return data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.';
    } catch (error) {
      console.error('Error in AIService._callOpenRouterChat:', error);
      throw error;
    }
  },

  _callLocalChat: async (systemPrompt, messages, model, baseUrl) => {
    const url = `${(baseUrl || 'http://localhost:1234/v1').replace(/\/$/, '')}/chat/completions`;
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
      return data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.';
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`No se pudo conectar con el servidor local en ${url}.`);
      }
      console.error('Error in AIService._callLocalChat:', error);
      throw error;
    }
  }
};

