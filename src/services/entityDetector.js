import { db } from '../db/database';

const ENTITY_TABLES = ['characters', 'locations', 'objects', 'lore', 'resources'];

const ENTITY_LABELS = {
  characters: 'personaje',
  locations: 'ubicación',
  objects: 'objeto',
  lore: 'lore',
  resources: 'recurso',
};

const SEARCHABLE_FIELDS = {
  characters: ['name', 'role', 'occupation', 'description', 'traits'],
  locations: ['name', 'type', 'climate', 'description', 'tags', 'associatedCharacters'],
  objects: ['name', 'type', 'importance', 'currentOwner', 'origin', 'description', 'tags'],
  lore: ['title', 'category', 'summary', 'tags'],
  resources: ['name', 'description', 'tags'],
};

export async function loadAllEntityData(novelId) {
  if (!novelId) return { characters: [], locations: [], objects: [], lore: [], resources: [] };

  const result = {};
  for (const table of ENTITY_TABLES) {
    result[table] = await db[table].where('novelId').equals(novelId).toArray();
  }
  return result;
}

function extractSearchTerms(entity, fields) {
  const terms = new Set();
  for (const field of fields) {
    const value = entity[field];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim().length >= 2) {
          terms.add(item.trim());
        } else if (typeof item === 'object' && item !== null) {
          for (const v of Object.values(item)) {
            if (typeof v === 'string' && v.trim().length >= 2) {
              terms.add(v.trim());
            }
          }
        }
      }
    } else if (typeof value === 'string' && value.trim().length >= 2) {
      terms.add(value.trim());
    }
  }
  return [...terms];
}

export function detectEntitiesInText(text, entityData) {
  if (!text || typeof text !== 'string' || !entityData) return [];

  const detections = [];
  const seen = new Set();
  const lowerText = text.toLowerCase();

  for (const [table, items] of Object.entries(entityData)) {
    const fields = SEARCHABLE_FIELDS[table];
    if (!fields) continue;

    for (const item of items) {
      const terms = extractSearchTerms(item, fields);
      let matched = false;
      let primaryName = item.name || item.title || '';

      for (const term of terms) {
        const lowerTerm = term.toLowerCase();

        if (lowerText.includes(lowerTerm)) {
          matched = true;
          break;
        }

        const parts = lowerTerm.split(/\s+/);
        for (const part of parts) {
          if (part.length >= 3 && lowerText.includes(part)) {
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      const key = `${table}:${primaryName.toLowerCase()}`;
      if (matched && !seen.has(key)) {
        seen.add(key);
        detections.push({
          type: table,
          label: ENTITY_LABELS[table],
          name: primaryName,
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
    // fallback to keyword detection
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
