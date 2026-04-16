import { db } from '../db/database';

const ENTITY_TABLES = ['characters', 'locations', 'objects', 'lore', 'resources'];

const ENTITY_LABELS = {
  characters: 'personaje',
  locations: 'ubicación',
  objects: 'objeto',
  lore: 'lore',
  resources: 'recurso',
};

const PRONOUNS_ES = {
  masculine: ['él', 'ella', 'ellos', 'ellas', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'lo', 'le', 'se'],
  possessive: ['su', 'sus', 'su(s)'],
  neuter: ['ello', 'esto', 'eso']
};

const PRONOUNS_EN = {
  masculine: ['he', 'she', 'they', 'this', 'that', 'these', 'those'],
  possessive: ['his', 'her', 'their', 'its'],
  neuter: ['it', 'this', 'that']
};

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

function tokenizeForMatching(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1);
}

export class HeuristicEntitySuggester {
  constructor() {
    this.contextWindow = [];
    this.lastMentionedEntities = [];
    this.currentLanguage = 'es';
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
  }

  resetContext() {
    this.contextWindow = [];
    this.lastMentionedEntities = [];
  }

  updateContextWindow(text) {
    const tokens = tokenize(text);
    if (tokens.length === 0) return;

    this.contextWindow = this.contextWindow.concat(tokens);
    
    const maxTokens = 500;
    if (this.contextWindow.length > maxTokens) {
      this.contextWindow = this.contextWindow.slice(-maxTokens);
    }
  }

