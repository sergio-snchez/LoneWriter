/**
 * LoneWriter RAG Service
 * Manages local embeddings via Transformers.js worker + Dexie vector store.
 */
import { db } from '../db/database';

// ── Worker singleton ──────────────────────────────────────────────────────────

let _worker = null;
let _pendingResolvers = {}; // id => { resolve, reject }
let _msgId = 0;
let _modelLoading = false;
let _modelReady = false;

function getWorker() {
  if (_worker) return _worker;
  _worker = new Worker(new URL('./ragWorker.js', import.meta.url), { type: 'module' });
  _worker.onmessage = (e) => {
    const { id, status, output, error, data } = e.data;
    if (status === 'progress') {
      // Model download progress
      if (!_modelLoading) {
        _modelLoading = true;
        window.dispatchEvent(new CustomEvent('rag-model-loading', { detail: data }));
      } else {
        window.dispatchEvent(new CustomEvent('rag-model-progress', { detail: data }));
      }
      return;
    }
    const resolver = _pendingResolvers[id];
    if (!resolver) return;
    delete _pendingResolvers[id];
    if (status === 'complete') {
      if (!_modelReady) {
        _modelReady = true;
        _modelLoading = false;
        window.dispatchEvent(new CustomEvent('rag-model-ready'));
      }
      resolver.resolve(output);
    } else {
      resolver.reject(new Error(error || 'Unknown worker error'));
    }
  };
  _worker.onerror = (e) => {
    console.error('[RAG] Worker error:', e);
    _modelLoading = false;
    window.dispatchEvent(new CustomEvent('rag-model-error', { detail: e.message }));
    Object.values(_pendingResolvers).forEach(r => r.reject(e));
    _pendingResolvers = {};
  };
  return _worker;
}

/**
 * Generate an embedding for a single text string.
 * Returns Float32Array-like plain JS number array.
 */
export async function getEmbedding(text) {
  return new Promise((resolve, reject) => {
    const id = ++_msgId;
    _pendingResolvers[id] = { resolve, reject };
    getWorker().postMessage({ id, text });
  });
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Simple FNV-1a hash for change detection */
function hashText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/** Cosine similarity between two plain number arrays */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Split text into chunks of given max words, with some overlap to preserve context boundaries */
export function chunkText(text, maxWords = 250, overlap = 30) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];

  const chunks = [];
  for (let i = 0; i < words.length; i += (maxWords - overlap)) {
    const chunk = words.slice(i, i + maxWords).join(' ');
    if (chunk.trim()) chunks.push(chunk);
  }
  return chunks;
}

/**
 * Index (upsert) a paragraph/scene text intelligently.
 * Call this after the editor save debounce.
 * @param {number} sceneId
 * @param {number} novelId
 * @param {string} text  - plain text (no HTML)
 */
export async function upsertVector(sceneId, novelId, text) {
  if (!text || text.trim().length < 10) {
    await deleteVectorsForScene(sceneId);
    return;
  }
  const trimmed = text.trim();
  
  // Transform scene into chunks to avoid model truncation (limit 512 tokens) and improve granularity
  const chunks = chunkText(trimmed, 250, 30);
  
  // Extraemos todos los vectores previos de esta escena
  const existingVectors = await db.vectors.where('sceneId').equals(sceneId).toArray();
  const existingHashesMap = new Map();
  for (const v of existingVectors) {
    existingHashesMap.set(v.textHash, v);
  }
  
  const currentChunkHashes = new Set();
  const chunksToProcess = [];
  
  // Calcular hashes de los nuevos chunks y separar cuáles necesitan ser enviados a la IA
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const hash = hashText(chunk);
    currentChunkHashes.add(hash);
    
    // Solo lo re-vectorizamos si el chunk no existía idéntico previamente en esta escena
    if (!existingHashesMap.has(hash)) {
      chunksToProcess.push({ index: i, text: chunk, hash });
    }
  }
  
  // Borramos los viejos chunks cuyo hash ya no está presente (ej. texto editado/eliminado)
  const idsToDelete = [];
  for (const v of existingVectors) {
    if (!currentChunkHashes.has(v.textHash)) {
      idsToDelete.push(v.id);
    }
  }
  if (idsToDelete.length > 0) {
    await db.vectors.bulkDelete(idsToDelete);
  }
  
  // Módulo de embedding intensivo: procesamos solo los chunks nuevos/modificados
  for (const pending of chunksToProcess) {
    try {
      const embedding = await getEmbedding(pending.text);
      await db.vectors.add({
        sceneId,
        novelId,
        chunkIndex: pending.index,
        text: pending.text,
        textHash: pending.hash,
        embedding,
        indexedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('[RAG] Fallo procesando chunk de escena', sceneId, err);
    }
  }
}

/**
 * Delete all vectors for a given scene (cascade on scene delete).
 */
export async function deleteVectorsForScene(sceneId) {
  await db.vectors.where('sceneId').equals(sceneId).delete();
}

/**
 * Delete all vectors for a given novel (cascade on novel delete).
 */
export async function deleteVectorsForNovel(novelId) {
  await db.vectors.where('novelId').equals(novelId).delete();
}

/**
 * Retrieve the top-K most relevant text fragments for a query.
 * @param {string} query     - The user's question
 * @param {number} novelId   - Scope to this novel
 * @param {number} topK      - How many fragments to return (default 4)
 * @returns {string[]} Array of plain-text fragments, sorted by relevance
 */
export async function retrieveRelevantFragments(query, novelId, topK = 4, excludeSceneId = null) {
  if (!query || query.trim().length < 3) return [];

  try {
    const queryEmbedding = await getEmbedding(query.trim());
    let allVectors = await db.vectors.where('novelId').equals(novelId).toArray();

    if (excludeSceneId != null) {
      allVectors = allVectors.filter(v => v.sceneId !== excludeSceneId);
    }

    if (allVectors.length === 0) return [];

    const scored = allVectors.map(v => ({
      text: v.text,
      score: cosineSimilarity(queryEmbedding, v.embedding)
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored
      .slice(0, topK)
      .filter(s => s.score > 0.2) // discard irrelevant noise
      .map(s => s.text);
  } catch (err) {
    console.error('[RAG] Retrieval error:', err);
    return [];
  }
}

/**
 * Scan all scenes of a novel that have no vector yet and index them in batch.
 * Call this on app start or novel switch to catch any offline edits.
 */
export async function indexPendingScenes(novelId) {
  try {
    const indexedSceneIds = new Set(
      (await db.vectors.where('novelId').equals(novelId).toArray()).map(v => v.sceneId)
    );
    const acts = await db.acts.where('novelId').equals(novelId).toArray();
    for (const act of acts) {
      const chapters = await db.chapters.where('actId').equals(act.id).toArray();
      for (const ch of chapters) {
        const scenes = await db.scenes.where('chapterId').equals(ch.id).toArray();
        for (const sc of scenes) {
          if (!sc.content) continue;
          const plain = sc.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (plain.length < 10) continue;
          if (!indexedSceneIds.has(sc.id)) {
            await upsertVector(sc.id, novelId, plain);
          }
        }
      }
    }
  } catch (err) {
    console.error('[RAG] Batch indexing error:', err);
  }
}
