import { db } from '../db/database';
import { getSearchStopWords } from '../i18n/stopwords';

const CATEGORY_LABELS = {
  characters: 'PERSONAJE',
  locations: 'LOCALIZACIÓN',
  objects: 'OBJETO',
  lore: 'LORE',
  resources: 'RECURSO',
};

const TABLE_CONFIG = {
  characters: {
    nameField: 'name',
    searchableFields: ['name', 'role', 'occupation', 'description', 'traits', 'tags'],
    relationFields: ['relations'],
  },
  locations: {
    nameField: 'name',
    searchableFields: ['name', 'type', 'climate', 'description', 'tags', 'associatedCharacters'],
  },
  objects: {
    nameField: 'name',
    searchableFields: ['name', 'type', 'importance', 'currentOwner', 'origin', 'description', 'tags'],
  },
  lore: {
    nameField: 'title',
    searchableFields: ['title', 'category', 'summary', 'tags'],
  },
  resources: {
    nameField: 'name',
    searchableFields: ['name', 'type', 'description', 'content', 'tags'],
  },
};

export function extractKeywords(text) {
  if (!text || typeof text !== 'string') return [];

  const normalized = text
    .toLowerCase()
    .replace(/[¿?¡!.,;:(){}[\]"'«»\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized.split(' ').filter(Boolean);
  const keywords = [];
  const seen = new Set();
  const stopWords = getStopWords();

  for (const token of tokens) {
    if (token.length < 3) continue;
    if (stopWords.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    keywords.push(token);
  }

  return keywords;
}

function keywordMatchesInField(value, keywords) {
  if (!value || typeof value !== 'string') return 0;
  const lower = value.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) matches++;
  }
  return matches;
}

function keywordMatchesInArray(arr, keywords) {
  if (!Array.isArray(arr)) return 0;
  let matches = 0;
  for (const item of arr) {
    if (typeof item === 'string') {
      const lower = item.toLowerCase();
      for (const kw of keywords) {
        if (lower.includes(kw)) matches++;
      }
    } else if (typeof item === 'object' && item !== null) {
      for (const val of Object.values(item)) {
        if (typeof val === 'string') {
          const lower = val.toLowerCase();
          for (const kw of keywords) {
            if (lower.includes(kw)) matches++;
          }
        }
      }
    }
  }
  return matches;
}

function scoreItem(item, keywords, config) {
  let totalScore = 0;

  for (const field of config.searchableFields) {
    const value = item[field];
    if (Array.isArray(value)) {
      totalScore += keywordMatchesInArray(value, keywords);
    } else {
      totalScore += keywordMatchesInField(value, keywords);
    }
  }

  for (const field of (config.relationFields || [])) {
    const value = item[field];
    if (value) {
      totalScore += keywordMatchesInArray(value, keywords);
    }
  }

  return totalScore;
}

function buildDescription(item, table) {
  const parts = [];

  switch (table) {
    case 'characters': {
      if (item.occupation) parts.push(item.occupation);
      if (item.role) parts.push(item.role);
      if (item.traits?.length) parts.push(item.traits.join(', '));
      if (item.description) {
        const truncated = item.description.length > 200
          ? item.description.slice(0, 200) + '...'
          : item.description;
        parts.push(truncated);
      }
      break;
    }
    case 'locations': {
      if (item.type) parts.push(item.type);
      if (item.climate) parts.push(`Clima: ${item.climate}`);
      if (item.description) {
        const truncated = item.description.length > 200
          ? item.description.slice(0, 200) + '...'
          : item.description;
        parts.push(truncated);
      }
      if (item.associatedCharacters?.length) {
        parts.push(`Personajes: ${item.associatedCharacters.join(', ')}`);
      }
      break;
    }
    case 'objects': {
      if (item.type) parts.push(item.type);
      if (item.importance && item.importance !== 'Secundario') parts.push(item.importance);
      if (item.currentOwner && item.currentOwner !== 'Desconocido') parts.push(`Portador: ${item.currentOwner}`);
      if (item.origin) parts.push(`Origen: ${item.origin}`);
      if (item.description) {
        const truncated = item.description.length > 200
          ? item.description.slice(0, 200) + '...'
          : item.description;
        parts.push(truncated);
      }
      break;
    }
    case 'lore': {
      if (item.category) parts.push(item.category);
      if (item.summary) {
        const truncated = item.summary.length > 200
          ? item.summary.slice(0, 200) + '...'
          : item.summary;
        parts.push(truncated);
      }
      break;
    }
    case 'resources': {
      if (item.type) parts.push(item.type);
      if (item.description) {
        const truncated = item.description.length > 200
          ? item.description.slice(0, 200) + '...'
          : item.description;
        parts.push(truncated);
      }
      if (item.content) {
        const truncated = item.content.length > 150
          ? item.content.slice(0, 150) + '...'
          : item.content;
        parts.push(truncated);
      }
      break;
    }
  }

  return parts.join('. ') || '(Ficha registrada. Sin detalles adicionales)';
}

export async function searchCompendium(keywords, novelId) {
  if (!keywords || keywords.length === 0 || !novelId) return [];

  const tables = ['characters', 'locations', 'objects', 'lore', 'resources'];
  const allResults = [];

  for (const table of tables) {
    const config = TABLE_CONFIG[table];
    const items = await db[table].where('novelId').equals(novelId).toArray();

    for (const item of items) {
      const score = scoreItem(item, keywords, config);
      if (score > 0) {
        const nameField = config.nameField;
        allResults.push({
          table,
          category: CATEGORY_LABELS[table],
          name: item[nameField] || 'Sin nombre',
          description: buildDescription(item, table),
          score,
        });
      }
    }
  }

  allResults.sort((a, b) => b.score - a.score);

  return allResults;
}

export async function fetchDetectedEntityData(detectedEntities, novelId) {
  if (!detectedEntities || detectedEntities.length === 0 || !novelId) return '';

  const lines = [];
  for (const entity of detectedEntities) {
    const table = entity.type;
    const config = TABLE_CONFIG[table];
    if (!config) continue;

    const nameField = config.nameField;
    const entityName = entity.name;
    if (!entityName) continue;

    const items = await db[table].where('novelId').equals(novelId).toArray();
    const match = items.find(item => {
      const itemName = (item[nameField] || item.title || '').toLowerCase();
      return itemName === entityName.toLowerCase();
    });

    if (match) {
      const desc = buildDescription(match, table);
      lines.push(`[${CATEGORY_LABELS[table]}]: ${match[nameField] || match.title || 'Sin nombre'} - ${desc}`);
    }
  }

  return lines.join('\n');
}

export function formatSearchResults(results) {
  if (!results || results.length === 0) return '';

  const lines = results.map(r => `[${r.category}]: ${r.name} - ${r.description}`);
  return lines.join('\n');
}

export function createDebouncedSearch(delay = 400) {
  let timeoutId = null;
  let lastResolve = null;
  let lastReject = null;

  const debouncedSearch = (text, novelId) => {
    if (timeoutId) clearTimeout(timeoutId);

    if (lastReject) {
      lastReject(new DOMException('Search cancelled', 'AbortError'));
      lastReject = null;
      lastResolve = null;
    }

    return new Promise((resolve, reject) => {
      lastResolve = resolve;
      lastReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const keywords = extractKeywords(text);
          const results = await searchCompendium(keywords, novelId);
          const formatted = formatSearchResults(results);
          if (lastResolve) lastResolve({ keywords, results, formatted });
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

  debouncedSearch.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (lastReject) {
      lastReject(new DOMException('Search cancelled', 'AbortError'));
      lastReject = null;
      lastResolve = null;
    }
    timeoutId = null;
  };

  return debouncedSearch;
}

export { TABLE_CONFIG, CATEGORY_LABELS };
