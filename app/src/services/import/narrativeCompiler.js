// ── Universal Narrative Compiler ─────────────────────────────────────────────
// Takes a flat array of typed tokens and compiles them into a narrative
// structure (acts → chapters → scenes).
//
// Token format: { type: 'H1' | 'H2' | 'H3' | 'NORMAL', text: string, confidence: number }

export const COMPILER_DEFAULTS = {
  minSceneChars: 200,
  maxTitleLength: 80,
  minConfidence: 0.6,
}

/**
 * Compile a flat token array into a narrative structure.
 * @param {Token[]} tokens
 * @param {Object} [options]
 * @returns {{ sections: Section[], hasStructure: boolean }}
 */
export function compileNarrativeStructure(tokens, options = {}) {
  const config = { ...COMPILER_DEFAULTS, ...options }

  if (!tokens || tokens.length === 0) {
    return {
      sections: [{
        type: 'act',
        title: '',
        chapters: [{ type: 'chapter', title: '', scenes: [{ type: 'scene', title: '', text: '' }] }],
      }],
      hasStructure: false,
    }
  }

  const validTokens = tokens.filter(t =>
    t && t.text != null && (t.confidence == null || t.confidence >= config.minConfidence)
  )

  const headings = validTokens.filter(t => t.type === 'H1' || t.type === 'H2' || t.type === 'H3')

  if (headings.length === 0) {
    const fullText = validTokens
      .filter(t => t.type === 'NORMAL')
      .map(t => t.text)
      .join('\n')

    return {
      sections: [{
        type: 'act',
        title: '',
        chapters: [{ type: 'chapter', title: '', scenes: [{ type: 'scene', title: '', text: fullText }] }],
      }],
      hasStructure: false,
    }
  }

  const h1s = validTokens.filter(t => t.type === 'H1')

  if (h1s.length > 0) {
    return compileWithActs(validTokens, h1s, config)
  }

  const h2s = validTokens.filter(t => t.type === 'H2')
  if (h2s.length > 0) {
    return compileWithChaptersOnly(validTokens, h2s, config)
  }

  const h3s = validTokens.filter(t => t.type === 'H3')
  return compileWithScenesOnly(validTokens, h3s, config)
}

function compileWithActs(tokens, h1s, config) {
  const sections = []

  for (let ai = 0; ai < h1s.length; ai++) {
    const actH1 = h1s[ai]
    const actStart = tokens.indexOf(actH1)
    const actEnd = ai < h1s.length - 1 ? tokens.indexOf(h1s[ai + 1]) : tokens.length

    const actTokens = tokens.slice(actStart, actEnd)
    const actTitle = actH1.text

    const h2s = actTokens.filter(t => t.type === 'H2')
    const chapters = buildChaptersFromTokens(actTokens, h2s, config)

    sections.push({ type: 'act', title: actTitle, chapters })
  }

  return { sections, hasStructure: true }
}

function compileWithChaptersOnly(tokens, h2s, config) {
  const chapters = buildChaptersFromTokens(tokens, h2s, config)

  return {
    sections: [{ type: 'act', title: '', chapters }],
    hasStructure: true,
  }
}

function compileWithScenesOnly(tokens, h3s, config) {
  const scenes = buildScenesFromTokens(tokens, h3s, config)

  return {
    sections: [{
      type: 'act',
      title: '',
      chapters: [{ type: 'chapter', title: '', scenes }],
    }],
    hasStructure: true,
  }
}

