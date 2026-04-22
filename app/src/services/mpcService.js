/**
 * MPC — Monitor de Propuestas del Compendio
 * 
 * Analiza el texto del escritor y propone nuevas entidades para el compendio
 * (personajes, lugares, objetos, lore) usando un filtro local + IA.
 * 
 * Flujo:
 *   1. extractCandidates()  → detección local barata (sin IA)
 *   2. analyzeWithAI()      → llamada IA única si hay candidatos
 *   3. parseMpcResponse()   → normaliza el JSON devuelto por la IA
 */

import { db } from '../db/database';
import { AIService } from './aiService';
import i18n from '../i18n/i18n';
import { getSentenceStartWords, getGenericWords } from '../i18n/stopwords';

// ─── Regex: detecta palabras que empiezan en mayúscula en cualquier posición ──
const PROPER_NOUN_REGEX = /(?:^|(?<=[.!?¿¡\n\r—–""«‹()\[\] \t,;:]))([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ][a-záéíóúàèìòùäëïöüâêîôûñ\u2019']{1,}(?:\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ][a-záéíóúàèìòùäëïöüâêîôûñ\u2019']{1,}){0,3})/gmu;

// ─── Carga los nombres ya registrados en el compendio ───────────────────────
export async function loadRegisteredEntityNames(novelId) {
  if (!novelId) return new Set();

  const [chars, locs, objs, loreEntries] = await Promise.all([
    db.characters.where('novelId').equals(novelId).toArray(),
    db.locations.where('novelId').equals(novelId).toArray(),
    db.objects.where('novelId').equals(novelId).toArray(),
    db.lore.where('novelId').equals(novelId).toArray(),
  ]);

  const names = new Set();
  for (const c of chars) if (c.name) names.add(c.name.trim());
  for (const l of locs)  if (l.name) names.add(l.name.trim());
  for (const o of objs)  if (o.name) names.add(o.name.trim());
  for (const e of loreEntries) if (e.title) names.add(e.title.trim());

  return names;
}

// ─── Carga los nombres ya ignorados permanentemente ─────────────────────────
export async function loadIgnoredNames(novelId) {
  if (!novelId) return new Set();
  const entries = await db.mpcIgnored.where('novelId').equals(novelId).toArray();
  return new Set(entries.filter(e => e?.name).map(e => e.name.toLowerCase()));
}

// ─── Paso 1: Detección local de candidatos (sin IA) ─────────────────────────
/**
 * Extrae nombres propios candidatos del texto que NO estén registrados
 * ni descartados previamente.
 *
 * @param {string} text - Texto plano de la escena
 * @param {Set<string>} registeredNames - Nombres ya en el compendio (lowercase)
 * @param {Set<string>} ignoredNames - Nombres descartados (lowercase)
 * @returns {string[]} - Lista de candidatos únicos
 */
export function extractCandidates(text, registeredNames = new Set(), ignoredNames = new Set()) {
  if (!text || text.length < 20) return [];

  // Limpiar HTML si viene del editor
  const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  const candidates = new Set();
  let match;

  // Reset lastIndex for global regex
  PROPER_NOUN_REGEX.lastIndex = 0;

  while ((match = PROPER_NOUN_REGEX.exec(plainText)) !== null) {
    // Group 2 contains the proper noun (group 1 is the optional leading context char)
    const raw = (match[2] || match[1] || '').trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();

    // Filtrar stopwords y genéricos usando el idioma actual
    const sentenceStartWords = getSentenceStartWords();
    const genericWords = getGenericWords();
    if (sentenceStartWords.has(lower)) continue;
    if (genericWords.has(lower)) continue;

    // Filtrar si ya está registrado exacto o es una parte sustancial de uno registrado (ej. "Loro Dorado" part of "El Loro Dorado")
    const isRegistered = [...registeredNames].some(n => {
      const regLower = n.toLowerCase();
      return regLower === lower || (regLower.includes(lower) && lower.includes(' '));
    });
    if (isRegistered) continue;
    
    // Y descartados (ignorados siguen siendo guardados en lower por addToIgnoredNames)
    if (ignoredNames.has(lower)) continue;

    candidates.add(raw);
  }

  return [...candidates];
}

// ─── Construye un resumen breve del compendio para el prompt ────────────────
function buildCompendiumSummary(registeredNames) {
  if (registeredNames.size === 0) return '(vacío)';
  const names = [...registeredNames].slice(0, 40); // Máximo 40 nombres en el prompt
  return names.join(', ');
}

// ─── Paso 2: Análisis IA profundo ───────────────────────────────────────────
/**
 * Llama a la IA para analizar candidatos y generar fichas prellenadas.
 *
 * @param {string[]} candidates - Lista de candidatos detectados localmente
 * @param {string} sceneText - Texto plano de la escena (máx. 2000 chars)
 * @param {Set<string>} registeredNames - Nombres ya en el compendio
 * @param {Object} aiConfig - { provider, apiKey, model, localBaseUrl }
 * @param {number} maxProposals - Máximo de propuestas a devolver
 * @returns {Promise<{proposals: Object[], usage: Object}>} - Proposals and token usage
 */
