/**
 * AI Service for LoneWriter
 * Handles communication with AI providers via specialized modules.
 */
import i18n from '../i18n/i18n';
import { callGemini, callGeminiChat } from './providers/gemini';
import { callOpenAI, callOpenAIChat } from './providers/openai';
import { callClaude, callClaudeChat } from './providers/claude';
import { callOpenRouter, callOpenRouterChat } from './providers/openrouter';
import { callLocal, callLocalChat } from './providers/local';

export const AIService = {
  /**
   * Generic call method for MPC and other direct prompting.
   */
  _callWithConfig: async (promptTemplate, config) => {
    const { provider, apiKey, model, localBaseUrl } = config;
    const isSpanish = i18n.language === 'es';

    const errorAPI = isSpanish ? 'Se requiere una clave API para usar la IA.' : 'An API key is required to use the AI.';
    const errorProvider = isSpanish ? 'Proveedor de IA desconocido.' : 'Unknown AI provider.';

    if (!apiKey && provider !== 'local') throw new Error(errorAPI);

    if (provider === 'google') return await callGemini(promptTemplate, apiKey, model);
    if (provider === 'openai') return await callOpenAI(promptTemplate, apiKey, model);
    if (provider === 'anthropic') return await callClaude(promptTemplate, apiKey, model);
    if (provider === 'openrouter') return await callOpenRouter(promptTemplate, apiKey, model);
    if (provider === 'local') return await callLocal(promptTemplate, model, localBaseUrl);
    throw new Error(errorProvider);
  },

  /**
   * Generic rewrite function
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

    if (provider === 'google') return await callGemini(fullPrompt, apiKey, model);
    if (provider === 'openai') return await callOpenAI(fullPrompt, apiKey, model);
    if (provider === 'anthropic') return await callClaude(fullPrompt, apiKey, model);
    if (provider === 'openrouter') return await callOpenRouter(fullPrompt, apiKey, model);
    if (provider === 'local') return await callLocal(fullPrompt, model, config.localBaseUrl);
    throw new Error(`Proveedor de IA desconocido: ${provider}`);
  },

  /**
   * Generates a 1-2 sentence summary of a scene for the timeline.
   */
  summarizeScene: async (sceneText, config) => {
    const { provider, apiKey, model, localBaseUrl } = config;
    const isSpanish = i18n.language === 'es';

    const errorAPI = isSpanish ? 'Se requiere una clave API para usar la IA.' : 'An API key is required to use the AI.';
    const errorProvider = isSpanish ? 'Proveedor de IA desconocido.' : 'Unknown AI provider.';

    if (!apiKey && provider !== 'local') throw new Error(errorAPI);

    const promptTemplate = isSpanish
      ? `Actúa como un asistente de logística editorial. Genera un resumen de la escena estilo "post-it" o "telegrama". Máximo 10 palabras. Describe ÚNICAMENTE el hecho físico o el giro de trama más importante. NO uses lenguaje poético, NO interpretes el significado y NO uses metáforas. Sé puramente fáctico y directo.\n\n[ESCENA]\n${sceneText}`
      : `Act as an editorial logistics assistant. Generate a "post-it" or "telegram" style summary of the scene. Maximum 10 words. Describe ONLY the physical fact or the most important plot twist. Do NOT use poetic language, do NOT interpret meaning, and do NOT use metaphors. Be purely factual and direct.\n\n[SCENE]\n${sceneText}`;

    if (provider === 'google') return await callGemini(promptTemplate, apiKey, model);
    if (provider === 'openai') return await callOpenAI(promptTemplate, apiKey, model);
    if (provider === 'anthropic') return await callClaude(promptTemplate, apiKey, model);
    if (provider === 'openrouter') return await callOpenRouter(promptTemplate, apiKey, model);
    if (provider === 'local') return await callLocal(promptTemplate, model, localBaseUrl);
    throw new Error(errorProvider);
  },

  /**
   * Auto-completes a compendium entry based on the novel text.
   */
  autoCompleteCompendiumEntry: async (sceneText, type, name, currentData, config) => {
    const { provider, apiKey, model, localBaseUrl } = config;
    const isSpanish = i18n.language === 'es';

    const errorAPI = isSpanish ? 'Se requiere una clave API para usar la IA.' : 'An API key is required to use the AI.';
    const errorProvider = isSpanish ? 'Proveedor de IA desconocido.' : 'Unknown AI provider.';

    if (!apiKey && provider !== 'local') throw new Error(errorAPI);

    const cleanData = { ...currentData };
    delete cleanData._rawTraits;
    delete cleanData._rawTags;
    delete cleanData._originalCategory;
    delete cleanData.id;

    const promptTemplate = isSpanish
      ? `Actúa como un asistente literario experto y detective de narrativa. Tu objetivo es COMPLETAR AL MÁXIMO la ficha de "${name}" (categoría: ${type}) para el Compendio, extrayendo cada detalle relevante del texto proporcionado.

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
- characters: { "role": "", "occupation": "", "age": 0, "description": "", "traits": ["rasgo1"], "associatedLocations": ["NombreLugar"], "associatedObjects": ["NombreObjeto"], "associatedLore": ["TituloLore"], "relations": [{ "name": "NombreOtro", "type": "cómo lo ve", "reverseType": "cómo le ve" }] }
- locations: { "type": "", "climate": "", "description": "", "tags": ["tag1"], "associatedCharacters": ["NombreChar"], "associatedObjects": ["NombreObj"], "associatedLore": ["TituloLore"] }
- objects: { "type": "", "description": "", "origin": "", "currentOwner": "", "tags": ["tag1"], "associatedCharacters": ["NombreChar"], "associatedLocations": ["NombreLugar"], "associatedLore": ["TituloLore"] }
- lore: { "category": "", "summary": "", "tags": ["tag1"], "associatedCharacters": ["NombreChar"], "associatedLocations": ["NombreLugar"], "associatedObjects": ["NombreObj"] }`
      : `Act as an expert literary assistant and narrative detective. Your goal is to FULLY COMPLETE the entry for "${name}" (category: ${type}) for the Compendium, extracting every relevant detail from the provided text.

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
- characters: { "role": "", "occupation": "", "age": 0, "description": "", "traits": ["trait1"], "associatedLocations": ["LocationName"], "associatedObjects": ["ObjectName"], "associatedLore": ["LoreTitle"], "relations": [{ "name": "OtherName", "type": "how I see them", "reverseType": "how they see me" }] }
- locations: { "type": "", "climate": "", "description": "", "tags": ["tag1"], "associatedCharacters": ["CharName"], "associatedObjects": ["ObjectName"], "associatedLore": ["LoreTitle"] }
- objects: { "type": "", "description": "... ", "origin": "", "currentOwner": "", "tags": ["tag1"], "associatedCharacters": ["CharName"], "associatedLocations": ["LocationName"], "associatedLore": ["LoreTitle"] }
- lore: { "category": "", "summary": "", "tags": ["tag1"], "associatedCharacters": ["CharName"], "associatedLocations": ["LocationName"], "associatedObjects": ["ObjectName"] }`;

    let response = null;
    if (provider === 'google') response = await callGemini(promptTemplate, apiKey, model);
    else if (provider === 'openai') response = await callOpenAI(promptTemplate, apiKey, model);
    else if (provider === 'anthropic') response = await callClaude(promptTemplate, apiKey, model);
    else if (provider === 'openrouter') response = await callOpenRouter(promptTemplate, apiKey, model);
    else if (provider === 'local') response = await callLocal(promptTemplate, model, localBaseUrl);
    else throw new Error(errorProvider);

    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return { data: JSON.parse(match[0]), usage: response.usage };
      return { data: JSON.parse(text), usage: response.usage };
    } catch (e) {
      console.error("[AIService] JSON parse error in auto-complete", e, response?.text);
      throw new Error(i18n.language === 'es' ? 'El modelo no devolvió un JSON válido.' : 'The model did not return valid JSON.');
    }
  },

  /**
   * Agent chat for the Debate Forum
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
      if (msg.role === 'user') return { role: 'user', content: authorLabel + ' ' + msg.text };
      if (msg.agent === agent.id) return { role: 'assistant', content: msg.text };
      return { role: 'user', content: participantLabel(msg.agentName || msg.agent) + ' ' + msg.text };
    });

    chatMessages.push({ role: 'user', content: yourTurn });

    if (provider === 'google') return await callGeminiChat(systemPrompt, chatMessages, apiKey, model);
    if (provider === 'openai') return await callOpenAIChat(systemPrompt, chatMessages, apiKey, model);
    if (provider === 'anthropic') return await callClaudeChat(systemPrompt, chatMessages, apiKey, model);
    if (provider === 'openrouter') return await callOpenRouterChat(systemPrompt, chatMessages, apiKey, model);
    if (provider === 'local') return await callLocalChat(systemPrompt, chatMessages, model, localBaseUrl);
    throw new Error(errorProvider);
  },

  /**
   * Fuses two entities into one coherent entry using AI
   */
  fuseEntities: async (entity1, entity2, type, config) => {
    const { provider, apiKey, model, localBaseUrl } = config;
    const errorAPI = i18n.t('compendium:unificar.sin_ia');
    const errorProvider = i18n.t('compendium:unificar.error_provider');

    if (!apiKey && provider !== 'local') throw new Error(errorAPI);

    const nameField = type === 'lore' ? 'title' : 'name';
    const fallbackName = entity1[nameField] || entity2[nameField] || '';

    const promptTemplate = i18n.t('compendium:unificar.prompts.legacy_merge.intro') + `
      
${i18n.t('compendium:unificar.prompts.legacy_merge.header_1')} ${JSON.stringify(entity1, null, 2)}
${i18n.t('compendium:unificar.prompts.legacy_merge.header_2')} ${JSON.stringify(entity2, null, 2)}

INSTRUCTIONS:
${i18n.t('compendium:unificar.prompts.legacy_merge.instruction_name', { name: fallbackName, field: nameField })}
${i18n.t('compendium:unificar.prompts.legacy_merge.instruction_combine')}
${i18n.t('compendium:unificar.prompts.legacy_merge.instruction_rewrite')}
${i18n.t('compendium:unificar.prompts.legacy_merge.instruction_keep_info')}
${i18n.t('compendium:unificar.prompts.legacy_merge.instruction_golden_rule')}
${i18n.t('compendium:unificar.prompts.legacy_merge.instruction_json')}

${i18n.t('compendium:unificar.prompts.multi_merge.structure_header', { type: type.toUpperCase() })}
${type === 'characters' ? '- { "name": "...", "description": "...", "role": "...", "occupation": "...", "traits": [], "relations": [] }' : ''}
${type === 'locations' ? '- { "name": "...", "description": "...", "type": "...", "climate": "...", "tags": [] }' : ''}
${type === 'objects' ? '- { "name": "...", "description": "...", "type": "...", "importance": "...", "origin": "...", "tags": [] }' : ''}
${type === 'lore' ? '- { "title": "...", "summary": "...", "category": "...", "tags": [] }' : ''}`;

    let response = null;
    if (provider === 'google') response = await callGemini(promptTemplate, apiKey, model);
    else if (provider === 'openai') response = await callOpenAI(promptTemplate, apiKey, model);
    else if (provider === 'anthropic') response = await callClaude(promptTemplate, apiKey, model);
    else if (provider === 'openrouter') response = await callOpenRouter(promptTemplate, apiKey, model);
    else if (provider === 'local') response = await callLocal(promptTemplate, model, localBaseUrl);
    else throw new Error(errorProvider);

    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      let data = match ? JSON.parse(match[0]) : JSON.parse(text);
      
      if (!data[nameField] || data[nameField].trim() === '') data[nameField] = fallbackName;
      
      const descField = type === 'lore' ? 'summary' : 'description';
      if (!data[descField] || data[descField].trim() === '') {
        data[descField] = entity1[descField] || entity2[descField] || '';
      }

      return { data, usage: response.usage };
    } catch (e) {
      console.error("[AIService] JSON parse error in fuseEntities", e, response?.text);
      throw new Error(i18n.t('compendium:unificar.error_no_json'));
    }
  },

  /**
   * Fuses multiple entities into one coherent entry using AI
   */
  fuseMultipleEntities: async (entities, type, config) => {
    const { provider, apiKey, model, localBaseUrl } = config;
    const errorAPI = i18n.t('compendium:unificar.sin_ia');
    const errorProvider = i18n.t('compendium:unificar.error_provider');

    if (!apiKey && provider !== 'local') throw new Error(errorAPI);

    const nameField = type === 'lore' ? 'title' : 'name';
    const fallbackName = entities[0][nameField] || '';

    const promptTemplate = i18n.t('compendium:unificar.prompts.multi_merge.intro') + `
      
${i18n.t('compendium:unificar.prompts.multi_merge.header')}
${entities.map((e, i) => `ENTRY ${i + 1}: ${JSON.stringify(e, null, 2)}`).join('\n\n')}

INSTRUCTIONS:
${i18n.t('compendium:unificar.prompts.multi_merge.instruction_name', { field: nameField })}
${i18n.t('compendium:unificar.prompts.multi_merge.instruction_combine')}
${i18n.t('compendium:unificar.prompts.multi_merge.instruction_rewrite')}
${i18n.t('compendium:unificar.prompts.multi_merge.instruction_golden_rule')}
${i18n.t('compendium:unificar.prompts.multi_merge.instruction_json')}

${i18n.t('compendium:unificar.prompts.multi_merge.structure_header', { type: type.toUpperCase() })}
${type === 'characters' ? '- { "name": "...", "description": "...", "role": "...", "occupation": "...", "traits": [], "relations": [] }' : ''}
${type === 'locations' ? '- { "name": "...", "description": "...", "type": "...", "climate": "...", "tags": [] }' : ''}
${type === 'objects' ? '- { "name": "...", "description": "...", "type": "...", "importance": "...", "origin": "...", "tags": [] }' : ''}
${type === 'lore' ? '- { "title": "...", "summary": "...", "category": "...", "tags": [] }' : ''}`;

    let response = null;
    if (provider === 'google') response = await callGemini(promptTemplate, apiKey, model);
    else if (provider === 'openai') response = await callOpenAI(promptTemplate, apiKey, model);
    else if (provider === 'anthropic') response = await callClaude(promptTemplate, apiKey, model);
    else if (provider === 'openrouter') response = await callOpenRouter(promptTemplate, apiKey, model);
    else if (provider === 'local') response = await callLocal(promptTemplate, model, localBaseUrl);
    else throw new Error(errorProvider);

    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      let data = match ? JSON.parse(match[0]) : JSON.parse(text);
      
      if (!data[nameField] || data[nameField].trim() === '') data[nameField] = fallbackName;
      
      const descField = type === 'lore' ? 'summary' : 'description';
      if (!data[descField] || data[descField].trim() === '') {
        const anyDesc = entities.find(e => e[descField])?.[descField] || '';
        data[descField] = anyDesc;
      }

      return { data, usage: response.usage };
    } catch (e) {
      console.error("[AIService] JSON parse error in fuseMultipleEntities", e, response?.text);
      throw new Error(i18n.t('compendium:unificar.error_no_json'));
    }
  },

  /**
   * Test de conexión con el proveedor
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
        const url = `${(localBaseUrl || 'http://localhost:1234/v1').replace(/\/$/, '')}/models`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          
          if (response.ok) {
            const data = await response.json().catch(() => ({}));
            if (data.data && Array.isArray(data.data) && data.data.length > 0) return { success: true, latency };
            return { success: false, error: 'No se pudieron obtener modelos', latency };
          }
          const err = await response.json().catch(() => ({}));
          return { success: false, error: err.error?.message || `Error ${response.status}`, latency };
        } catch (err) {
          clearTimeout(timeout);
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
};
