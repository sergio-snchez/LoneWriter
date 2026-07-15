import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'

// ── pdfjs-dist worker setup ─────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

// ── Helpers ─────────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ['txt', 'md', 'docx', 'pdf', 'odt']

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function getExtension(fileName) {
  const parts = fileName.split('.')
  if (parts.length < 2) return ''
  return parts.pop().toLowerCase()
}

function extractTitle(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  return lines[0] || ''
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeHtmlEntities(text) {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '')
}

function htmlToTokens(html) {
  const tokens = []
  const tagRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>|<br\s*\/?>|<\/p>\s*<p[^>]*>|<li[^>]*>|<[^>]+>/gi
  let lastIndex = 0
  let normalBuffer = ''

  const flushNormal = () => {
    const text = normalBuffer.trim()
    if (text) {
      tokens.push({ type: 'NORMAL', text, confidence: 1.0 })
    }
    normalBuffer = ''
  }

  let match
  while ((match = tagRegex.exec(html)) !== null) {
    const before = html.slice(lastIndex, match.index)
    if (before) {
      normalBuffer += before
    }

    const tag = match[0]

    const headingMatch = tag.match(/^<h([1-6])[^>]*>(.*?)<\/h\1>$/i)
    if (headingMatch) {
      const level = parseInt(headingMatch[1])
      const text = decodeHtmlEntities(stripTags(headingMatch[2])).trim()
      if (text) {
        flushNormal()
        const type = level === 1 ? 'H1' : level === 2 ? 'H2' : 'H3'
        tokens.push({ type, text, confidence: 1.0 })
      }
      lastIndex = match.index + tag.length
      continue
    }

    if (/^<br\s*\/?>$/i.test(tag)) {
      normalBuffer += '\n'
      lastIndex = match.index + tag.length
      continue
    }

    if (/^<li[^>]*>$/i.test(tag)) {
      normalBuffer += '\n- '
      lastIndex = match.index + tag.length
      continue
    }

    if (/^<\/p>\s*<p[^>]*>$/i.test(tag)) {
      normalBuffer += '\n\n'
      lastIndex = match.index + tag.length
      continue
    }

    lastIndex = match.index + tag.length
  }

  const remaining = html.slice(lastIndex)
  if (remaining) {
    normalBuffer += remaining
  }

  flushNormal()

  return tokens
}

function htmlToPlainText(html) {
  let text = html
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
  text = text.replace(/<li[^>]*>/gi, '\n- ')
  text = text.replace(/<[^>]+>/g, '')
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  return text.trim()
}

/**
 * Compute FNV-1a hash of file content for re-import detection.
 * @param {File} file
 * @returns {Promise<string>} Hex string hash
 */
export async function computeFileHash(file) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let h = 2166136261
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

// ── Heading detection helpers ───────────────────────────────────────────────

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length
}

function reconstructPdfPage(items) {
  const tolerance = 5
  const yGroups = new Map()

  for (const item of items) {
    const str = (item.str || '').trim()
    if (!str) continue

    const y = Math.round(item.transform[5] / tolerance) * tolerance

    if (!yGroups.has(y)) yGroups.set(y, [])
    yGroups.get(y).push(item)
  }

  if (yGroups.size === 0) {
    return { lines: [], text: '' }
  }

  const sortedYs = Array.from(yGroups.keys()).sort((a, b) => b - a)

  const lines = []

  for (const y of sortedYs) {
    const group = yGroups.get(y)
    group.sort((a, b) => a.transform[4] - b.transform[4])

    let lineText = ''
    for (const item of group) {
      lineText += item.str
    }
    lineText = lineText.trim()
    if (lineText) {
      lines.push(lineText)
    }
  }

  return { lines, text: lines.join('\n') }
}

function extractOdtTokens(xmlDoc) {
  const textNs = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
  const tokens = []

  function walk(node) {
    if (node.nodeType === 1) {
      const ns = node.namespaceURI || ''
      const tag = node.tagName ? node.tagName.toLowerCase() : ''

      if (ns === textNs && (tag === 'text:p' || tag === 'text:h')) {
        const textContent = node.textContent.trim()
        if (textContent) {
          if (tag === 'text:h') {
            const level = parseInt(node.getAttributeNS(textNs, 'outline-level')) || 1
            const type = level === 1 ? 'H1' : level === 2 ? 'H2' : 'H3'
            tokens.push({ type, text: textContent, confidence: 1.0 })
          } else {
            tokens.push({ type: 'NORMAL', text: textContent, confidence: 1.0 })
          }
        }
        return
      }
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      walk(node.childNodes[i])
    }
  }

  walk(xmlDoc.documentElement)
  return tokens
}

// ── Individual format parsers ───────────────────────────────────────────────

async function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(l => l.trim())
      const tokens = lines.map(line => ({ type: 'NORMAL', text: line.trim(), confidence: 1.0 }))
      resolve({
        tokens,
        metadata: { title: extractTitle(text), author: '' },
        rawContent: text,
      })
    }
    reader.onerror = () => reject(new Error('Error reading text file'))
    reader.readAsText(file)
  })
}

