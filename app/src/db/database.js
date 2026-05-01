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

db.version(6).stores({
  oracleEntries: '++id, novelId, sceneId, createdAt, isCorrected'
});

// v7: MPC — Monitor de Propuestas del Compendio
// Almacena los nombres que el usuario ha descartado permanentemente
db.version(7).stores({
  mpcIgnored: '++id, novelId, name, type, ignoredAt'
});

// v8: Hub de IA — Registro de Consumo de Tokens/Cuotas
// Permite monitorizar el uso diario por proveedor y modelo
db.version(8).stores({
  aiUsage: '++id, [date+provider+model], date, provider, model'
});

// v9: RAG Local Vectors
// Almacena embeddings para el Oráculo
db.version(9).stores({
  vectors: '++id, sceneId, novelId, textHash, text' // text is the paragraph content
});

// v10: Índice compuesto para lastRewrite
// Mejora rendimiento de consultas por novelId + sceneId
db.version(10).stores({
  lastRewrite: '++id, [novelId+sceneId], novelId, sceneId'
});

// v11: Configuraciones de proveedores IA
// Permite guardar la config de cada proveedor (apiKey, model, localBaseUrl)
db.version(11).stores({
  aiProviderConfigs: 'provider'
});

// v12: Stopwords personalizadas del usuario para el Oráculo
// Permite al usuario agregar/eliminar palabras que serán filtradas al detectar entidades
db.version(12).stores({
  customStopwords: '++id, word, language, createdAt'
});

// v13: Preferencias del Editor
// Almacena preferencias visuales como el tamaño de fuente
db.version(13).stores({
  editorPrefs: 'key, value'
});

// v14: World Nexus
// nexusLinks para las relaciones manuales del Grafo 3D
// scenes añade inGameDate para la Línea de Tiempo
db.version(14).stores({
  nexusLinks: '++id, novelId, sourceId, targetId, label',
  scenes: '++id, chapterId, title, order, status, pov, inGameDate'
});

export default db;
