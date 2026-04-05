import { db } from '../db/database';

const ENTITY_TABLES = ['characters', 'locations', 'objects', 'lore', 'resources'];

const ENTITY_LABELS = {
  characters: 'personaje',
  locations: 'ubicación',
  objects: 'objeto',
  lore: 'lore',
  resources: 'recurso',
};

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al',
  'a', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'hasta', 'desde', 'hacia',
  'y', 'e', 'o', 'u', 'pero', 'ni', 'que', 'si', 'no', 'ya', 'así', 'como', 'porque',
  'es', 'son', 'está', 'están', 'ser', 'siendo', 'sido', 'estar', 'he', 'ha', 'han', 'hay',
  'este', 'esta', 'esto', 'estos', 'estas', 'ese', 'esa', 'eso', 'esos', 'esas',
  'aquel', 'aquella', 'aquello', 'aquellos', 'aquellas',
  'mi', 'tu', 'su', 'nuestro', 'nuestra', 'mis', 'tus', 'sus', 'nuestros', 'nuestras',
  'me', 'te', 'se', 'nos', 'os',
  'lo', 'le', 'les',
  'mas', 'más', 'muy', 'todo', 'toda', 'todos', 'todas', 'cada',
  'cual', 'cuales', 'donde', 'cuando', 'cuanto', 'cuanta',
  'otro', 'otra', 'otros', 'otras',
  'mismo', 'misma', 'mismos', 'mismas',
  'primero', 'primera', 'último', 'última',
  'gran', 'grande', 'grandes', 'pequeño', 'pequeña', 'pequeños', 'pequeñas',
  'nuevo', 'nueva', 'nuevos', 'nuevas', 'viejo', 'vieja', 'viejos', 'viejas',
  'bueno', 'buena', 'buenos', 'buenas', 'malo', 'mala', 'malos', 'malas',
  'poco', 'poca', 'pocos', 'pocas', 'mucho', 'mucha', 'muchos', 'muchas',
  'ahora', 'antes', 'después', 'siempre', 'nunca', 'jamás',
  'aquí', 'allí', 'allá', 'aca', 'ahí',
  'bien', 'mal', 'mejor', 'peor',
  'solo', 'sólo', 'sola',
]);

const CRITICAL_FIELDS = {
  characters: ['name', 'role', 'occupation', 'traits'],
  locations: ['name', 'type', 'climate', 'tags'],
  objects: ['name', 'type', 'importance', 'tags'],
  lore: ['title', 'category', 'tags'],
  resources: ['name', 'tags'],
};

const DOUBTFUL_FIELDS = ['description', 'summary'];

const MIN_LENGTH_DOUBTFUL = 4;
const MIN_LENGTH_NAME = 2; // Solo para personajes (nombres cortos como "Ana", "Paz")

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:!¡?¿"'"()\[\]{}—–\-]/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeText(text).split(/\s+/).filter(word => word.length > 0);
}

function extractTerms(entity, table) {
  const criticalFields = CRITICAL_FIELDS[table] || [];
  const terms = [];
  
  for (const [field, value] of Object.entries(entity)) {
    if (!value) continue;
    
    const isCritical = criticalFields.includes(field);
    const isDoubtful = DOUBTFUL_FIELDS.includes(field);
    
    if (!isCritical && !isDoubtful) continue;
    
    // Longitud mínima: personajes = 2 (nombres cortos como "Ana"), resto = 4
    const isName = field === 'name' || field === 'title';
    const minLength = (table === 'characters' && isName) ? MIN_LENGTH_NAME : MIN_LENGTH_DOUBTFUL;
    
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          const normalized = normalizeText(item);
          const words = tokenize(normalized);
          for (const word of words) {
            if (word.length >= minLength) {
              terms.push({ word, isCritical });
            }
          }
        }
      }
    } else if (typeof value === 'string' && value.trim()) {
      const normalized = normalizeText(value);
      const words = tokenize(normalized);
      for (const word of words) {
        if (word.length >= minLength) {
          terms.push({ word, isCritical });
        }
      }
    }
  }
  
  return terms;
}

