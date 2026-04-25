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

function jaroWinklerSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  
  const clean = s => s.toLowerCase().replace(/[-]/g, ' ').replace(/[_-]/g, ' ').replace(/[,;.]/g, ' ').replace(/[()[\]{}]/g, ' ').replace(/['"]/g, '').trim();
  const n1 = clean(s1);
  const n2 = clean(s2);
  
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 1;
  
  const len1 = n1.length;
  const len2 = n2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchWindow < 0) matchWindow = 0;
  
  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);
  let matches = 0;
  let transpositions = 0;
  
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (matches2[j] || n1[i] !== n2[j]) continue;
      matches1[i] = true;
      matches2[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (n1[i] !== n2[k]) transpositions++;
    k++;
  }
  
  const jaro = (
    matches / len1 +
    matches / len2 +
    (matches - transpositions / 2) / matches
  ) / 3;
  
  let prefix = 0;
  const maxPrefix = Math.min(4, len1, len2);
  for (let i = 0; i < maxPrefix; i++) {
    if (n1[i] === n2[i]) prefix++;
    else break;
  }
  
  return jaro + prefix * 0.1 * (1 - jaro);
}

const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a', 'en', 'por', 'para', 'con', 'sin', 'sobre', 'entre', 'y', 'o', 'u', 'que', 'es', 'son', 'de', 'se', 'lo', 'su', 'sus', 'mi', 'tu', 'ni', 'si', 'ya', 'yo', 'te', 'me', 'le', 'nos', 'os']);

function tokenOverlapSimilarity(s1, s2) {
  const clean = s => s.toLowerCase().replace(/[-]/g, ' ').replace(/[_-]/g, ' ').replace(/[,;:]/g, ' ').replace(/[()[\]{}]/g, ' ').replace(/['"]/g, '').trim();
  const tokens1 = clean(s1).split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t));
  const tokens2 = clean(s2).split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t));
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  let common = 0;
  for (const t of set1) {
    if (set2.has(t)) {
      common++;
    } else {
      for (const t2 of set2) {
        if (t.includes(t2) || t2.includes(t)) {
          common += 0.5;
          break;
        }
      }
    }
  }
  
  const maxLen = Math.max(tokens1.length, tokens2.length);
  return common / maxLen;
}

class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = Array(n).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return;
    
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }

  getGroups() {
    const groups = new Map();
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(i);
    }
    return [...groups.values()].filter(g => g.length > 1);
  }
}

function buildSimilarityPairs(items, threshold = 0.70) {
  const pairs = [];
  const nameField = items[0].name !== undefined ? 'name' : 'title';
  
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const name1 = items[i][nameField] || '';
      const name2 = items[j][nameField] || '';
      
      if (!name1 || !name2) continue;
      
      const jwSim = jaroWinklerSimilarity(name1, name2);
      const tokenSim = tokenOverlapSimilarity(name1, name2);
      
      const similarity = Math.max(jwSim, tokenSim * 0.95);
      
      if (similarity >= threshold) {
        pairs.push({
          entity1: items[i],
          entity2: items[j],
          similarity: Math.round(similarity * 100) / 100,
          name1,
          name2,
          idx1: i,
          idx2: j,
        });
      }
    }
  }
  
  return pairs;
}

export async function findSimilarEntities(items, threshold = 0.70) {
  if (!items || items.length < 2) return [];
  
  const pairs = buildSimilarityPairs(items, threshold);
  
  if (pairs.length === 0) return [];
  
  const uf = new UnionFind(items.length);
  for (const pair of pairs) {
    uf.union(pair.idx1, pair.idx2);
  }
  
  const groups = uf.getGroups();
  
  const resultGroups = groups.map(groupIndices => {
    const entities = groupIndices.map(idx => items[idx]);
    const groupPairs = pairs.filter(p => 
      groupIndices.includes(p.idx1) && groupIndices.includes(p.idx2)
    );
    const avgSimilarity = groupPairs.length > 0
      ? groupPairs.reduce((sum, p) => sum + p.similarity, 0) / groupPairs.length
      : 1;
    
    return {
      type: 'group',
      entities,
      similarity: Math.round(avgSimilarity * 100) / 100,
      size: entities.length,
    };
  });
  
  const resultPairs = pairs.map(({ idx1: _, idx2: __, ...rest }) => rest);
  
  return {
    pairs: resultPairs.sort((a, b) => b.similarity - a.similarity),
    groups: resultGroups.sort((a, b) => b.similarity - a.similarity),
  };
}

export { ENTITY_TABLES, ENTITY_LABELS };