export async function analyzeWithAI(candidates, sceneText, registeredNames, ignoredNames, aiConfig, maxProposals = 5) {
  if (!candidates || candidates.length === 0) return { proposals: [], usage: null };
  if (!aiConfig?.apiKey && aiConfig?.provider !== 'local') return { proposals: [], usage: null };

  const isSpanish = i18n.language === 'es';
  const compendiumSummary = buildCompendiumSummary(registeredNames);
  
  const truncatedText = sceneText.length > 12000
    ? '...' + sceneText.slice(-12000)
    : sceneText;

  const prompt = isSpanish
    ? `Eres un asistente experto en worldbuilding y construcción de universos narrativos.\n\nTu tarea es analizar el fragmento literario que te proporciono e identificar si los CANDIDATOS DETECTADOS son entidades narrativas relevantes (personajes, lugares, objetos importantes, o conceptos de lore) que merezcan tener una ficha en el compendio de la novela.\n\nCOMPENDIO ACTUAL (estos nombres ya están registrados, NO los propongas):\n${compendiumSummary}\n\nCANDIDATOS DETECTADOS (evalúa si merecen una ficha):\n${candidates.join(', ')}\n\nFRAGMENTO DE LA OBRA:\n"""\n${truncatedText}\n"""\n\nINSTRUCCIONES:\n- Analiza SOLO los candidatos listados. No inventes entidades nuevas.\n- NO propongas candidatos que sean variaciones, apodos o partes de los nombres del COMPENDIO ACTUAL (ej. si está 'El Loro de Oro', no propongas 'El Loro').\n- Para cada candidato que SÍ merezca una ficha (personaje, lugar, objeto clave, o concepto de lore), genera una entrada JSON.\n- Asigna confidence: "high" si aparece claramente como nombre propio de entidad narrativa, "medium" si es probable pero hay algo de ambigüedad, "low" si es dudoso.\n- Infiere los campos a partir del contexto del texto. Si no puedes inferirlo, deja el campo vacío "".\n- Propón un máximo de ${maxProposals} entidades. Prioriza las de mayor confianza.\n- Si ningún candidato merece una ficha, devuelve un array vacío [].\n\nResponde en el mismo idioma que usa el autor en su texto.\n\nESQUEMA DE RESPUESTA (devuelve ÚNICAMENTE el JSON, sin texto adicional, sin markdown):\n[\n  {\n    "type": "characters" | "locations" | "objects" | "lore",\n    "confidence": "high" | "medium" | "low",\n    "name": "Nombre exacto tal como aparece en el texto (o 'title' para lore)",\n    "title": "Solo si type es lore, el título de la entrada",\n    "role": "Si es personaje: su rol narrativo (protagonista, antagonista, secundario...)",\n    "occupation": "Si es personaje: su ocupación o profesión",\n    "description": "Descripción breve inferida del contexto (máx. 150 caracteres)",\n    "type_detail": "Para locations: tipo de lugar. Para objects: tipo de objeto. Para lore: categoría",\n    "tags": ["tag1", "tag2"],\n    "reason": "Por qué propones añadirlo al compendio (una frase breve)"\n  }\n]`
    : `You are an expert in worldbuilding and narrative universe construction.\n\nYour task is to analyze the literary fragment I provide and identify whether the DETECTED CANDIDATES are relevant narrative entities (characters, important places, objects, or lore concepts) that deserve to have an entry in the novel's compendium.\n\nCURRENT COMPENDIUM (these names are already registered, do NOT propose them):\n${compendiumSummary}\n\nDETECTED CANDIDATES (evaluate if they deserve an entry):\n${candidates.join(', ')}\n\nWORK FRAGMENT:\n"""\n${truncatedText}\n"""\n\nINSTRUCTIONS:\n- Analyze ONLY the listed candidates. Do not invent new entities.\n- Do NOT propose candidates that are variations, nicknames, or parts of names from the CURRENT COMPENDIUM (e.g., if 'The Golden Parrot' is registered, do not propose 'The Parrot').\n- For each candidate that DOES deserve an entry (character, key place, key object, or lore concept), generate a JSON entry.\n- Assign confidence: "high" if it clearly appears as a proper name of a narrative entity, "medium" if it's probable but there's some ambiguity, "low" if it's doubtful.\n- Infer fields from the text context. If you cannot infer it, leave the field empty "".\n- Propose a maximum of ${maxProposals} entities. Prioritize those with highest confidence.\n- If no candidate deserves an entry, return an empty array [].\n\nRespond in the same language as the author uses in their text.\n\nRESPONSE SCHEMA (return ONLY the JSON, without additional text, without markdown):\n[\n  {\n    "type": "characters" | "locations" | "objects" | "lore",\n    "confidence": "high" | "medium" | "low",\n    "name": "Exact name as it appears in the text (or 'title' for lore)",\n    "title": "Only if type is lore, the entry title",\n    "role": "If character: their narrative role (protagonist, antagonist, secondary...)",\n    "occupation": "If character: their occupation or profession",\n    "description": "Brief description inferred from context (max 150 characters)",\n    "type_detail": "For locations: type of place. For objects: type of object. For lore: category",\n    "tags": ["tag1", "tag2"],\n    "reason": "Why you propose adding it to the compendium (brief sentence)"\n  }\n]`;

  try {
    const response = await AIService._callWithConfig(prompt, aiConfig);
    return { 
      proposals: parseMpcResponse(response.text, maxProposals, registeredNames, ignoredNames), 
      usage: response.usage 
    };
  } catch (error) {
    return { proposals: [], usage: null };
  }
}

