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
db.version(7).stores({
  mpcIgnored: '++id, novelId, name, type, ignoredAt'
});

// v8: Hub de IA — Registro de Consumo de Tokens/Cuotas
db.version(8).stores({
  aiUsage: '++id, [date+provider+model], date, provider, model'
});

// v9: RAG Local Vectors
db.version(9).stores({
  vectors: '++id, sceneId, novelId, textHash, text'
});

// v10: Índice compuesto para lastRewrite
db.version(10).stores({
  lastRewrite: '++id, [novelId+sceneId], novelId, sceneId'
});

// v11: Configuraciones de proveedores IA
db.version(11).stores({
  aiProviderConfigs: 'provider'
});

// v12: Stopwords personalizadas del usuario
db.version(12).stores({
  customStopwords: '++id, word, language, createdAt'
});

// v13: Preferencias del Editor
db.version(13).stores({
  editorPrefs: 'key, value'
});

// v14: World Nexus
db.version(14).stores({
  nexusLinks: '++id, novelId, sourceId, targetId, label',
  scenes: '++id, chapterId, title, order, status, pov, inGameDate'
});

// v15: Re-importación de documentos + filtrado RAG por capítulo/acto
db.version(15).stores({
  resources: '++id, novelId, name, type, ignoredForOracle, contentHash',
  vectors: '++id, sceneId, novelId, textHash, text, chapterId, actId'
});

/**
 * Opens the database with error handling for migration failures.
 * Stores error info in sessionStorage if migration fails, so the App
 * can display a recovery UI.
 * @returns {Promise<boolean>} true if opened successfully
 */
export async function openDatabase() {
  // Clear any stale error marker from previous session
  sessionStorage.removeItem('lw_db_error');
  try {
    await db.open();
    return true;
  } catch (err) {
    console.error('[DB] Failed to open database:', err);
    const errorInfo = { message: err.message, name: err.name || 'UnknownError' };
    sessionStorage.setItem('lw_db_error', JSON.stringify(errorInfo));
    return false;
  }
}

/**
 * Restaura datos en todas las tablas de la base de datos.
 * Toma una copia de seguridad previa y, si la restauración falla,
 * intenta revertir al estado original.
 *
 * @param {Object} tablesData - Objeto con nombre de tabla como clave y array de registros como valor
 * @returns {Promise<void>}
 */
export async function restoreTables(tablesData) {
  const backup = {};
  for (const table of db.tables) {
    backup[table.name] = await table.toArray();
  }

  try {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
        if (tablesData[table.name]) {
          await table.bulkAdd(tablesData[table.name]);
        }
      }
    });
  } catch (err) {
    console.error('[DB] restoreTables failed, rolling back:', err);
    try {
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          await table.clear();
          if (backup[table.name] && backup[table.name].length > 0) {
            await table.bulkAdd(backup[table.name]);
          }
        }
      });
    } catch (rollbackErr) {
      console.error('[DB] Rollback also failed:', rollbackErr);
    }
    throw err;
  }
}

export default db;