function buildChaptersFromTokens(actTokens, h2s, config) {
  if (h2s.length === 0) {
    const normalTokens = actTokens.filter(t => t.type === 'NORMAL')
    const paragraphs = normalTokens.map(t => t.text).filter(p => p.trim())
    if (paragraphs.length === 0) {
      return [{ type: 'chapter', title: '', scenes: [{ type: 'scene', title: '', text: '' }] }]
    }

    const scenes = fallbackParagraphSplit(paragraphs, config)
    return [{ type: 'chapter', title: '', scenes }]
  }

  const chapters = []

  for (let ci = 0; ci < h2s.length; ci++) {
    const chH2 = h2s[ci]
    const chStart = actTokens.indexOf(chH2)
    const chEnd = ci < h2s.length - 1 ? actTokens.indexOf(h2s[ci + 1]) : actTokens.length

    const chTokens = actTokens.slice(chStart, chEnd)
    const chTitle = chH2.text

    const h3s = chTokens.filter(t => t.type === 'H3')
    const scenes = buildScenesFromTokens(chTokens, h3s, config)

    chapters.push({ type: 'chapter', title: chTitle, scenes })
  }

  const firstH2Index = actTokens.indexOf(h2s[0])
  const tokensBeforeFirstH2 = actTokens.slice(0, firstH2Index)
  const orphanNormal = tokensBeforeFirstH2.filter(t => t.type === 'NORMAL')
  const orphanText = collectSceneText(orphanNormal)

  if (orphanText.trim() && chapters.length > 0) {
    chapters[0].scenes.unshift({
      type: 'scene',
      title: 'Interludio',
      text: orphanText.trim(),
    })
  }

  return chapters
}

function buildScenesFromTokens(chapterTokens, h3s, config) {
  if (h3s.length === 0) {
    const normalTokens = chapterTokens.filter(t => t.type === 'NORMAL')
    const text = collectSceneText(normalTokens)

    if (!text) {
      return [{ type: 'scene', title: '', text: '' }]
    }

    const paragraphs = normalTokens.map(t => t.text).filter(p => p.trim())

    if (paragraphs.length === 0) {
      return [{ type: 'scene', title: '', text }]
    }

    if (paragraphs.length === 1) {
      const firstLine = paragraphs[0].split('\n')[0].trim()
      const title = firstLine.length <= config.maxTitleLength ? firstLine : ''
      return [{ type: 'scene', title, text }]
    }

    return fallbackParagraphSplit(paragraphs, config)
  }

  const scenes = []

  for (let si = 0; si < h3s.length; si++) {
    const scH3 = h3s[si]
    const scStart = chapterTokens.indexOf(scH3)
    const scEnd = si < h3s.length - 1 ? chapterTokens.indexOf(h3s[si + 1]) : chapterTokens.length

    const scTokens = chapterTokens.slice(scStart, scEnd)
    const normalTokens = scTokens.filter(t => t.type === 'NORMAL')
    const scText = collectSceneText(normalTokens)

    scenes.push({ type: 'scene', title: scH3.text, text: scText })
  }

  const firstH3Index = chapterTokens.indexOf(h3s[0])
  const tokensBeforeFirstH3 = chapterTokens.slice(0, firstH3Index)
  const orphanNormal = tokensBeforeFirstH3.filter(t => t.type === 'NORMAL')
  const orphanText = collectSceneText(orphanNormal)

  if (orphanText.trim()) {
    scenes.unshift({
      type: 'scene',
      title: 'Interludio',
      text: orphanText.trim(),
    })
  }

  return scenes
}

function fallbackParagraphSplit(paragraphs, config) {
  const { minSceneChars, maxTitleLength } = config
  const scenes = []
  let buffer = ''

  for (const para of paragraphs) {
    buffer += (buffer ? '\n\n' : '') + para.trim()
    if (buffer.length >= minSceneChars) {
      const firstLine = buffer.split('\n')[0].trim()
      const title = firstLine.length <= maxTitleLength ? firstLine : ''
      scenes.push({ type: 'scene', title, text: buffer })
      buffer = ''
    }
  }

  if (buffer.trim()) {
    if (scenes.length === 0) {
      scenes.push({ type: 'scene', title: '', text: buffer.trim() })
    } else {
      const lastScene = scenes[scenes.length - 1]
      lastScene.text += '\n\n' + buffer.trim()
    }
  }

  return scenes.length > 0 ? scenes : [{ type: 'scene', title: '', text: '' }]
}

function collectSceneText(normalTokens) {
  return normalTokens.map(t => t.text).join('\n')
}
