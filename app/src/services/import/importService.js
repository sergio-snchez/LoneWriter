import { db } from '../../db/database'
import { upsertVector, deleteVectorsForScene } from '../ragService'
import { parseFile } from './parsers'

// ── Structure building ──────────────────────────────────────────────────────

function buildSections(pages) {
  const allHeadings = []

  const pageTexts = pages.map(p => p.text)
  const fullText = pageTexts.join('\n\n')
  const lines = fullText.split('\n')

  for (const page of pages) {
    for (const h of page.headings) {
      allHeadings.push({
        text: h.text,
        level: h.level,
        lineIndex: h.lineIndex != null ? h.lineIndex : (h.position || 0),
      })
    }
  }

  if (allHeadings.length === 0) {
    return {
      sections: [{
        type: 'act',
        title: '',
        chapters: [{
          type: 'chapter',
          title: '',
          scenes: [{ type: 'scene', title: '', text: fullText }],
        }],
      }],
      hasStructure: false,
    }
  }

  allHeadings.sort((a, b) => a.lineIndex - b.lineIndex)

  const h1s = allHeadings.filter(h => h.level === 1)
  const h2s = allHeadings.filter(h => h.level === 2)
  const h3s = allHeadings.filter(h => h.level >= 3)

  if (h1s.length > 0) {
    return buildFromHeadings(lines, h1s, h2s, h3s)
  }
  if (h2s.length > 0) {
    const fauxH1 = [{ text: '', level: 1, lineIndex: -1 }]
    return buildFromHeadings(lines, fauxH1, h2s, h3s)
  }

  const scenes = allHeadings.map(h => ({ type: 'scene', title: h.text, text: '' }))
  return {
    sections: [{
      type: 'act',
      title: '',
      chapters: [{ type: 'chapter', title: '', scenes }],
    }],
    hasStructure: true,
  }
}

function buildFromHeadings(lines, level1Headings, h2List, h3List) {
  const sections = []

  for (let ai = 0; ai < level1Headings.length; ai++) {
    const actH = level1Headings[ai]
    const actStart = getLineIndex(actH)
    const nextActLine = ai < level1Headings.length - 1
      ? getLineIndex(level1Headings[ai + 1])
      : lines.length

    const actTitle = actH.text || ''

    const inActH2 = h2List.filter(h2 => {
      const idx = getLineIndex(h2)
      return idx > actStart && idx < nextActLine
    })

    const chapters = buildChapters(lines, actStart + 1, nextActLine, inActH2, h3List)
    sections.push({ type: 'act', title: actTitle, chapters })
  }

  return { sections, hasStructure: true }
}

function buildChapters(lines, rangeStart, rangeEnd, h2List, h3List) {
  if (h2List.length === 0) {
    const chText = lines.slice(rangeStart, rangeEnd).join('\n').trim()
    return [{
      type: 'chapter',
      title: '',
      scenes: [{ type: 'scene', title: '', text: chText }],
    }]
  }

  const chapters = []

  for (let ci = 0; ci < h2List.length; ci++) {
    const chH = h2List[ci]
    const chStart = getLineIndex(chH)
    const nextChLine = ci < h2List.length - 1
      ? getLineIndex(h2List[ci + 1])
      : rangeEnd

    const chTitle = chH.text || ''

    const inChH3 = h3List.filter(h3 => {
      const idx = getLineIndex(h3)
      return idx > chStart && idx < nextChLine
    })

    const scenes = buildScenes(lines, chStart + 1, nextChLine, inChH3)
    chapters.push({ type: 'chapter', title: chTitle, scenes })
  }

  const firstH2Line = getLineIndex(h2List[0])
  if (firstH2Line > rangeStart) {
    const orphanText = lines.slice(rangeStart, firstH2Line).join('\n').trim()
    if (orphanText) {
      chapters[0].scenes.unshift({
        type: 'scene',
        title: 'Preludio',
        text: orphanText,
      })
    }
  }

  return chapters
}

function buildScenes(lines, rangeStart, rangeEnd, h3List) {
  if (h3List.length === 0) {
    const scText = lines.slice(rangeStart, rangeEnd).join('\n').trim()
    return [{ type: 'scene', title: '', text: scText }]
  }

  const scenes = []

  for (let si = 0; si < h3List.length; si++) {
    const scH = h3List[si]
    const scStart = getLineIndex(scH)
    const nextScLine = si < h3List.length - 1
      ? getLineIndex(h3List[si + 1])
      : rangeEnd

    const scText = lines.slice(scStart + 1, nextScLine).join('\n').trim()
    scenes.push({ type: 'scene', title: scH.text || '', text: scText })
  }

  const firstH3Line = getLineIndex(h3List[0])
  if (firstH3Line > rangeStart) {
    const orphanText = lines.slice(rangeStart, firstH3Line).join('\n').trim()
    if (orphanText) {
      scenes.unshift({
        type: 'scene',
        title: 'Preludio',
        text: orphanText,
      })
    }
  }

  return scenes
}

function getLineIndex(heading) {
  return heading.lineIndex != null ? heading.lineIndex : (heading.position || 0)
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Check if a file was previously imported into a novel.
 * @param {string} contentHash - Hash of the file content
 * @param {number} novelId - Novel to search in
 * @returns {Promise<Object|null>} Existing resource or null
 */
export async function findExistingImport(contentHash, novelId) {
  if (!contentHash || !novelId) return null
  const matches = await db.resources
    .where('novelId').equals(novelId)
    .and(r => r.contentHash === contentHash)
    .toArray()
  return matches[0] || null
}

export async function analyzeFile(file) {
  const parsed = await parseFile(file)
  const { sections, hasStructure } = buildSections(parsed.pages)

  return {
    metadata: parsed.metadata,
    sections,
    hasStructure,
    rawContent: parsed.rawContent || '',
  }
}

export async function confirmImport(analysis, file, options) {
  const { metadata, sections, rawContent } = analysis
  const { createNewNovel, existingNovelId, novelTitle, importMode, existingResource } = options

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
    for (const oldSceneId of existingResource.importedSceneIds) {
      try {
        await deleteVectorsForScene(oldSceneId)
        await db.scenes.delete(oldSceneId)
      } catch (err) {
        console.error('[Import] Error deleting old scene', oldSceneId, err)
      }
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

  for (let ai = 0; ai < sections.length; ai++) {
    const act = sections[ai]
    const actId = await db.acts.add({
      novelId,
      title: act.title || `Acto ${ai + 1}`,
      order: ai + 1,
      wordCount: 0,
    })
    importedActIds.push(actId)

    for (let ci = 0; ci < act.chapters.length; ci++) {
      const ch = act.chapters[ci]
      const chapterId = await db.chapters.add({
        actId,
        title: ch.title || `Capítulo ${ci + 1}`,
        order: ci + 1,
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
      }
    }
  }

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
