/**
 * AI Service for LoneWriter
 * Handles communication with AI providers via specialized modules.
 *
 * @typedef {Object} AIConfig
 * @property {string} provider - Provider name ('google'|'openai'|'anthropic'|'openrouter'|'local')
 * @property {string} [apiKey] - API key for the provider
 * @property {string} [model] - Model identifier
 * @property {string} [localBaseUrl] - Base URL for local provider
 * @property {string} [customInstructions] - Custom user instructions
 * @property {string} [pov] - Point-of-view character
 * @property {string} [knowledgeBase] - Knowledge base context
 * @property {string} [previousContext] - Previous scene context
 * @property {string} [sceneContent] - Current scene content
 * @property {string} [roundInstruction] - Debate round instruction
 * @property {string} [compendiumContext] - Compendium context
 * @property {string} [ragContext] - RAG-retrieved context
 *
 * @typedef {Object} AIResponse
 * @property {string} text - The generated text
 * @property {{prompt_tokens: number, completion_tokens: number, total_tokens: number}} usage - Token usage
 */
import i18n from '../i18n/i18n';
import { callGemini, callGeminiChat } from './providers/gemini';
import { callOpenAI, callOpenAIChat } from './providers/openai';
import { callClaude, callClaudeChat } from './providers/claude';
import { callOpenRouter, callOpenRouterChat } from './providers/openrouter';
import { callLocal, callLocalChat } from './providers/local';
import { testConnection } from './aiTestService';

/* ─── Provider registry ────────────────────────────────────────────────────
 *
 * Lookup tables that map provider names to their call functions.
 * Normalise the `local` provider's different signature transparently.
 */

const PROVIDER_COMPLETION = {
  google:    (prompt, { apiKey, model })                => callGemini(prompt, apiKey, model),
  openai:    (prompt, { apiKey, model })                => callOpenAI(prompt, apiKey, model),
  anthropic: (prompt, { apiKey, model })                => callClaude(prompt, apiKey, model),
  openrouter:(prompt, { apiKey, model })                => callOpenRouter(prompt, apiKey, model),
  local:     (prompt, { model, localBaseUrl })          => callLocal(prompt, model, localBaseUrl),
};

const PROVIDER_CHAT = {
  google:    (sys, msgs, { apiKey, model })             => callGeminiChat(sys, msgs, apiKey, model),
  openai:    (sys, msgs, { apiKey, model })             => callOpenAIChat(sys, msgs, apiKey, model),
  anthropic: (sys, msgs, { apiKey, model })             => callClaudeChat(sys, msgs, apiKey, model),
  openrouter:(sys, msgs, { apiKey, model })             => callOpenRouterChat(sys, msgs, apiKey, model),
  local:     (sys, msgs, { model, localBaseUrl })       => callLocalChat(sys, msgs, model, localBaseUrl),
};

/** Look up a provider in a registry; throw a meaningful error if missing. */
function getProvider(registry, provider, errorMsg) {
  const fn = registry[provider];
  if (!fn) throw new Error(errorMsg);
  return fn;
}

/* ─── Shared helpers ─────────────────────────────────────────────────────── */

const t = (es, en) => (i18n.language === 'es' ? es : en);

function requireApiKey(apiKey, provider) {
  if (!apiKey && provider !== 'local') {
    throw new Error(t(
      'Se requiere una clave API para usar la IA.',
      'An API key is required to use the AI.',
    ));
  }
}