// ─── Paso 3: Parseo y normalización de la respuesta ─────────────────────────
/**
 * Parsea la respuesta cruda de la IA y devuelve propuestas normalizadas.
 *
 * @param {string} rawResponse - Respuesta cruda de la IA
 * @param {number} maxProposals - Máximo de propuestas a incluir
 * @returns {Object[]} - Array de propuestas con id único
 */
export function parseMpcResponse(rawResponse, maxProposals = 5, registeredNames = new Set(), ignoredNames = new Set()) {
  if (!rawResponse) return [];

  try {
    // Intentar extraer el JSON aunque venga con texto adicional
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => {
        // Validación básica de campos requeridos
        if (!item || typeof item !== 'object') return false;
        if (!['characters', 'locations', 'objects', 'lore'].includes(item.type)) return false;
        if (!item.confidence || !['high', 'medium', 'low'].includes(item.confidence)) return false;
        const nameOrTitle = item.name || item.title;
        if (!nameOrTitle || typeof nameOrTitle !== 'string' || nameOrTitle.trim().length < 2) return false;
        
        // Filtrar entidades que ya existen en el compendio
        const itemLower = nameOrTitle.toLowerCase().trim();
        const isAlreadyRegistered = [...registeredNames].some(n => {
          const regLower = n.toLowerCase().trim();
          return regLower === itemLower || regLower.includes(itemLower) || itemLower.includes(regLower);
        });
        if (isAlreadyRegistered) return false;

        // Filtrar entidades ya ignoradas
        if (ignoredNames && ignoredNames.has(itemLower)) return false;
        
        return true;
      })
      .slice(0, maxProposals)
      .map((item, index) => ({
        // Campos de control MPC
        id: `mpc_${Date.now()}_${index}`,
        type: item.type,
        confidence: item.confidence,
        reason: item.reason || '',

        // Campos del compendio (prellenados para ser pasados al CompendiumPanel)
        name: item.type !== 'lore' ? (item.name || '') : undefined,
        title: item.type === 'lore' ? (item.title || item.name || '') : undefined,
        role: item.role || '',
        occupation: item.occupation || '',
        description: item.description || '',
        // Mapeo de subcategoría en lugar de 'type' para no pisar el nombre de tabla
        ...(item.type === 'characters' && {}),
        ...(item.type === 'locations' && { entityType: item.type_detail || '' }),
        ...(item.type === 'objects' && { entityType: item.type_detail || '' }),
        ...(item.type === 'lore' && { category: item.type_detail || '' }),
        tags: Array.isArray(item.tags) ? item.tags.filter(t => typeof t === 'string') : [],
      }));
  } catch (error) {
    return [];
  }
}

// ─── Guardar un nombre en la lista de ignorados permanentemente ─────────────
export async function addToIgnoredNames(novelId, name, type = '') {
  if (!novelId || !name) return;
  
  // Evitar duplicados
  const existing = await db.mpcIgnored
    .where({ novelId, name: name.toLowerCase() })
    .first();
  
  if (!existing) {
    await db.mpcIgnored.add({
      novelId,
      name: name.toLowerCase(),
      type,
      ignoredAt: new Date().toISOString(),
    });
  }
}

// ─── Eliminar un nombre de la lista de ignorados ────────────────────────────
export async function removeFromIgnoredNames(novelId, name) {
  if (!novelId || !name) return;
  await db.mpcIgnored
    .where({ novelId, name: name.toLowerCase() })
    .delete();
}

// ─── Helper interno: enruta la llamada al proveedor de IA correcto ───────────
// Extendemos AIService con un método genérico para mpcService
// (evita duplicar la lógica de routing)
AIService._callWithConfig = async function(prompt, config) {
  const { provider, apiKey, model, localBaseUrl } = config;

  if (provider === 'google') {
    return await AIService._callGemini(prompt, apiKey, model);
  } else if (provider === 'openai') {
    return await AIService._callOpenAI(prompt, apiKey, model);
  } else if (provider === 'anthropic') {
    return await AIService._callClaude(prompt, apiKey, model);
  } else if (provider === 'openrouter') {
    return await AIService._callOpenRouter(prompt, apiKey, model);
  } else if (provider === 'local') {
    return await AIService._callLocal(prompt, model, localBaseUrl);
  } else {
    throw new Error(`[MPC] Proveedor de IA desconocido: ${provider}`);
  }
};