export async function loadAllEntityData(novelId) {
  if (!novelId) return { characters: [], locations: [], objects: [], lore: [], resources: [] };

  const result = {};
  for (const table of ENTITY_TABLES) {
    const allItems = await db[table].where('novelId').equals(novelId).toArray();
    result[table] = allItems.filter(item => item.ignoredForOracle !== 1);
  }
  return result;
}

export function detectEntitiesInText(text, entityData) {
  if (!text || typeof text !== 'string' || !entityData) return [];

  const detections = [];
  const seen = new Set();
  const cleanedText = normalizeText(text);
  const textTokens = tokenize(cleanedText);

  for (const [table, items] of Object.entries(entityData)) {
    if (!items || items.length === 0) continue;

    for (const item of items) {
      const primaryName = item.name || item.title || '';
      if (!primaryName) continue;

      const key = `${table}:${normalizeText(primaryName)}`;
      if (seen.has(key)) continue;

      const terms = extractTerms(item, table);
      const criticalMatches = new Set();
      const doubtfulMatches = new Set();

      for (const { word, isCritical } of terms) {
        if (isCritical) {
          if (textTokens.includes(word)) {
            criticalMatches.add(word);
          }
        } else {
          if (word.length >= MIN_LENGTH_DOUBTFUL && textTokens.includes(word)) {
            doubtfulMatches.add(word);
          }
        }
      }

      const hasCritical = criticalMatches.size > 0;
      const hasDoubtful = doubtfulMatches.size >= 2;

      if (hasCritical || hasDoubtful) {
        seen.add(key);
        detections.push({
          type: table,
          label: ENTITY_LABELS[table],
          name: primaryName,
          severity: hasCritical ? 'critical' : 'doubtful',
          matchedTerms: [...criticalMatches, ...doubtfulMatches],
        });
      }
    }
  }

  return detections;
}

export function createDebouncedEntityDetector(callback, delay = 3000) {
  let timeoutId = null;
  let lastResolve = null;
  let lastReject = null;

  const debounced = (text, novelId) => {
    if (timeoutId) clearTimeout(timeoutId);

    if (lastReject) {
      lastReject(new DOMException('Entity detection cancelled', 'AbortError'));
      lastReject = null;
      lastResolve = null;
    }

    return new Promise((resolve, reject) => {
      lastResolve = resolve;
      lastReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const entityData = await loadAllEntityData(novelId);
          const detections = detectEntitiesInText(text, entityData);
          if (lastResolve) lastResolve({ entityData, detections });
          lastResolve = null;
          lastReject = null;
        } catch (err) {
          if (lastReject) lastReject(err);
          lastResolve = null;
          lastReject = null;
        }
      }, delay);
    });
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (lastReject) {
      lastReject(new DOMException('Entity detection cancelled', 'AbortError'));
      lastReject = null;
      lastResolve = null;
    }
    timeoutId = null;
  };

  debounced.immediate = async (text, novelId) => {
    if (timeoutId) clearTimeout(timeoutId);
    if (lastReject) {
      lastReject(new DOMException('Entity detection cancelled', 'AbortError'));
      lastReject = null;
      lastResolve = null;
    }
    timeoutId = null;
    const entityData = await loadAllEntityData(novelId);
    const detections = detectEntitiesInText(text, entityData);
    return { entityData, detections };
  };

  return debounced;
}

export function parseOracleResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*"hasContradiction"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hasContradiction: !!parsed.hasContradiction,
        message: parsed.message || text,
      };
    }
  } catch (e) {
  }

  const contradictionKeywords = [
    'contradicción', 'contradiccion', 'inconsistencia', 'incoherencia',
    'error de coherencia', 'no coincide', 'discrepancia',
    'según el compendio', 'según las fichas', 'el compendio indica',
    'es incorrecto', 'es erróneo', 'no es correcto',
  ];

  const lowerText = text.toLowerCase();
  const hasContradiction = contradictionKeywords.some(kw => lowerText.includes(kw));

  return {
    hasContradiction,
    message: text,
  };
}

export { ENTITY_TABLES, ENTITY_LABELS };
