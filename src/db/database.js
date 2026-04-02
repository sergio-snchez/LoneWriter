import Dexie from 'dexie';

export const db = new Dexie('LoneWriterDB');

// Database Schema
db.version(2).stores({
  novels: '++id, title, author, status, targetScenes, lastEdited',
  acts: '++id, novelId, title, order',
  chapters: '++id, actId, title, order, status',
  scenes: '++id, chapterId, title, order, status, pov',
  characters: '++id, novelId, name, role',
  locations: '++id, novelId, name, type',
  objects: '++id, novelId, name, type',
  lore: '++id, novelId, title, category',
  resources: '++id, novelId, name, type',
  dailyProgress: '++id, novelId, date, wordsWritten',
  debateAgents: '++id, novelId, name',
  debateSessions: '++id, novelId, title, updatedAt'
});

db.version(3).stores({
  oracleEntries: '++id, novelId, sceneId, createdAt',
  lastRewrite: '++id, novelId, sceneId'
});

db.version(4).stores({
  novels: '++id, title, author, status, targetScenes, lastEdited, uiExpanded'
});

db.version(5).stores({
  characters: '++id, novelId, name, role, ignoredForOracle',
  locations: '++id, novelId, name, type, ignoredForOracle',
  objects: '++id, novelId, name, type, ignoredForOracle',
  lore: '++id, novelId, title, category, ignoredForOracle',
  resources: '++id, novelId, name, type, ignoredForOracle'
});

export default db;
