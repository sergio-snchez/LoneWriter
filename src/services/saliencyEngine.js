/**
 * saliencyEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor puro, síncrono y efímero de Saliency Score + Resolución de Correferencias.
 *
 * Contrato:
 *   - NO importa nada de DB, context ni promesas.
 *   - Recibe datos ya cargados (entityData del entityDetector).
 *   - Devuelve estructuras de datos planas, sin efectos secundarios.
 *   - Compatible con el onUpdate del editor o el flujo de guardado de Dexie.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Paleta de colores para entidades sin color propio ────────────────────────
const ENTITY_PALETTE = [
  '#6b9fd4', '#e07070', '#5cb98a', '#c59de0',
  '#e0b870', '#70d4e0', '#e070b8', '#a0c878',
  '#d4906b', '#7090d4',
];

// ─── Mini-sets de nombres propios para género ─────────────────────────────────
const FEMALE_NAMES = new Set([
  'ana', 'maria', 'maría', 'elena', 'laura', 'marta', 'sofia', 'sofía',
  'lucia', 'lucía', 'carmen', 'rosa', 'isabel', 'sara', 'paula', 'andrea',
  'patricia', 'beatriz', 'alicia', 'eva', 'nora', 'julia', 'clara',
  'silvia', 'monica', 'mónica', 'irene', 'raquel', 'pilar', 'blanca',
  'lyra', 'arya', 'daenerys', 'cersei', 'sansa', 'elsa', 'aurora',
  'bella', 'emma', 'olivia', 'ava', 'isabella', 'amelia', 'luna',
  'valentina', 'camila', 'valeria', 'natalia', 'gabriela', 'daniela',
]);

const MALE_NAMES = new Set([
  'juan', 'carlos', 'pedro', 'jose', 'josé', 'miguel', 'antonio', 'francisco',
  'manuel', 'david', 'luis', 'jorge', 'alberto', 'alejandro', 'rafael',
  'sergio', 'daniel', 'pablo', 'javier', 'mario', 'roberto', 'diego',
  'marcos', 'dorian', 'gabriel', 'hector', 'héctor', 'victor', 'víctor',
  'jorge', 'andres', 'andrés', 'felipe', 'hugo', 'iván', 'ivan', 'rubén',
  // Fantasía común
  'aragorn', 'frodo', 'gandalf', 'legolas', 'gimli', 'boromir', 'faramir',
  'jaime', 'tyrion', 'ned', 'jon', 'robb', 'bran', 'theon',
]);

// ─── Sufijos de género ─────────────────────────────────────────────────────────
// Se aplican al nombre limpio (en minúsculas, sin artículo inicial).
const FEMININE_SUFFIXES = ['-a', '-ia', '-ía', '-cion', '-ción', '-sion', '-sión', '-triz', '-iz', '-dad', '-tad', '-umbre'];
const MASCULINE_SUFFIXES = ['-o', '-or', '-on', '-ón', '-es', '-és', '-al', '-il'];

// ─── Artículos determinantes iniciales ────────────────────────────────────────
const ARTICLE_REGEX = /^(el|la|los|las|un|una|unos|unas)\s+/i;
const FEMININE_ARTICLES = new Set(['la', 'las', 'una', 'unas']);
const MASCULINE_ARTICLES = new Set(['el', 'los', 'un', 'unos']);

/**
 * resolveEntityGender(entityName, language) → 'M' | 'F' | 'N'
 *
 * Resolución de género completamente efímera: regex + mini-set + sufijos.
 *
 * @param {string} entityName
 * @param {string} language ('es' | 'en')
 * @returns {'M'|'F'|'N'}
 */
