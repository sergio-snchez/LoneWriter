import { db } from '../../db/database'
import { upsertVector, deleteVectorsForScene } from '../ragService'
import { parseFile } from './parsers'
import { compileNarrativeStructure } from './narrativeCompiler'

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Load the narrative structure created by an import (acts → chapters → scenes).
 * @param {number[]} actIds
 * @returns {Promise<Object[]>} Array of acts with nested chapters and scenes
 */
export async function loadImportedStructure(actIds) {
  if (!actIds || actIds.length === 0) return []

  const acts = await db.acts.where('id').anyOf(actIds).toArray()
  acts.sort((a, b) => (a.order || 0) - (b.order || 0))

  const result = []
  for (const act of acts) {
    const chapters = await db.chapters.where('actId').equals(act.id).toArray()
    chapters.sort((a, b) => (a.order || 0) - (b.order || 0))

    const chaptersWithScenes = []
    for (const ch of chapters) {
      const scenes = await db.scenes.where('chapterId').equals(ch.id).toArray()
      scenes.sort((a, b) => (a.order || 0) - (b.order || 0))
      chaptersWithScenes.push({ ...ch, scenes })
    }

    result.push({ ...act, chapters: chaptersWithScenes })
  }

  return result
}

/**
 * Check if a file was previously imported into a novel.
 * @param {string} contentHash - Hash of the file content
 * @param {number} novelId - Novel to search in
 * @returns {Promise<Object|null>} Existing resource or null
 */
export async function findExistingImport(fileName, novelId) {
  if (!fileName || !novelId) return null
  const matches = await db.resources
    .where('novelId').equals(novelId)
    .and(r => r.name === fileName)
    .toArray()
  return matches[0] || null
}

export async function analyzeFile(file) {
  const parsed = await parseFile(file)
  const { sections, hasStructure } = compileNarrativeStructure(parsed.tokens)

  return {
    metadata: parsed.metadata,
    sections,
    hasStructure,
    rawContent: parsed.rawContent || '',
    tokens: parsed.tokens,
  }
}

export async function confirmImport(analysis, file, options, onProgress) {
  const { metadata, sections, rawContent } = analysis
  const { createNewNovel, existingNovelId, novelTitle, importMode, existingResource } = options
  const emit = typeof onProgress === 'function' ? onProgress : () => {}

  // Count total scenes for progress
  let totalScenes = 0
  for (const act of sections) {
    for (const ch of act.chapters) {
      totalScenes += ch.scenes.length
    }
  }

  emit({ phase: 'novel', current: 0, total: 1 })

  let novelId
  if (createNewNovel) {
    novelId = await db.novels.add({
      title: novelTitle || metadata.title || metadata.fileName.replace(/\.[^.]+$/, ''),
      author: metadata.author || '',
      status: 'Borrador',
      wordCount: 0,
      targetWords: Math.max(metadata.wordCount * 2, 100000),
      targetScenes: 60,
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })
  } else {
    novelId = existingNovelId
  }

  const createdSceneIds = []

  // Update mode: remove old scenes and vectors first
  if (importMode === 'update' && existingResource?.importedSceneIds?.length > 0) {
    emit({ phase: 'cleanup', current: 0, total: existingResource.importedSceneIds.length })
    let cleanupIdx = 0
    for (const oldSceneId of existingResource.importedSceneIds) {
      try {
        await deleteVectorsForScene(oldSceneId)
        await db.scenes.delete(oldSceneId)
      } catch (err) {
        console.error('[Import] Error deleting old scene', oldSceneId, err)
      }
      cleanupIdx++
      emit({ phase: 'cleanup', current: cleanupIdx, total: existingResource.importedSceneIds.length })
    }
    // Also delete old acts/chapters that were part of this import
    if (existingResource.importedActIds?.length > 0) {
      for (const oldActId of existingResource.importedActIds) {
        try {
          const oldChapters = await db.chapters.where('actId').equals(oldActId).toArray()
          for (const ch of oldChapters) {
            const chScenes = await db.scenes.where('chapterId').equals(ch.id).toArray()
            for (const sc of chScenes) {
              await deleteVectorsForScene(sc.id)
            }
            await db.chapters.delete(ch.id)
          }
          await db.acts.delete(oldActId)
        } catch (err) {
          console.error('[Import] Error deleting old act', oldActId, err)
        }
      }
    }
  }

  const importedActIds = []

  const existingActs = await db.acts.where('novelId').equals(novelId).toArray()
  const maxActOrder = existingActs.reduce((max, a) => Math.max(max, a.order || 0), 0)

  let sceneIdx = 0

  emit({ phase: 'scenes', current: 0, total: totalScenes })

  for (let ai = 0; ai < sections.length; ai++) {
    const act = sections[ai]
    const actId = await db.acts.add({
      novelId,
      title: act.title || `Acto ${ai + 1}`,
      order: maxActOrder + ai + 1,
      wordCount: 0,
    })
    importedActIds.push(actId)

    const existingChapters = await db.chapters.where('actId').equals(actId).toArray()
    const maxChapterOrder = existingChapters.reduce((max, c) => Math.max(max, c.order || 0), 0)

    for (let ci = 0; ci < act.chapters.length; ci++) {
      const ch = act.chapters[ci]
      const chapterId = await db.chapters.add({
        actId,
        title: ch.title || `Capítulo ${ci + 1}`,
        order: maxChapterOrder + ci + 1,
        status: 'Completo',
        wordCount: 0,
      })

      let sceneOrder = 0
      for (const sc of ch.scenes) {
        sceneOrder++
        const htmlContent = sc.text
          .split('\n')
          .filter(p => p.trim())
          .map(p => `<p>${escapeHtml(p.trim())}</p>`)
          .join('')

        const sceneId = await db.scenes.add({
          chapterId,
          title: sc.title || `Escena ${sceneOrder}`,
          order: sceneOrder,
          status: 'Importado',
          wordCount: sc.text.split(/\s+/).filter(Boolean).length,
          content: htmlContent,
        })
        createdSceneIds.push(sceneId)

        try {
          const plain = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          if (plain.length >= 10) {
            await upsertVector(sceneId, novelId, plain, { chapterId, actId })
          }
        } catch (err) {
          console.error('[Import] RAG indexing error for scene', sceneId, err)
        }

        sceneIdx++
        emit({ phase: 'scenes', current: sceneIdx, total: totalScenes })
      }
    }
  }

  emit({ phase: 'resource', current: 0, total: 1 })

  // Save or update the resource
  try {
    const displayContent = rawContent || metadata.fileName
    const resourceData = {
      novelId,
      name: metadata.fileName,
      description: `Imported ${metadata.format} document`,
      type: metadata.format,
      icon: 'file-text',
      size: formatBytes(metadata.fileSize),
      sizeRaw: metadata.fileSize,
      dateAdded: new Date().toISOString(),
      tags: ['imported'],
      activeForAI: true,
      ignoredForOracle: 0,
      content: displayContent,
      fileData: file,
      contentHash: metadata.contentHash,
      importedSceneIds: createdSceneIds,
      importedActIds,
    }

    if (importMode === 'update' && existingResource?.id) {
      await db.resources.update(existingResource.id, resourceData)
    } else {
      await db.resources.add(resourceData)
    }
  } catch (err) {
    console.error('[Import] Error saving resource:', err)
  }

  emit({ phase: 'resource', current: 1, total: 1 })

  return { novelId, createdSceneIds }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatBytes(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
