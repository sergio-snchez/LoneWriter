/**
 * AI Service for LoneWriter
 * Handles communication with AI providers (OpenAI, Google Gemini, Claude, OpenRouter)
 */

import i18n from '../i18n/i18n';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Retryable HTTP status codes (rate-limit / server overload) */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * fetch() wrapper with exponential backoff retry.
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} maxRetries - default 3
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
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

export const AIService = {
  /**
   * Generic rewrite function
   * @param {string} text - Original selection
   * @param {string} goal - Goal ID (style, tone, etc.)
   * @param {string} promptTemplate - The prompt to use
   * @param {Object} config - { provider, apiKey, model, customInstructions, pov, previousContext }
   */
  rewrite: async (text, goal, promptTemplate, config) => {
    const { provider, apiKey, model, customInstructions, pov, knowledgeBase, previousContext } = config;
    const isSpanish = i18n.language === 'es';

    if (!apiKey && provider !== 'local') throw new Error(isSpanish ? 'Se requiere una clave API para usar la IA.' : 'An API key is required to use the AI.');

    let finalPrompt = promptTemplate;
    const noneText = isSpanish ? 'Ninguna.' : 'None.';

    if (goal === 'tone') {
      const defaultTone = isSpanish ? 'más dramático' : 'more dramatic';
      finalPrompt = finalPrompt.replace('[TONO]', customInstructions || defaultTone).replace('[TONE]', customInstructions || defaultTone);
    } else if (goal === 'length') {
      const defaultLength = isSpanish ? 'conciso' : 'concise';
      finalPrompt = finalPrompt.replace('[LONGITUD]', customInstructions || defaultLength).replace('[LENGTH]', customInstructions || defaultLength);
    } else if (goal === 'character') {
      const defaultChar = isSpanish ? 'el protagonista' : 'the protagonist';
      finalPrompt = finalPrompt.replace('[PERSONAJE]', pov || defaultChar).replace('[CHARACTER]', pov || defaultChar);
    }

    const originalTextLabel = isSpanish ? 'TEXTO ORIGINAL:' : 'ORIGINAL TEXT:';
    const additionalLabel = isSpanish ? 'INSTRUCCIONES ADICIONALES DEL USUARIO:' : "USER'S ADDITIONAL INSTRUCTIONS:";
    let fullPrompt = `${finalPrompt}\n\n${originalTextLabel}\n"${text}"\n\n${additionalLabel}\n${customInstructions || noneText}`;

    if (previousContext) {
      const contextLabel = isSpanish ? '[CONTEXTO PREVIO]:' : '[PREVIOUS CONTEXT]:';
      const contextNote = isSpanish 
        ? 'ADAPTA la fluidez del texto nuevo al estilo y ritmo del contexto anterior. NO reescribas el texto antiguo.' 
        : 'ADAPT the flow of the new text to match the style and rhythm of the previous context. Do NOT rewrite the old text.';
      fullPrompt += `\n\n${contextLabel}\n"${previousContext}"\n\n${contextNote}`;
    }

    if (knowledgeBase) {
      const kbLabel = isSpanish ? '[BASE DE CONOCIMIENTO Y REFERENCIAS DEL AUTOR]:' : "[AUTHOR'S KNOWLEDGE BASE AND REFERENCES]:";
      const kbNote = isSpanish ? 'TEN EN CUENTA ESTA BASE DE CONOCIMIENTO AL RESPONDER.' : 'TAKE THIS KNOWLEDGE BASE INTO ACCOUNT WHEN RESPONDING.';
      fullPrompt += `\n\n${kbLabel}\n${knowledgeBase}\n---\n${kbNote}`;
    }


    const outputLabel = isSpanish ? 'RESCRITURA (Responde ÚNICAMENTE con el texto reescrito en formato HTML válido. Usa etiquetas <p>, <strong>, <em>, etc. NO uses Markdown. NO añadas introducciones ni explicaciones):' : 'REWRITE (Respond ONLY with the rewritten text in valid HTML format. Use tags like <p>, <strong>, <em>, etc. Do NOT use Markdown. Do NOT add introductions or explanations):';
    fullPrompt += `\n\n${outputLabel}`;

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
   * Auto-completes a compendium entry based on the novel text.
   * @param {string} sceneText - Background text from the novel
   * @param {string} type - Compendium category (characters, locations, etc)
   * @param {string} name - Entity name
   * @param {Object} currentData - Current entity object
   * @param {Object} config - { provider, apiKey, model, localBaseUrl }
   */
  autoCompleteCompendiumEntry: async (sceneText, type, name, currentData, config) => {
    const { provider, apiKey, model, localBaseUrl } = config;
    const isSpanish = i18n.language === 'es';

    const errorAPI = isSpanish ? 'Se requiere una clave API para usar la IA.' : 'An API key is required to use the AI.';
    const errorProvider = isSpanish ? 'Proveedor de IA desconocido.' : 'Unknown AI provider.';

    if (!apiKey && provider !== 'local') throw new Error(errorAPI);

    const promptTemplate = isSpanish
      ? `Actúa como un asistente literario experto. Vas a rellenar automáticamente la ficha de "${name}" (${type}) para el Compendio de la novela, infiriendo los datos ESTRICTAMENTE a partir del siguiente fragmento de la historia. No inventes absolutamente nada que no se deduzca de este texto.\n\n[CONTEXTO DE LA NOVELA]\n${sceneText}\n\n[DATOS EXISTENTES (Mantén estos o mejóralos si el texto lo justifica)]\n${JSON.stringify(currentData, null, 2)}\n\nINSTRUCCIONES DE FORMATO:\nDevuelve ÚNICAMENTE un JSON válido (sin marcas de formato markdown \`\`\`json ni texto previo o posterior). Usa esta estructura según el tipo, omitiendo campos si no hay información en el texto:\n- characters: { "role": "", "occupation": "", "age": 0, "description": "", "traits": ["rasgo1", "rasgo2"], "relations": [{ "name": "NombreOtro", "type": "como lo veo", "reverseType": "como me ve" }] }\n- locations: { "type": "", "climate": "", "description": "", "tags": ["tag1"] }\n- objects: { "type": "", "description": "", "origin": "", "currentOwner": "", "tags": ["tag1"] }\n- lore: { "category": "", "summary": "", "tags": ["tag1"] }`
      : `Act as an expert literary assistant. You will automatically fill in the entry for "${name}" (${type}) for the novel's Compendium, inferring the data STRICTLY from the following fragment of the story. Do not invent absolutely anything that cannot be deduced from this text.\n\n[NOVEL CONTEXT]\n${sceneText}\n\n[EXISTING DATA (Keep these or improve them if the text justifies)]\n${JSON.stringify(currentData, null, 2)}\n\nFORMAT INSTRUCTIONS:\nReturn ONLY valid JSON (without markdown formatting markers \`\`\`json or any preceding or following text). Use this structure according to the type, omitting fields if there is no information in the text:\n- characters: { "role": "", "occupation": "", "age": 0, "description": "", "traits": ["trait1", "trait2"], "relations": [{ "name": "OtherName", "type": "how I see them", "reverseType": "how they see me" }] }\n- locations: { "type": "", "climate": "", "description": "", "tags": ["tag1"] }\n- objects: { "type": "", "description": "", "origin": "", "currentOwner": "", "tags": ["tag1"] }\n- lore: { "category": "", "summary": "", "tags": ["tag1"] }`;

    let response = null;
    if (provider === 'google') {
      response = await AIService._callGemini(promptTemplate, apiKey, model);
    } else if (provider === 'openai') {
      response = await AIService._callOpenAI(promptTemplate, apiKey, model);
    } else if (provider === 'anthropic') {
      response = await AIService._callClaude(promptTemplate, apiKey, model);
    } else if (provider === 'openrouter') {
      response = await AIService._callOpenRouter(promptTemplate, apiKey, model);
    } else if (provider === 'local') {
      response = await AIService._callLocal(promptTemplate, model, localBaseUrl);
    } else {
      throw new Error(errorProvider);
    }

    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return { data: JSON.parse(match[0]), usage: response.usage };
      }
      return { data: JSON.parse(text), usage: response.usage };
    } catch (e) {
      console.error("[AIService] JSON parse error in auto-complete", e, response.text);
      throw new Error(i18n.language === 'es' ? 'El modelo no devolvió un JSON válido.' : 'The model did not return valid JSON.');
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
    const isSpanish = i18n.language === 'es';

    const errorAPI = isSpanish ? 'Se requiere una clave API para usar la IA.' : 'An API key is required to use the AI.';
    const errorProvider = isSpanish ? 'Proveedor de IA desconocido.' : 'Unknown AI provider.';
    const debateDirective = isSpanish 
      ? `[DIRECTRIZ CRÍTICA]: Eres ÚNICA y EXCLUSIVAMENTE el ${agent.name}. NUNCA te salgas de tu rol. Habla SIEMPRE en primera persona del singular ("yo", "mi opinión"). NO hables de ti mismo en tercera persona. NO seas genérico ni complaciente.`
      : `[CRITICAL DIRECTIVE]: You are UNIQUE and EXCLUSIVELY ${agent.name}. NEVER leave your role. ALWAYS speak in first person singular ("I", "my opinion"). Do NOT refer to yourself in third person. Do NOT be generic.`;
    
    if (!apiKey && provider !== 'local') throw new Error(errorAPI);

    let systemPrompt = agent.systemPrompt + '\n\n' + debateDirective;

    if (knowledgeBase) {
      const kbLabel = isSpanish ? '[BASE DE CONOCIMIENTO Y REFERENCIAS DEL AUTOR]:' : "[AUTHOR'S KNOWLEDGE BASE AND REFERENCES]:";
      const kbNote = isSpanish ? 'TEN EN CUENTA ESTA BASE DE CONOCIMIENTO AL RESPONDER Y EVALUAR.' : 'TAKE THIS KNOWLEDGE BASE INTO ACCOUNT WHEN RESPONDING AND EVALUATING.';
      systemPrompt += `\n\n${kbLabel}\n${knowledgeBase}\n---\n${kbNote}`;
    }

    if (compendiumContext) {
      const cpNote = isSpanish ? 'USA ESTA INFORMACIÓN DEL COMPENDIO PARA DAR OPINIONES MÁS PRECISAS Y FIELES AL UNIVERSO DE LA NOVELA.' : 'USE THIS COMPENDIUM INFORMATION TO GIVE MORE PRECISE OPINIONS FAITHFUL TO THE NOVEL UNIVERSE.';
      systemPrompt += `\n\n${compendiumContext}\n---\n${cpNote}`;
    }

    if (sceneContent || pov) {
      const sceneCtx = isSpanish ? '[CONTEXTO DE LA ESCENA ACTUAL (Para tu referencia)]' : '[CURRENT SCENE CONTEXT (For your reference)]';
      systemPrompt += `\n\n---${sceneCtx}`;
      if (pov) {
        const povNote = isSpanish 
          ? `La escena está escrita desde el punto de vista (POV) del personaje: ${pov}. (IMPORTANTE: Tú NO eres este personaje, tú eres ${agent.name} evaluando el texto).`
          : `The scene is written from the point of view (POV) of: ${pov}. (IMPORTANT: You are NOT this character, you are ${agent.name} evaluating the text).`;
        systemPrompt += `\n${povNote}`;
      }
      if (sceneContent) {
        const textLabel = isSpanish ? 'Texto' : 'Text';
        systemPrompt += `\n${textLabel}:\n"${sceneContent}"`;
      }
      systemPrompt += '\n---';
    }

    if (config.ragContext) {
      const ragLabel = isSpanish ? '[RECUERDOS DE CAPÍTULOS ANTERIORES DEL MANUSCRITO]' : '[MEMORIES OF PREVIOUS MANUSCRIPT CHAPTERS]';
      const ragNote = isSpanish ? 'USA ESTA INFORMACIÓN PASADA DEL MANUSCRITO PARA SUSTENTAR TUS OPINIONES O RESPONDER PREGUNTAS DEL USUARIO SOBRE EVENTOS PREVIOS.' : 'USE THIS PAST MANUSCRIPT INFORMATION TO SUPPORT YOUR OPINIONS OR ANSWER USER QUESTIONS ABOUT PREVIOUS EVENTS.';
      systemPrompt += `\n\n${ragLabel}\n${config.ragContext}\n---\n${ragNote}`;
    }

    const authorLabel = isSpanish ? '[Autor de la obra]:' : '[Author of the work]:';
    const participantLabel = isSpanish 
      ? (name) => `[Participante - ${name}]:` 
      : (name) => `[Participant - ${name}]:`;
    const yourTurn = isSpanish 
      ? `[TU TURNO]: Ahora te toca intervenir a ti, ${agent.name}. Revisa todo el hilo del debate anterior, sin importar a quién se dirigieran los mensajes. Mantente fiel a tu rol y a tus instrucciones. ${roundInstruction || ''}`
      : `[YOUR TURN]: Now it's your turn, ${agent.name}. Review the entire previous debate thread, regardless of whom the messages were directed to. Stay true to your role and instructions. ${roundInstruction || ''}`;

    const chatMessages = history.map(msg => {
      if (msg.role === 'user') {
        return { role: 'user', content: authorLabel + ' ' + msg.text };
      }
      if (msg.agent === agent.id) {
        return { role: 'assistant', content: msg.text };
      }
      return { role: 'user', content: participantLabel(msg.agentName || msg.agent) + ' ' + msg.text };
    });

    chatMessages.push({ role: 'user', content: yourTurn });

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
      throw new Error(errorProvider);
    }
  },

  /**
   * Private method for Google Gemini API
   */
  _callGemini: async (prompt, apiKey, model) => {
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
          }
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
          total_tokens: data.usageMetadata?.totalTokenCount || 0
        }
      };
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
          total_tokens: data.usage?.total_tokens || 0
        }
      };
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
      const response = await fetchWithRetry(CLAUDE_API_URL, {
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
      return {
        text: data.content?.[0]?.text?.trim() || 'Error al generar la respuesta.',
        usage: {
          prompt_tokens: data.usage?.input_tokens || 0,
          completion_tokens: data.usage?.output_tokens || 0,
          total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
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
      const response = await fetchWithRetry(OPENROUTER_API_URL, {
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
      return {
        text: data.choices?.[0]?.message?.content?.trim() || 'Error al generar la respuesta.',
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0
        }
      };
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
      
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('La IA local no devolvió contenido. Verifica que el modelo esté cargado correctamente en LM Studio.');
      }
      
      return {
        text: content.trim(),
        usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      };
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`No se pudo conectar con el servidor local en ${url}. Asegúrate de que LM Studio u Ollama está en ejecución.`);
      }
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
      return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Sin respuesta.',
        usage: {
          prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
          completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: data.usageMetadata?.totalTokenCount || 0
        }
      };
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
      return {
        text: data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.',
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0
        }
      };
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
      return {
        text: data.content?.[0]?.text?.trim() || 'Sin respuesta.',
        usage: {
          prompt_tokens: data.usage?.input_tokens || 0,
          completion_tokens: data.usage?.output_tokens || 0,
          total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
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
      return {
        text: data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.',
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0
        }
      };
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
      return {
        text: data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.',
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`No se pudo conectar con el servidor local en ${url}.`);
      }
      console.error('Error in AIService._callLocalChat:', error);
      throw error;
    }
  },

  /**
   * Test de conexión con el proveedor
   * @param {Object} config - { provider, apiKey, model, localBaseUrl }
   * @returns {Promise<{success: boolean, latency: number, error?: string}>}
   */
  testConnection: async (config) => {
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1
          })
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
        
        if (chatData.choices && chatData.choices.length > 0) {
          return { success: true, latency };
        }
        return { success: false, error: 'El modelo no devolvió respuesta', latency };
      }

      if (provider === 'google') {
        const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
        });
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data.error) {
            return { success: false, error: data.error.message || 'Error de Google API', latency };
          }
          return { success: true, latency };
        }
        
        const err = await response.json().catch(() => ({}));
        if (response.status === 401 || err.error?.message?.includes('API_KEY')) {
          return { success: false, error: 'API key inválida', latency };
        }
        if (response.status === 403) return { success: false, error: 'Sin permisos', latency };
        if (response.status === 400 || err.error?.message?.includes('model')) {
          return { success: false, error: err.error?.message || 'Modelo no válido', latency };
        }
        return { success: false, error: err.error?.message || `Error ${response.status}`, latency };
      }

      if (provider === 'anthropic') {
        const keyResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        });
        let latency = Date.now() - startTime;
        
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
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://lonewriter.app',
            'X-Title': 'LoneWriter'
          }
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://lonewriter.app',
            'X-Title': 'LoneWriter'
          },
          body: JSON.stringify({
            model: model || 'openrouter/auto',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1
          })
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
        
        if (chatData.choices && chatData.choices.length > 0) {
          return { success: true, latency };
        }
        return { success: false, error: 'El modelo no devolvió respuesta', latency };
      }

      if (provider === 'local') {
        const url = `${(localBaseUrl || 'http://localhost:1234/v1').replace(/\/$/, '')}/models`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          
          if (response.ok) {
            const data = await response.json().catch(() => ({}));
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
              return { success: true, latency };
            }
            return { success: false, error: 'No se pudieron obtener modelos', latency };
          }
          const err = await response.json().catch(() => ({}));
          return { success: false, error: err.error?.message || `Error ${response.status}`, latency };
        } catch (err) {
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          if (err.name === 'AbortError') {
            return { success: false, error: 'Sin respuesta (servidor caído)', latency };
          }
          return { success: false, error: 'No se pudo conectar', latency };
        }
      }

      return { success: false, error: 'Proveedor desconocido' };
    } catch (err) {
      const latency = Date.now() - startTime;
      return { success: false, error: err.message || 'Error de conexión', latency };
    }
  }
};