export const AIService = {
  /**
   * Generic call method for MPC and other direct prompting.
   * @param {string} promptTemplate
   * @param {AIConfig} config
   * @returns {Promise<AIResponse>}
   */
  _callWithConfig: async (promptTemplate, config) => {
    const { provider } = config;
    requireApiKey(config.apiKey, provider);
    const fn = getProvider(PROVIDER_COMPLETION, provider, t(
      'Proveedor de IA desconocido.',
      'Unknown AI provider.',
    ));
    return await fn(promptTemplate, config);
  },

  /**
   * Generic rewrite function
   * @param {string} text - Original text to rewrite
   * @param {string} goal - Rewrite goal ('tone'|'length'|'character'|'style')
   * @param {string} promptTemplate - Prompt template with placeholders
   * @param {AIConfig} config
   * @returns {Promise<AIResponse>}
   */
  rewrite: async (text, goal, promptTemplate, config) => {
    const { provider, apiKey, customInstructions, pov, knowledgeBase, previousContext } = config;
    requireApiKey(apiKey, provider);

    let finalPrompt = promptTemplate;
    const noneText = t('Ninguna.', 'None.');

    if (goal === 'tone') {
      const defaultTone = t('más dramático', 'more dramatic');
      finalPrompt = finalPrompt.replace('[TONO]', customInstructions || defaultTone).replace('[TONE]', customInstructions || defaultTone);
    } else if (goal === 'length') {
      const defaultLength = t('conciso', 'concise');
      finalPrompt = finalPrompt.replace('[LONGITUD]', customInstructions || defaultLength).replace('[LENGTH]', customInstructions || defaultLength);
    } else if (goal === 'character') {
      const defaultChar = t('el protagonista', 'the protagonist');
      finalPrompt = finalPrompt.replace('[PERSONAJE]', pov || defaultChar).replace('[CHARACTER]', pov || defaultChar);
    }

    const originalTextLabel = t('TEXTO ORIGINAL:', 'ORIGINAL TEXT:');
    const additionalLabel = t('INSTRUCCIONES ADICIONALES DEL USUARIO:', "USER'S ADDITIONAL INSTRUCTIONS:");
    let fullPrompt = `${finalPrompt}\n\n${originalTextLabel}\n"${text}"\n\n${additionalLabel}\n${customInstructions || noneText}`;

    if (previousContext) {
      const contextLabel = t('[CONTEXTO PREVIO]:', '[PREVIOUS CONTEXT]:');
      const contextNote = t(
        'ADAPTA la fluidez del texto nuevo al estilo y ritmo del contexto anterior. NO reescribas el texto antiguo.',
        'ADAPT the flow of the new text to match the style and rhythm of the previous context. Do NOT rewrite the old text.',
      );
      fullPrompt += `\n\n${contextLabel}\n"${previousContext}"\n\n${contextNote}`;
    }

    if (knowledgeBase) {
      const kbLabel = t('[BASE DE CONOCIMIENTO Y REFERENCIAS DEL AUTOR]:', "[AUTHOR'S KNOWLEDGE BASE AND REFERENCES]:");
      const kbNote = t('TEN EN CUENTA ESTA BASE DE CONOCIMIENTO AL RESPONDER.', 'TAKE THIS KNOWLEDGE BASE INTO ACCOUNT WHEN RESPONDING.');
      fullPrompt += `\n\n${kbLabel}\n${knowledgeBase}\n---\n${kbNote}`;
    }

    const outputLabel = t(
      'RESCRITURA (Responde ÚNICAMENTE con el texto reescrito en formato HTML válido. Usa etiquetas <p>, <strong>, <em>, etc. NO uses Markdown. NO añadas introducciones ni explicaciones):',
      'REWRITE (Respond ONLY with the rewritten text in valid HTML format. Use tags like <p>, <strong>, <em>, etc. Do NOT use Markdown. Do NOT add introductions or explanations):',
    );
    fullPrompt += `\n\n${outputLabel}`;

    const fn = getProvider(PROVIDER_COMPLETION, provider, t(
      'Proveedor de IA desconocido.',
      'Unknown AI provider.',
    ));
    return await fn(fullPrompt, config);
  },

  /**
   * Generates a 1-2 sentence summary of a scene for the timeline.
   * @param {string} sceneText
   * @param {AIConfig} config
   * @returns {Promise<AIResponse>}
   */
  summarizeScene: async (sceneText, config) => {
    const { provider, apiKey } = config;
    requireApiKey(apiKey, provider);

    const promptTemplate = t(
      `Actúa como un asistente de logística editorial. Genera un resumen de la escena estilo "post-it" o "telegrama". Máximo 10 palabras. Describe ÚNICAMENTE el hecho físico o el giro de trama más importante. NO uses lenguaje poético, NO interpretes el significado y NO uses metáforas. Sé puramente fáctico y directo.\n\n[ESCENA]\n${sceneText}`,
      `Act as an editorial logistics assistant. Generate a "post-it" or "telegram" style summary of the scene. Maximum 10 words. Describe ONLY the physical fact or the most important plot twist. Do NOT use poetic language, do NOT interpret meaning, and do NOT use metaphors. Be purely factual and direct.\n\n[SCENE]\n${sceneText}`,
    );

    const fn = getProvider(PROVIDER_COMPLETION, provider, t(
      'Proveedor de IA desconocido.',
      'Unknown AI provider.',
    ));
    return await fn(promptTemplate, config);
  },

  /**
   * Auto-completes a compendium entry based on the novel text.
   * @param {string} sceneText
   * @param {string} type - Entity type ('characters'|'locations'|'objects'|'lore')
   * @param {string} name - Entity name
   * @param {object} currentData - Existing entity data
   * @param {AIConfig} config
   * @returns {Promise<{data: object, usage: object}>}
   */
  autoCompleteCompendiumEntry: async (sceneText, type, name, currentData, config) => {
    const { provider, apiKey } = config;
    requireApiKey(apiKey, provider);

    const cleanData = { ...currentData };
    delete cleanData._rawTraits;
    delete cleanData._rawTags;
    delete cleanData._originalCategory;
    delete cleanData.id;

    const promptTemplate = t(
      `Actúa como un asistente literario experto y detective de narrativa. Tu objetivo es COMPLETAR AL MÁXIMO la ficha de "${name}" (categoría: ${type}) para el Compendio, extrayendo cada detalle relevante del texto proporcionado.

[CONTEXTO DE LA NOVELA]
${sceneText}

[DATOS ACTUALES (Prioriza completar los campos vacíos o mejorar los existentes)]
${JSON.stringify(cleanData, null, 2)}

INSTRUCCIONES CRÍTICAS:
1. INFIERE rasgos de personalidad, descripciones físicas y roles basándote en las acciones, diálogos y descripciones del texto.
2. Si el campo está vacío, es PRIORITARIO encontrar información para rellenarlo.
3. Sé DESCRIPTIVO. No te limites a una sola palabra si el texto permite una frase rica.
4. Para RELACIONES: Identifica cómo interactúa con otros personajes y define el vínculo bidireccional.
5. NO inventes hechos que contradigan el texto, pero sé proactivo interpretando la caracterización.
6. Devuelve ÚNICAMENTE un JSON válido (sin marcas de markdown).

ESTRUCTURA OBLIGATORIA POR TIPO:
- characters: { "role": "", "occupation": "", "age": "", "description": "", "traits": ["rasgo1"], "associatedLocations": ["NombreLugar"], "associatedObjects": ["NombreObjeto"], "associatedLore": ["TituloLore"], "relations": [{ "name": "NombreOtro", "type": "cómo lo ve", "reverseType": "cómo le ve" }] }
- locations: { "type": "", "climate": "", "description": "", "tags": ["tag1"], "associatedCharacters": ["NombreChar"], "associatedObjects": ["NombreObj"], "associatedLore": ["TituloLore"] }
- objects: { "type": "", "description": "", "origin": "", "currentOwner": "", "tags": ["tag1"], "associatedCharacters": ["NombreChar"], "associatedLocations": ["NombreLugar"], "associatedLore": ["TituloLore"] }
- lore: { "category": "", "summary": "", "tags": ["tag1"], "associatedCharacters": ["NombreChar"], "associatedLocations": ["NombreLugar"], "associatedObjects": ["NombreObj"] }`,
      `Act as an expert literary assistant and narrative detective. Your goal is to FULLY COMPLETE the entry for "${name}" (category: ${type}) for the Compendium, extracting every relevant detail from the provided text.

[NOVEL CONTEXT]
${sceneText}

[CURRENT DATA (Prioritize filling empty fields or improving existing ones)]
${JSON.stringify(cleanData, null, 2)}

CRITICAL INSTRUCTIONS:
1. INFER personality traits, physical descriptions, and roles based on the text's actions, dialogues, and descriptions.
2. If a field is empty, it is a PRIORITY to find information to fill it.
3. Be DESCRIPTIVE. Do not limit yourself to a single word if the text allows for a rich sentence.
4. For RELATIONS: Identify how they interact with other characters and define the bi-directional bond.
5. Do NOT invent facts that contradict the text, but be proactive in interpreting characterization.
6. Return ONLY valid JSON (without markdown markers).

MANDATORY STRUCTURE PER TYPE:
- characters: { "role": "", "occupation": "", "age": "", "description": "", "traits": ["trait1"], "associatedLocations": ["LocationName"], "associatedObjects": ["ObjectName"], "associatedLore": ["LoreTitle"], "relations": [{ "name": "OtherName", "type": "how I see them", "reverseType": "how they see me" }] }
- locations: { "type": "", "climate": "", "description": "", "tags": ["tag1"], "associatedCharacters": ["CharName"], "associatedObjects": ["ObjectName"], "associatedLore": ["LoreTitle"] }
- objects: { "type": "", "description": "... ", "origin": "", "currentOwner": "", "tags": ["tag1"], "associatedCharacters": ["CharName"], "associatedLocations": ["LocationName"], "associatedLore": ["LoreTitle"] }
- lore: { "category": "", "summary": "", "tags": ["tag1"], "associatedCharacters": ["CharName"], "associatedLocations": ["LocationName"], "associatedObjects": ["ObjectName"] }`,
    );

    const fn = getProvider(PROVIDER_COMPLETION, provider, t(
      'Proveedor de IA desconocido.',
      'Unknown AI provider.',
    ));
    const response = await fn(promptTemplate, config);

    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return { data: JSON.parse(match[0]), usage: response.usage };
      return { data: JSON.parse(text), usage: response.usage };
    } catch (e) {
      console.error('[AIService] JSON parse error in auto-complete', e, response?.text);
      throw new Error(t('El modelo no devolvió un JSON válido.', 'The model did not return valid JSON.'), { cause: e });
    }
  },

  /**
   * Agent chat for the Debate Forum
   * @param {{name: string, systemPrompt: string}} agent
   * @param {Array<{role: string, text: string, agent?: string, agentName?: string}>} history
   * @param {AIConfig} config
   * @returns {Promise<AIResponse>}
   */
  agentChat: async (agent, history, config) => {
    const { provider, apiKey, sceneContent, pov, roundInstruction, knowledgeBase, compendiumContext } = config;
    requireApiKey(apiKey, provider);

    const debateDirective = t(
      `[DIRECTRIZ CRÍTICA]: Eres ÚNICA y EXCLUSIVAMENTE el ${agent.name}. NUNCA te salgas de tu rol. Habla SIEMPRE en primera persona del singular ("yo", "mi opinión"). NO hables de ti mismo en tercera persona. NO seas genérico ni complaciente.`,
      `[CRITICAL DIRECTIVE]: You are UNIQUE and EXCLUSIVELY ${agent.name}. NEVER leave your role. ALWAYS speak in first person singular ("I", "my opinion"). Do NOT refer to yourself in third person. Do NOT be generic.`,
    );

    let systemPrompt = agent.systemPrompt + '\n\n' + debateDirective;

    if (knowledgeBase) {
      const kbLabel = t('[BASE DE CONOCIMIENTO Y REFERENCIAS DEL AUTOR]:', "[AUTHOR'S KNOWLEDGE BASE AND REFERENCES]:");
      const kbNote = t('TEN EN CUENTA ESTA BASE DE CONOCIMIENTO AL RESPONDER Y EVALUAR.', 'TAKE THIS KNOWLEDGE BASE INTO ACCOUNT WHEN RESPONDING AND EVALUATING.');
      systemPrompt += `\n\n${kbLabel}\n${knowledgeBase}\n---\n${kbNote}`;
    }

    if (compendiumContext) {
      const cpNote = t('USA ESTA INFORMACIÓN DEL COMPENDIO PARA DAR OPINIONES MÁS PRECISAS Y FIELES AL UNIVERSO DE LA NOVELA.', 'USE THIS COMPENDIUM INFORMATION TO GIVE MORE PRECISE OPINIONS FAITHFUL TO THE NOVEL UNIVERSE.');
      systemPrompt += `\n\n${compendiumContext}\n---\n${cpNote}`;
    }

    if (sceneContent || pov) {
      const sceneCtx = t('[CONTEXTO DE LA ESCENA ACTUAL (Para tu referencia)]', '[CURRENT SCENE CONTEXT (For your reference)]');
      systemPrompt += `\n\n---${sceneCtx}`;
      if (pov) {
        const povNote = t(
          `La escena está escrita desde el punto de vista (POV) del personaje: ${pov}. (IMPORTANTE: Tú NO eres este personaje, tú eres ${agent.name} evaluando el texto).`,
          `The scene is written from the point of view (POV) of: ${pov}. (IMPORTANT: You are NOT this character, you are ${agent.name} evaluating the text).`,
        );
        systemPrompt += `\n${povNote}`;
      }
      if (sceneContent) {
        const textLabel = t('Texto', 'Text');
        systemPrompt += `\n${textLabel}:\n"${sceneContent}"`;
      }
      systemPrompt += '\n---';
    }

    if (config.ragContext) {
      const ragLabel = t('[RECUERDOS DE CAPÍTULOS ANTERIORES DEL MANUSCRITO]', '[MEMORIES OF PREVIOUS MANUSCRIPT CHAPTERS]');
      const ragNote = t('USA ESTA INFORMACIÓN PASADA DEL MANUSCRITO PARA SUSTENTAR TUS OPINIONES O RESPONDER PREGUNTAS DEL USUARIO SOBRE EVENTOS PREVIOS.', 'USE THIS PAST MANUSCRIPT INFORMATION TO SUPPORT YOUR OPINIONS OR ANSWER USER QUESTIONS ABOUT PREVIOUS EVENTS.');
      systemPrompt += `\n\n${ragLabel}\n${config.ragContext}\n---\n${ragNote}`;
    }

    const authorLabel = t('[Autor de la obra]:', '[Author of the work]:');
    const participantLabel = (name) => t(`[Participante - ${name}]:`, `[Participant - ${name}]:`);
    const yourTurn = t(
      `[TU TURNO]: Ahora te toca intervenir a ti, ${agent.name}. Revisa todo el hilo del debate anterior, sin importar a quién se dirigieran los mensajes. Mantente fiel a tu rol y a tus instrucciones. ${roundInstruction || ''}`,
      `[YOUR TURN]: Now it's your turn, ${agent.name}. Review the entire previous debate thread, regardless of whom the messages were directed to. Stay true to your role and instructions. ${roundInstruction || ''}`,
    );

    const chatMessages = history.map(msg => {
      if (msg.role === 'user') return { role: 'user', content: authorLabel + ' ' + msg.text };
      if (msg.agent === agent.id) return { role: 'assistant', content: msg.text };
      return { role: 'user', content: participantLabel(msg.agentName || msg.agent) + ' ' + msg.text };
    });

    chatMessages.push({ role: 'user', content: yourTurn });

    const fn = getProvider(PROVIDER_CHAT, provider, t(
      'Proveedor de IA desconocido.',
      'Unknown AI provider.',
    ));
    return await fn(systemPrompt, chatMessages, config);
  },

  /**
   * Fuses two entities into one coherent entry using AI
   * @param {object} entity1
   * @param {object} entity2
   * @param {string} type - Entity type ('characters'|'locations'|'objects'|'lore')
   * @param {AIConfig} config
   * @returns {Promise<{data: object, usage: object}>}
   */
  fuseEntities: async (entity1, entity2, type, config) => {
    const { provider, apiKey } = config;
    requireApiKey(apiKey, provider);

    const nameField = type === 'lore' ? 'title' : 'name';
    const fallbackName = entity1[nameField] || entity2[nameField] || '';

    const promptTemplate =
      i18n.t('compendium:unificar.prompts.legacy_merge.intro') +
      '\n\n' +
      i18n.t('compendium:unificar.prompts.legacy_merge.header_1') +
      ' ' + JSON.stringify(entity1, null, 2) + '\n' +
      i18n.t('compendium:unificar.prompts.legacy_merge.header_2') +
      ' ' + JSON.stringify(entity2, null, 2) + '\n\n' +
      'INSTRUCTIONS:\n' +
      i18n.t('compendium:unificar.prompts.legacy_merge.instruction_name', { name: fallbackName, field: nameField }) + '\n' +
      i18n.t('compendium:unificar.prompts.legacy_merge.instruction_combine') + '\n' +
      i18n.t('compendium:unificar.prompts.legacy_merge.instruction_rewrite') + '\n' +
      i18n.t('compendium:unificar.prompts.legacy_merge.instruction_keep_info') + '\n' +
      i18n.t('compendium:unificar.prompts.legacy_merge.instruction_golden_rule') + '\n' +
      i18n.t('compendium:unificar.prompts.legacy_merge.instruction_json') + '\n\n' +
      i18n.t('compendium:unificar.prompts.multi_merge.structure_header', { type: type.toUpperCase() }) + '\n' +
      (type === 'characters' ? '- { "name": "...", "description": "...", "role": "...", "occupation": "...", "traits": [], "relations": [] }' : '') + '\n' +
      (type === 'locations' ? '- { "name": "...", "description": "...", "type": "...", "climate": "...", "tags": [] }' : '') + '\n' +
      (type === 'objects' ? '- { "name": "...", "description": "...", "type": "...", "importance": "...", "origin": "...", "tags": [] }' : '') + '\n' +
      (type === 'lore' ? '- { "title": "...", "summary": "...", "category": "...", "tags": [] }' : '');

    const fn = getProvider(PROVIDER_COMPLETION, provider, i18n.t('compendium:unificar.error_provider'));
    const response = await fn(promptTemplate, config);

    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      const data = match ? JSON.parse(match[0]) : JSON.parse(text);

      if (!data[nameField] || data[nameField].trim() === '') data[nameField] = fallbackName;

      const descField = type === 'lore' ? 'summary' : 'description';
      if (!data[descField] || data[descField].trim() === '') {
        data[descField] = entity1[descField] || entity2[descField] || '';
      }

      return { data, usage: response.usage };
    } catch (e) {
      console.error('[AIService] JSON parse error in fuseEntities', e, response?.text);
      throw new Error(i18n.t('compendium:unificar.error_no_json'), { cause: e });
    }
  },

  /**
   * Fuses multiple entities into one coherent entry using AI
   * @param {object[]} entities
   * @param {string} type - Entity type ('characters'|'locations'|'objects'|'lore')
   * @param {AIConfig} config
   * @returns {Promise<{data: object, usage: object}>}
   */
  fuseMultipleEntities: async (entities, type, config) => {
    const { provider, apiKey } = config;
    requireApiKey(apiKey, provider);

    const nameField = type === 'lore' ? 'title' : 'name';
    const fallbackName = entities[0][nameField] || '';

    const promptTemplate =
      i18n.t('compendium:unificar.prompts.multi_merge.intro') +
      '\n\n' +
      i18n.t('compendium:unificar.prompts.multi_merge.header') + '\n' +
      entities.map((e, i) => `ENTRY ${i + 1}: ${JSON.stringify(e, null, 2)}`).join('\n\n') +
      '\n\nINSTRUCTIONS:\n' +
      i18n.t('compendium:unificar.prompts.multi_merge.instruction_name', { field: nameField }) + '\n' +
      i18n.t('compendium:unificar.prompts.multi_merge.instruction_combine') + '\n' +
      i18n.t('compendium:unificar.prompts.multi_merge.instruction_rewrite') + '\n' +
      i18n.t('compendium:unificar.prompts.multi_merge.instruction_golden_rule') + '\n' +
      i18n.t('compendium:unificar.prompts.multi_merge.instruction_json') + '\n\n' +
      i18n.t('compendium:unificar.prompts.multi_merge.structure_header', { type: type.toUpperCase() }) + '\n' +
      (type === 'characters' ? '- { "name": "...", "description": "...", "role": "...", "occupation": "...", "traits": [], "relations": [] }' : '') + '\n' +
      (type === 'locations' ? '- { "name": "...", "description": "...", "type": "...", "climate": "...", "tags": [] }' : '') + '\n' +
      (type === 'objects' ? '- { "name": "...", "description": "...", "type": "...", "importance": "...", "origin": "...", "tags": [] }' : '') + '\n' +
      (type === 'lore' ? '- { "title": "...", "summary": "...", "category": "...", "tags": [] }' : '');

    const fn = getProvider(PROVIDER_COMPLETION, provider, i18n.t('compendium:unificar.error_provider'));
    const response = await fn(promptTemplate, config);

    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      const data = match ? JSON.parse(match[0]) : JSON.parse(text);

      if (!data[nameField] || data[nameField].trim() === '') data[nameField] = fallbackName;

      const descField = type === 'lore' ? 'summary' : 'description';
      if (!data[descField] || data[descField].trim() === '') {
        const anyDesc = entities.find(e => e[descField])?.[descField] || '';
        data[descField] = anyDesc;
      }

      return { data, usage: response.usage };
    } catch (e) {
      console.error('[AIService] JSON parse error in fuseMultipleEntities', e, response?.text);
      throw new Error(i18n.t('compendium:unificar.error_no_json'), { cause: e });
    }
  },

  testConnection,
};