  extractEntityTerms(entity, table) {
    const terms = [];
    const name = entity.name || entity.title || '';
    if (!name) return terms;

    terms.push({ value: name, type: 'name', priority: 10 });
    
    if (entity.nicknames && Array.isArray(entity.nicknames)) {
      for (const nick of entity.nicknames) {
        if (nick && typeof nick === 'string') {
          terms.push({ value: nick, type: 'nickname', priority: 5 });
        }
      }
    }
    
    const keywordFields = ['tags', 'traits', 'occupation', 'role', 'type', 'description'];
    for (const field of keywordFields) {
      if (entity[field]) {
        const value = entity[field];
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'string') {
              terms.push({ value: item, type: 'keyword', priority: 3 });
            }
          }
        } else if (typeof value === 'string') {
          terms.push({ value, type: 'keyword', priority: 3 });
        }
      }
    }

    return terms;
  }

  findPronouns(text) {
    const pronouns = this.currentLanguage === 'es' ? PRONOUNS_ES : PRONOUNS_EN;
    const allPronouns = [...pronouns.masculine, ...pronouns.possessive, ...pronouns.neuter];
    const tokens = tokenize(text);
    const found = [];

    for (let i = 0; i < tokens.length; i++) {
      if (allPronouns.includes(tokens[i])) {
        found.push({
          pronoun: tokens[i],
          position: i,
          isPossessive: pronouns.possessive.includes(tokens[i]),
          isMasculine: pronouns.masculine.includes(tokens[i]),
          isNeuter: pronouns.neuter.includes(tokens[i])
        });
      }
    }

    return found;
  }

  resolveAnaphora(pronoun, lastEntities) {
    if (!lastEntities || lastEntities.length === 0) return null;

    const pronounLower = pronoun.toLowerCase();
    const isPlural = ['ellos', 'ellas', 'they', 'these', 'those', 'esos', 'esas', 'los', 'las'].includes(pronounLower);
    const isPossessive = this.currentLanguage === 'es' 
      ? PRONOUNS_ES.possessive.includes(pronounLower)
      : PRONOUNS_EN.possessive.includes(pronounLower);

    for (const entity of lastEntities) {
      const isPluralEntity = entity.table === 'locations' || entity.table === 'objects';
      if (isPlural === isPluralEntity || isPossessive) {
        return entity;
      }
    }

    return lastEntities[0];
  }

  scoreEntity(entity, terms, textTokens, recentTokens) {
    let score = 0;
    const matchTypes = [];

    for (const term of terms) {
      const termTokens = tokenizeForMatching(term.value);
      
      for (const termToken of termTokens) {
        // Exact match
        let exactIndex = textTokens.indexOf(termToken);
        
        if (exactIndex !== -1) {
          const isRecent = exactIndex >= textTokens.length - 100;
          
          let termScore = term.priority;
          if (isRecent) termScore += 2;
          
          score += termScore;
          matchTypes.push({ term: termToken, type: term.type, isRecent, matchType: 'exact' });
        } else {
          // Fuzzy partial match - check if term token is contained in any text token
          for (let i = 0; i < textTokens.length; i++) {
            if (textTokens[i].includes(termToken) || termToken.includes(textTokens[i])) {
              const isRecent = i >= textTokens.length - 100;
              let termScore = Math.floor(term.priority * 0.6); // Lower score for fuzzy
              if (isRecent) termScore += 2;
              
              score += termScore;
              matchTypes.push({ term: termToken, type: term.type, isRecent, matchType: 'fuzzy' });
              break;
            }
          }
        }
      }
    }

    return { score, matchTypes };
  }

  scanTextForEntities(text, entityData) {
    if (!text || typeof text !== 'string') return [];

    this.updateContextWindow(text);

    const textTokens = tokenizeForMatching(text);
    const suggestions = [];
    const processedEntities = new Set();

    for (const [table, items] of Object.entries(entityData)) {
      if (!items || items.length === 0) continue;

      for (const item of items) {
        const key = `${table}:${item.id}`;
        if (processedEntities.has(key)) continue;
        processedEntities.add(key);

        const primaryName = item.name || item.title || '';
        if (!primaryName) continue;

        const terms = this.extractEntityTerms(item, table);
        const { score, matchTypes } = this.scoreEntity(item, terms, textTokens, this.contextWindow);

        if (score > 0) {
          suggestions.push({
            id: item.id,
            table,
            name: primaryName,
            score,
            matchTypes,
            label: ENTITY_LABELS[table] || table
          });

          this.lastMentionedEntities = this.lastMentionedEntities.filter(e => e.id !== item.id);
          this.lastMentionedEntities.push({
            id: item.id,
            table,
            name: primaryName,
            lastMentionPosition: textTokens.length
          });
          
          if (this.lastMentionedEntities.length > 10) {
            this.lastMentionedEntities = this.lastMentionedEntities.slice(-10);
          }
        }
      }
    }

    const pronouns = this.findPronouns(text);
    for (const pronounInfo of pronouns) {
      const resolvedEntity = this.resolveAnaphora(pronounInfo.pronoun, this.lastMentionedEntities);
      
      if (resolvedEntity) {
        const existing = suggestions.find(s => s.id === resolvedEntity.id);
        if (existing) {
          existing.score += 8;
          existing.matchTypes.push({
            type: 'anaphora',
            pronoun: pronounInfo.pronoun,
            resolvedTo: resolvedEntity.name
          });
        } else {
          suggestions.push({
            id: resolvedEntity.id,
            table: resolvedEntity.table,
            name: resolvedEntity.name,
            score: 8,
            matchTypes: [{
              type: 'anaphora',
              pronoun: pronounInfo.pronoun,
              resolvedTo: resolvedEntity.name
            }],
            label: ENTITY_LABELS[resolvedEntity.table] || resolvedEntity.table
          });
        }
      }
    }

    suggestions.sort((a, b) => b.score - a.score);

    return suggestions.slice(0, 10);
  }

  getMatchTypeIcon(matchType) {
    if (matchType.type === 'anaphora') return '🟣';
    if (matchType.type === 'name') return '🔵';
    if (matchType.type === 'nickname') return '🔵';
    if (matchType.type === 'keyword') return '⚪';
    return '⚪';
  }

  formatSuggestion(suggestion) {
    const matchIcons = [...new Set(suggestion.matchTypes.map(m => this.getMatchTypeIcon(m)))];
    return {
      ...suggestion,
      displayIcons: matchIcons.join(''),
      isAnaphora: suggestion.matchTypes.some(m => m.type === 'anaphora')
    };
  }
}

let globalSuggester = null;

export function getEntitySuggester() {
  if (!globalSuggester) {
    globalSuggester = new HeuristicEntitySuggester();
  }
  return globalSuggester;
}

export async function loadEntityDataForSuggestion(novelId) {
  if (!novelId) return { characters: [], locations: [], objects: [], lore: [], resources: [] };

  const result = {};
  for (const table of ENTITY_TABLES) {
    const allItems = await db[table].where('novelId').equals(novelId).toArray();
    result[table] = allItems.filter(item => item.ignoredForOracle !== 1);
  }
  return result;
}

export function createDebouncedEntityScan(callback, delay = 800) {
  let timeoutId = null;
  let lastReject = null;

  const debounced = (text, entityData, language = 'es') => {
    if (timeoutId) clearTimeout(timeoutId);

    return new Promise((resolve, reject) => {
      lastReject = reject;

      timeoutId = setTimeout(() => {
        try {
          const suggester = getEntitySuggester();
          suggester.setLanguage(language);
          const suggestions = suggester.scanTextForEntities(text, entityData);
          const formatted = suggestions.map(s => suggester.formatSuggestion(s));
          resolve(formatted);
        } catch (err) {
          if (lastReject) lastReject(err);
        }
      }, delay);
    });
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
  };

  return debounced;
}