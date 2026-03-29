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

export default db;