async function parseMd(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n')
      const tokens = []

      for (const line of lines) {
        const match = line.match(/^(#{1,6})\s+(.+)/)
        if (match) {
          const level = match[1].length
          const type = level === 1 ? 'H1' : level === 2 ? 'H2' : 'H3'
          tokens.push({ type, text: match[2].trim(), confidence: 1.0 })
        } else if (line.trim()) {
          tokens.push({ type: 'NORMAL', text: line.trim(), confidence: 1.0 })
        }
      }

      const h1 = tokens.find(t => t.type === 'H1')
      resolve({
        tokens,
        metadata: { title: h1?.text || extractTitle(text), author: '' },
        rawContent: text,
      })
    }
    reader.onerror = () => reject(new Error('Error reading markdown file'))
    reader.readAsText(file)
  })
}

async function parseDocx(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.convertToHtml({
      arrayBuffer,
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p.Title => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p.Subtitle => h2:fresh",
      ]
    })
    const html = result.value
    const tokens = htmlToTokens(html)
    const h1 = tokens.find(t => t.type === 'H1')

    return {
      tokens,
      metadata: { title: h1?.text || extractTitle(htmlToPlainText(html)), author: '' },
      rawContent: htmlToPlainText(html),
    }
  } catch (err) {
    throw new Error(`Error parsing DOCX: ${err.message}`)
  }
}

async function parsePdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const allLines = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const { lines } = reconstructPdfPage(content.items)

      if (lines.length === 0) continue

      allLines.push(...lines)
    }

    const tokens = linesToTokens(allLines)

    return {
      tokens,
      metadata: {
        title: tokens.find(t => t.type === 'H1')?.text || extractTitle(allLines.join('\n')),
        author: '',
        pageCount: pdf.numPages,
      },
      rawContent: allLines.join('\n'),
    }
  } catch (err) {
    throw new Error(`Error parsing PDF: ${err.message}`)
  }
}

function linesToTokens(lines) {
  const tokens = []
  const CHAPTER_PATTERNS = /^(?:cap[ií]tulo|chapter)\s+(\d+|[IVXLCDM]+)$/i
  const ACT_PATTERNS = /^(?:acto?|part(?:e|s)?)\s+(\d+|[IVXLCDM]+)$/i

  let chapterCount = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.length > 100 || trimmed.length <= 2) {
      tokens.push({ type: 'NORMAL', text: trimmed, confidence: 1.0 })
    } else if (CHAPTER_PATTERNS.test(trimmed)) {
      chapterCount++
      tokens.push({ type: 'H2', text: trimmed, confidence: 0.85 })
    } else if (chapterCount > 0 && ACT_PATTERNS.test(trimmed)) {
      tokens.push({ type: 'H1', text: trimmed, confidence: 0.8 })
    } else {
      tokens.push({ type: 'NORMAL', text: trimmed, confidence: 1.0 })
    }
  }

  return tokens
}

async function parseOdt(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const contentXmlFile = zip.file('content.xml')
    if (!contentXmlFile) throw new Error('Invalid ODT: missing content.xml')

    const contentXml = await contentXmlFile.async('string')
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(contentXml, 'text/xml')
    const tokens = extractOdtTokens(xmlDoc)
    const h1 = tokens.find(t => t.type === 'H1')

    const plainText = tokens.map(t => t.text).join('\n')

    return {
      tokens,
      metadata: { title: h1?.text || extractTitle(plainText), author: '' },
      rawContent: plainText,
    }
  } catch (err) {
    throw new Error(`Error parsing ODT: ${err.message}`)
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

const PARSERS = {
  txt: parseTxt,
  md: parseMd,
  docx: parseDocx,
  pdf: parsePdf,
  odt: parseOdt,
}

export function supportsFile(file) {
  const ext = getExtension(file.name)
  return ALLOWED_EXTENSIONS.includes(ext)
}

export async function parseFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    const maxMB = Math.round(MAX_FILE_SIZE / (1024 * 1024))
    const fileMB = (file.size / (1024 * 1024)).toFixed(1)
    throw new Error(`File too large (${fileMB}MB). Maximum allowed size is ${maxMB}MB.`)
  }

  const ext = getExtension(file.name)
  const parser = PARSERS[ext]
  if (!parser) {
    throw new Error(`Unsupported format: .${ext}`)
  }

  const [result, contentHash] = await Promise.all([parser(file), computeFileHash(file)])

  const tokenTexts = result.tokens || []
  const pageTexts = result.pages || []
  const totalWords = tokenTexts.length > 0
    ? tokenTexts.reduce((sum, t) => sum + countWords(t.text), 0)
    : pageTexts.reduce((sum, p) => sum + countWords(p.text), 0)

  return {
    ...result,
    metadata: {
      ...result.metadata,
      format: ext.toUpperCase(),
      fileName: file.name,
      fileSize: file.size,
      wordCount: totalWords,
      pageCount: result.metadata.pageCount ?? (pageTexts.length || 1),
      contentHash,
    },
  }
}

export { ALLOWED_EXTENSIONS, MAX_FILE_SIZE }
