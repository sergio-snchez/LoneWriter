import i18n from './i18n';
import { db } from '../db/database';

import esSentenceStart from './stopwords/es/sentence-start.json';
import enSentenceStart from './stopwords/en/sentence-start.json';
import esGeneric from './stopwords/es/generic.json';
import enGeneric from './stopwords/en/generic.json';
import esSearch from './stopwords/es/search.json';
import enSearch from './stopwords/en/search.json';
import esEntity from './stopwords/es/entity.json';
import enEntity from './stopwords/en/entity.json';

const SENTENCE_START_WORDS = {
  es: new Set(esSentenceStart),
  en: new Set(enSentenceStart),
};

const GENERIC_WORDS = {
  es: new Set(esGeneric),
  en: new Set(enGeneric),
};

const SEARCH_STOP_WORDS = {
  es: new Set(esSearch),
  en: new Set(enSearch),
};

const ENTITY_STOP_WORDS = {
  es: new Set(esEntity),
  en: new Set(enEntity),
};

export function getSentenceStartWords(lang) {
  const currentLang = lang || i18n.language || 'es';
  return SENTENCE_START_WORDS[currentLang] || SENTENCE_START_WORDS.es;
}

export function getGenericWords(lang) {
  const currentLang = lang || i18n.language || 'es';
  return GENERIC_WORDS[currentLang] || GENERIC_WORDS.es;
}

export function getSearchStopWords(lang) {
  const currentLang = lang || i18n.language || 'es';
  return SEARCH_STOP_WORDS[currentLang] || SEARCH_STOP_WORDS.es;
}

export let userStopwordsCache = { es: new Set(), en: new Set() };

export async function loadUserStopwords() {
  try {
    const words = await db.customStopwords.toArray();
    const byLang = { es: new Set(), en: new Set() };
    words.forEach(w => {
      const lang = w.language || 'es';
      if (byLang[lang]) byLang[lang].add(w.word);
    });
    userStopwordsCache = byLang;
    return byLang;
  } catch (e) {
    console.error('Error loading user stopwords:', e);
    return { es: new Set(), en: new Set() };
  }
}

export function getEntityStopWords(lang) {
  const currentLang = lang || i18n.language || 'es';
  const defaults = ENTITY_STOP_WORDS[currentLang] || ENTITY_STOP_WORDS.es;
  const userWords = userStopwordsCache[currentLang] || new Set();
  return new Set([...defaults, ...userWords]);
}

export async function getEntityStopWordsWithCustom(lang) {
  await loadUserStopwords();
  return getEntityStopWords(lang);
}

export async function getAllCustomStopwords() {
  try {
    return await db.customStopwords.toArray();
  } catch (e) {
    console.error('Error getting all custom stopwords:', e);
    return [];
  }
}

export async function addCustomStopword(word) {
  try {
    const id = await db.customStopwords.add({
      word,
      language: i18n.language || 'es',
      createdAt: new Date().toISOString()
    });
    await loadUserStopwords();
    return { id, word };
  } catch (e) {
    console.error('Error adding custom stopword:', e);
    return null;
  }
}

export async function deleteCustomStopword(id) {
  try {
    await db.customStopwords.delete(id);
    await loadUserStopwords();
  } catch (e) {
    console.error('Error deleting custom stopword:', e);
  }
}