export function resolveEntityGender(entityName, language = 'es') {
  if (!entityName || typeof entityName !== 'string') return 'N';

  const trimmed = entityName.trim();

  // 1. Artículo explícito al inicio del nombre (máxima fiabilidad)
  // En inglés "the" es neutro neutro, no discrimina género, por lo que esto solo aplica a ESPañol
  if (language === 'es') {
    const articleMatch = trimmed.match(ARTICLE_REGEX);
    if (articleMatch) {
      const article = articleMatch[1].toLowerCase();
      if (FEMININE_ARTICLES.has(article)) return 'F';
      if (MASCULINE_ARTICLES.has(article)) return 'M';
    }
  }

  // 2. Nombre limpio para búsquedas (sin artículo, en minúsculas, sin diacríticos)
  const cleanName = trimmed
    .replace(ARTICLE_REGEX, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Tomar solo la primera palabra del nombre (ej: "Marcos Vidal" → "marcos")
  const firstWord = cleanName.split(/\s+/)[0];

  // 3. Mini-set de nombres propios (Válido para ES y EN, ya que los SETs tienen nombres de ambos)
  if (FEMALE_NAMES.has(firstWord)) return 'F';
  if (MALE_NAMES.has(firstWord)) return 'M';

  // 4. Heurística por sufijos sobre el nombre limpio completo
  // MUY útil en español, irrelevante en inglés salvo palabras asimiladas (ej: actor/actress)
  if (language === 'es') {
    // Femenino tiene prioridad por ser más específico en español
    for (const suffix of FEMININE_SUFFIXES) {
      const s = suffix.replace('-', '');
      if (cleanName.endsWith(s)) {
        if (suffix !== '-a' || !MASCULINE_SUFFIXES.some(ms => {
          const ms2 = ms.replace('-', '');
          return cleanName.endsWith('ma') || cleanName.endsWith('ta') || cleanName.endsWith('pa');
        })) {
          return 'F';
        }
      }
    }
    for (const suffix of MASCULINE_SUFFIXES) {
      const s = suffix.replace('-', '');
      if (cleanName.endsWith(s)) return 'M';
    }
  }

  // 5. Fallback: NEUTRO (el sistema no marca nada si no está seguro)
  return 'N';
}

// ─── Separadores de escena (hard reset) ───────────────────────────────────────
const SCENE_BREAK_REGEX = /^\s*(\*\s*\*\s*\*|\-\-\-|#{3,}|={3,})\s*$/m;

// ─── Regex de pronombres españoles ────────────────────────────────────────────
// Pilla pronombres aislados pero TAMBIÉN clíticos en infinitivos/gerundios comunes
// (ej: buscarlo, lamerle). Se añade la captura condicional de terminación verbal.
// Utilizamos un grupo de lookbehind (?:ar|er|ir|ndo|ad|ed|id) en lugar de una clase de caracteres [] que estaba causando múltiples falsos positivos.
// IMPORTANTE: Se han EXCLUIDO 'la', 'los', 'las' de la lista de pronombres aislados porque el 95% de las veces en español son artículos definidos ("la casa"). Solo se detectarán si van pegados como clíticos ("buscarla").
const ES_PRONOUN_REGEX = /(?<![a-záéíóúüñA-ZÁÉÍÓÚÜÑ])(él|ella|ellos|ellas|lo|le|les|se)(?![a-záéíóúüñA-ZÁÉÍÓÚÜÑ])|(?<=(?:ar|er|ir|ndo|ad|ed|id|ndola|ndolo|ndole))(lo|la|le|los|las|les|se|me|te)(?![a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/gi;

const ES_PRONOUN_GENDER = {
  'él':     'M',
  'ella':   'F',
  'ellos':  'M',
  'ellas':  'F',
  'lo':     'M',
  'la':     'F',
  'le':     'N', // puede ser M o F (complemento indirecto)
  'los':    'M',
  'las':    'F',
  'se':     'N',
};

const ES_PRONOUN_TYPE_PRIORITY = {
  'le':  ['characters', 'lore'],           
  'les': ['characters', 'lore'],
  'lo':  ['objects', 'characters', 'lore'],
  'la':  ['objects', 'characters', 'lore'],
  'los': ['objects', 'characters', 'lore'],
  'las': ['objects', 'characters', 'lore'],
  'él':  ['characters'],
  'ella':['characters'],
  'ellos':['characters'],
  'ellas':['characters'],
  'se':  ['characters'],
};

// ─── Regex de pronombres ingleses ─────────────────────────────────────────────
const EN_PRONOUN_REGEX = /\b(he|she|it|they|him|her|them|his|hers|its|their|theirs|himself|herself|itself|themselves)\b/gi;

const EN_PRONOUN_GENDER = {
  'he':         'M',
  'him':        'M',
  'his':        'M',
  'himself':    'M',
  'she':        'F',
  'her':        'F',
  'hers':       'F',
  'herself':    'F',
  'it':         'N',
  'its':        'N',
  'itself':     'N',
  'they':       'N', // Used as gender-neutral singular or plural
  'them':       'N',
  'their':      'N',
  'theirs':     'N',
  'themselves': 'N',
};

const EN_PRONOUN_TYPE_PRIORITY = {
  'he':         ['characters'],
  'him':        ['characters'],
  'his':        ['characters'],
  'himself':    ['characters'],
  'she':        ['characters'],
  'her':        ['characters'],
  'hers':       ['characters'],
  'herself':    ['characters'],
  'it':         ['objects', 'locations', 'lore', 'characters'], // Prioritizes non-humans heavily
  'its':        ['objects', 'locations', 'lore', 'characters'],
  'itself':     ['objects', 'locations', 'lore', 'characters'],
  'they':       ['characters', 'lore'],
  'them':       ['characters', 'lore'],
  'their':      ['characters', 'lore'],
  'theirs':     ['characters', 'lore'],
  'themselves': ['characters', 'lore'],
};

/**
 * Normaliza texto para comparación: minúsculas + sin diacríticos.
 */
function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Obtiene el nombre primario de una entidad de cualquier tabla.
 */
function getEntityName(entity) {
  return entity.name || entity.title || '';
}

/**
 * Asigna un color de la paleta a una entidad de forma determinista
 * basándose en el hash del nombre.
 */
function hashColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return ENTITY_PALETTE[Math.abs(hash) % ENTITY_PALETTE.length];
}

/**
 * Divide el texto en párrafos: rompe por líneas dobles o etiquetas de párrafo HTML.
 */
function splitIntoParagraphs(text) {
  // Normalizar saltos de etiquetas HTML de párrafo
  const plainText = text.replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '');
  return plainText.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
}

/**
 * Divide un párrafo en frases (por punto, interrogación, exclamación, etc.)
 */
function splitIntoSentences(paragraph) {
  return paragraph.split(/(?<=[.!?¡¿])\s+/).filter(s => s.length > 0);
}

/**
 * buildSaliencyScoreboard(text, entityData, language)
 * ─────────────────────────────────────────
 * Construye el marcador de saliencia procesando el texto párrafo a párrafo.
 *
 * Reglas:
 *  - Mención de entidad (nombre o alias): +100 pts
 *  - Bonus sujeto (al inicio de frase): +25 pts
 *  - Decaimiento al cambiar de párrafo: × 0.75
 *  - Hard reset en separador de escena (***): todas las entidades a 0
 *
 * @param {string} text - Texto plano o HTML del editor
 * @param {Object} entityData - { characters: [...], locations: [...], ... }
 * @param {string} language ('es' | 'en')
 * @returns {Map<string, { score: number, type: string, gender: string, color: string }>}
 */
export function buildSaliencyScoreboard(text, entityData, language = 'es') {
  if (!text || !entityData) return new Map();

  // Construir índice de entidades: nombre normalizado → metadata
  const entityIndex = new Map();

  const ENTITY_TABLES = ['characters', 'locations', 'objects', 'lore', 'resources'];
  for (const table of ENTITY_TABLES) {
    const items = entityData[table] || [];
    for (const item of items) {
      const primaryName = getEntityName(item);
      if (!primaryName) continue;

      const normName = normalize(primaryName);
      const gender = resolveEntityGender(primaryName, language);
      const color = item.color || hashColor(primaryName);

      entityIndex.set(normName, {
        originalName: primaryName,
        type: table,
        gender,
        color,
        score: 0,
      });

      // También indexar aliases si los hay (campo tags como array de strings cortos)
      if (Array.isArray(item.aliases)) {
        for (const alias of item.aliases) {
          if (alias && typeof alias === 'string' && alias.trim().length >= 2) {
            const normAlias = normalize(alias);
            if (!entityIndex.has(normAlias)) {
              entityIndex.set(normAlias, {
                originalName: primaryName, // resuelve al nombre primario
                type: table,
                gender,
                color,
                score: 0,
              });
            }
          }
        }
      }
    }
  }

  if (entityIndex.size === 0) return new Map();

  // ── Separar en párrafos ───────────────────────────────────────────────────
  // Detectar hard-reset de escena en el texto completo
  const paragraphs = splitIntoParagraphs(text);

  for (const paragraph of paragraphs) {
    // Hard reset si el párrafo es un separador de escena
    if (SCENE_BREAK_REGEX.test(paragraph)) {
      for (const [, entry] of entityIndex) {
        entry.score = 0;
      }
      continue;
    }

    // ── Decaimiento exponencial al entrar en un nuevo párrafo ────────────
    for (const [, entry] of entityIndex) {
      entry.score = Math.floor(entry.score * 0.75);
    }

    // ── Escaneo de menciones en este párrafo ─────────────────────────────
    const normParagraph = normalize(paragraph);
    const sentences = splitIntoSentences(paragraph);

    for (const [normName, entry] of entityIndex) {
      if (normName.length < 2) continue;

      // Detección de mención: búsqueda de word boundary en el párrafo normalizado
      // Usamos regex dinámico con escape de caracteres especiales
      const escaped = normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mentionRe = new RegExp(`(?<![a-záéíóúüñ])${escaped}(?![a-záéíóúüñ])`, 'gi');

      const mentionMatches = normParagraph.match(mentionRe);
      if (mentionMatches && mentionMatches.length > 0) {
        // +100 por cada mención (primera solo; no multiplicamos por mención)
        entry.score += 100;

        // Bonus de sujeto: ¿aparece al inicio de alguna frase?
        for (const sentence of sentences) {
          const normSentence = normalize(sentence).trimStart();
          if (normSentence.startsWith(normName)) {
            entry.score += 25;
            break; // Un bonus por párrafo es suficiente
          }
        }
      }
    }
  }

  // Devolver solo entidades con score > 0, agrupadas por nombre original
  const result = new Map();
  const seen = new Set();
  for (const [, entry] of entityIndex) {
    if (entry.score > 0 && !seen.has(entry.originalName)) {
      seen.add(entry.originalName);
      result.set(entry.originalName, {
        score: entry.score,
        type: entry.type,
        gender: entry.gender,
        color: entry.color,
      });
    }
  }

  return result;
}

/**
 * resolveCoreferences(activeText, scores, entityData, activeEntityNames?, language?)
 * ──────────────────────────────────────────────
 * Detecta pronombres/clíticos en el texto activo y los resuelve a la entidad
 * más saliente compatible con género y tipo.
 *
 * Regla de silencio: si hay empate absoluto (mismo top score entre dos
 * candidatos del mismo género), el chip NO se emite.
 *
 * @param {string} activeText - Texto sobre el que buscar los pronombres (ej. la selección del usuario)
 * @param {Map} scores - Output de buildSaliencyScoreboard (calculado sobre contexto extendido)
 * @param {Object} entityData - Para obtener metadata adicional
 * @param {Set} [activeEntityNames] - Nombres de entidades con chip activo (semáforo amarillo)
 * @param {string} language - Idioma ('es' | 'en')
 * @returns {Array<{pronoun, position, resolvedTo, entityType, entityColor, confidence, reason}>}
 */
export function resolveCoreferences(activeText, scores, entityData, activeEntityNames = new Set(), language = 'es') {
  if (!activeText || !scores || scores.size === 0) return [];

  const results = [];
  const plainText = activeText.replace(/<[^>]+>/g, ' ');

  const currentRegex = language === 'en' ? EN_PRONOUN_REGEX : ES_PRONOUN_REGEX;
  const currentGenderMap = language === 'en' ? EN_PRONOUN_GENDER : ES_PRONOUN_GENDER;
  const currentPriorityMap = language === 'en' ? EN_PRONOUN_TYPE_PRIORITY : ES_PRONOUN_TYPE_PRIORITY;

  // Resetear la búsqueda del regex (estado global entre llamadas)
  currentRegex.lastIndex = 0;

  let match;
  while ((match = currentRegex.exec(plainText)) !== null) {
    const pronoun = match[0].toLowerCase();
    const pronounGender = currentGenderMap[pronoun] ?? 'N';
    const typePriorities = currentPriorityMap[pronoun] ?? null;

    // ── Filtrar candidatos por género ────────────────────────────────────
    let candidates = [];
    for (const [name, meta] of scores) {
      const { score, type, gender, color } = meta;
      if (score <= 0) continue;

      // Filtro de género excluyente
      if (pronounGender === 'M' && gender === 'F') continue;
      if (pronounGender === 'F' && gender === 'M') continue;
      // 'N' (pronombre) acepta cualquier género

      // Filtro de tipo (si el pronombre tiene preferencia)
      let typeScore = 1; // Multiplicador base
      if (typePriorities) {
        const idx = typePriorities.indexOf(type);
        if (idx === -1) continue; // tipo excluido totalmente si no sale en la lista
        
        // Multiplicador agresivo para forzar la jerarquía semántica:
        // índice 0 (pj: objects): x4
        // índice 1 (pj: characters): x2
        // índice 2 (pj: lore): x1
        typeScore = Math.pow(2, typePriorities.length - 1 - idx);
      }

      // El score real ponderado por la jerarquía gramatical del pronombre
      const weightedScore = score * typeScore;

      candidates.push({ name, score: weightedScore, rawScore: score, type, color, gender, typeScore });
    }

    if (candidates.length === 0) continue;

    // ── Ordenar candidatos ────────────────────────────────────────────────
    // 1. Por score ponderado (salience points * type priority multiplier)
    // 2. Desempate: entidad activa en el semáforo primero
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aActive = activeEntityNames.has(a.name) ? 1 : 0;
      const bActive = activeEntityNames.has(b.name) ? 1 : 0;
      return bActive - aActive;
    });

    const top = candidates[0];
    const second = candidates[1];

    // ── Regla de silencio: empate absoluto → no chip ──────────────────────
    if (second && top.score === second.score && top.typeScore === second.typeScore) {
      // Empate irresolvible → silencio
      continue;
    }

    // ── Determinar confianza ──────────────────────────────────────────────
    const scoreDelta = second ? (top.score - second.score) : Infinity;
    const confidence = scoreDelta > 50 ? 'high' : 'low';

    results.push({
      pronoun: match[0],           // preservar case original
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
      resolvedTo: top.name,
      entityType: top.type,
      entityColor: top.color,
      confidence,
      reason: 'coref_tag',         // hook pasivo para que AIPanel.jsx lo traduzca
      scoreDelta,
    });
  }

  return results;
}

/**
 * runSaliencyEngine(fullContextText, activeText, entityData, activeEntityNames?, language?)
 * ────────────────────────────────────────────────────────
 * Función de entrada única. Orquesta buildSaliencyScoreboard (usando contexto completo)
 * + resolveCoreferences (solo sobre el fragmento activo).
 *
 * @param {string} fullContextText - Texto completo de la escena (retroactivo para el Scoreboard)
 * @param {string} activeText - Fragmento seleccionado por el usuario (donde se emitirán chips)
 * @param {Object} entityData - Datos del compendio ya cargados
 * @param {Set} [activeEntityNames] - Nombres con chip activo (semáforo amarillo)
 * @param {string} language - Idioma en curso ('en' o 'es')
 * @returns {{ scores: Map, coreferences: Array }}
 */
export function runSaliencyEngine(fullContextText, activeText, entityData, activeEntityNames = new Set(), language = 'es') {
  const scores = buildSaliencyScoreboard(fullContextText, entityData, language);
  const coreferences = resolveCoreferences(activeText, scores, entityData, activeEntityNames, language);
  return { scores, coreferences };
}
