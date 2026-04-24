import { db } from '../db/database';
import { getEntityStopWords, getEntityStopWordsWithCustom } from '../i18n/stopwords';

const ENTITY_TABLES = ['characters', 'locations', 'objects', 'lore', 'resources'];

const ENTITY_LABELS = {
  characters: 'personaje',
  locations: 'ubicación',
  objects: 'objeto',
  lore: 'lore',
  resources: 'recurso',
};

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

export function detectEntitiesInText(text, entityData, customStopWords = null) {
  if (!text || typeof text !== 'string' || !entityData) return [];

  const detections = [];
  const seen = new Set();
  const cleanedText = normalizeText(text);
  const textTokens = tokenize(cleanedText);

  const stopWords = customStopWords instanceof Set ? customStopWords : new Set();
  const filteredTextTokens = textTokens.filter(t => !stopWords.has(t));

  for (const [table, items] of Object.entries(entityData)) {
    if (!items || items.length === 0) continue;

    for (const item of items) {
      try {
        const primaryName = item.name || item.title || '';
        if (!primaryName) continue;

        const key = `${table}:${normalizeText(primaryName)}`;
        if (seen.has(key)) continue;

        const terms = extractTerms(item, table);
        const criticalMatches = new Set();
        const doubtfulMatches = new Set();

        for (const { word, isCritical } of terms) {
          if (isCritical) {
            if (filteredTextTokens.includes(word)) {
              criticalMatches.add(word);
            }
          } else {
            if (word.length >= MIN_LENGTH_DOUBTFUL && filteredTextTokens.includes(word)) {
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
      } catch (err) {
        console.error('[EntityDetector] Error processing item:', item, err);
      }
    }
  }

  return detections;
}

export function createDebouncedEntityDetector(callback, delay = 3000) {
  let timeoutId = null;
  let lastResolve = null;
  let lastReject = null;

  const getStopWords = async (lang) => {
    return await getEntityStopWordsWithCustom(lang);
  };

  const debounced = async (text, novelId, lang = 'es') => {
    if (timeoutId) clearTimeout(timeoutId);

    if (lastReject) {
      lastReject(new DOMException('Entity detection cancelled', 'AbortError'));
      lastReject = null;
      lastResolve = null;
    }

    return new Promise(async (resolve, reject) => {
      lastResolve = resolve;
      lastReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const [entityData, customStopWords] = await Promise.all([
            loadAllEntityData(novelId),
            getStopWords(lang)
          ]);
          const detections = detectEntitiesInText(text, entityData, customStopWords);
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

  debounced.immediate = async (text, novelId, lang = 'es') => {
    if (timeoutId) clearTimeout(timeoutId);
    if (lastReject) {
      lastReject(new DOMException('Entity detection cancelled', 'AbortError'));
      lastReject = null;
      lastResolve = null;
    }
    timeoutId = null;
    const [entityData, customStopWords] = await Promise.all([
      loadAllEntityData(novelId),
      getStopWords(lang)
    ]);
    const detections = detectEntitiesInText(text, entityData, customStopWords);
    return { entityData, detections };
  };

  return debounced;
}

export function parseOracleResponse(text) {
  try {
    if (!text || typeof text !== 'string') {
      return { hasContradiction: false, message: '' };
    }
    
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

  if (!text) {
    return { hasContradiction: false, message: '' };
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
