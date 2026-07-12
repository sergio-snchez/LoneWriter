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

function htmlToTextWithMarkers(html) {
  let text = html.replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, level, content) => {
    const clean = content.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()
    return '\n' + '#'.repeat(parseInt(level)) + ' ' + clean + '\n'
  })
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
  text = text.replace(/<[^>]+>/g, '')
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length
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

function findMarkdownHeadings(text) {
  const headings = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/)
    if (match) {
      headings.push({
        text: match[2].trim(),
        level: match[1].length,
        lineIndex: i,
      })
    }
  }
  return headings
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
    return { lines: [], headings: [], text: '' }
  }

  const sortedYs = Array.from(yGroups.keys()).sort((a, b) => b - a)

  const lines = []
  const lineMaxSizes = []
  const allSizes = []

  for (const y of sortedYs) {
    const group = yGroups.get(y)
    group.sort((a, b) => a.transform[4] - b.transform[4])

    let lineText = ''
    let maxH = 0
    for (const item of group) {
      lineText += item.str
      if (item.height > 0) {
        allSizes.push(item.height)
        if (item.height > maxH) maxH = item.height
      }
    }
    lineText = lineText.trim()
    if (lineText) {
      lines.push(lineText)
      lineMaxSizes.push(maxH)
    }
  }

  if (allSizes.length === 0) {
    return { lines, headings: [], text: lines.join('\n') }
  }

  const sizeCounts = new Map()
  for (const s of allSizes) {
    const key = Math.round(s * 10) / 10
    sizeCounts.set(key, (sizeCounts.get(key) || 0) + 1)
  }
  const dominantSize = Array.from(sizeCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]

  const headings = []
  for (let li = 0; li < lines.length; li++) {
    const maxSize = lineMaxSizes[li]
    const lineLen = lines[li].length
    if (maxSize > 0 && maxSize > dominantSize * 1.3 && lineLen < 100 && lineLen > 2) {
      const level = maxSize > dominantSize * 1.8 ? 1 : 2
      headings.push({ text: lines[li], level, lineIndex: li })
    }
  }

  return { lines, headings, text: lines.join('\n') }
}

function extractOdtTextAndHeadings(xmlDoc) {
  const textNs = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
  const lines = []
  const headings = []
  let lineIndex = 0

  function walk(node) {
    if (node.nodeType === 1) {
      const ns = node.namespaceURI || ''
      const tag = node.tagName ? node.tagName.toLowerCase() : ''

      if (ns === textNs && (tag === 'text:p' || tag === 'text:h')) {
        const textContent = node.textContent.trim()
        if (textContent) {
          lines.push(textContent)

          if (tag === 'text:h') {
            const level = parseInt(node.getAttributeNS(textNs, 'outline-level')) || 1
            headings.push({ text: textContent, level, lineIndex })
          }

          lineIndex++
          return
        }
      }
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      walk(node.childNodes[i])
    }
  }

  walk(xmlDoc.documentElement)

  return { text: lines.join('\n'), headings }
}

// ── Individual format parsers ───────────────────────────────────────────────

async function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      resolve({
        pages: [{ text, headings: [] }],
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
      const headings = findMarkdownHeadings(text)
      const h1 = headings.find(h => h.level === 1)
      resolve({
        pages: [{ text, headings }],
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
    const result = await mammoth.convertToHtml({ arrayBuffer })
    const html = result.value
    const text = htmlToTextWithMarkers(html)
    const headings = findMarkdownHeadings(text)
    const h1 = headings.find(h => h.level === 1)

    return {
      pages: [{ text, headings }],
      metadata: { title: h1?.text || extractTitle(text), author: '' },
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
    const allHeadings = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const { lines, headings } = reconstructPdfPage(content.items)

      if (lines.length === 0) continue

      let pageStartIndex
      if (allLines.length === 0) {
        pageStartIndex = 0
      } else {
        allLines.push('')
        pageStartIndex = allLines.length
      }

      allLines.push(...lines)

      for (const h of headings) {
        allHeadings.push({
          text: h.text,
          level: h.level,
          lineIndex: pageStartIndex + h.lineIndex,
        })
      }
    }

    const fullText = allLines.join('\n')

    return {
      pages: [{ text: fullText, headings: allHeadings }],
      metadata: {
        title: allHeadings.find(h => h.level === 1)?.text || extractTitle(fullText),
        author: '',
        pageCount: pdf.numPages,
      },
    }
  } catch (err) {
    throw new Error(`Error parsing PDF: ${err.message}`)
  }
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
    const { text, headings } = extractOdtTextAndHeadings(xmlDoc)
    const h1 = headings.find(h => h.level === 1)

    return {
      pages: [{ text, headings }],
      metadata: { title: h1?.text || extractTitle(text), author: '' },
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

  const totalWords = result.pages.reduce((sum, p) => sum + countWords(p.text), 0)

  return {
    ...result,
    metadata: {
      ...result.metadata,
      format: ext.toUpperCase(),
      fileName: file.name,
      fileSize: file.size,
      wordCount: totalWords,
      pageCount: result.metadata.pageCount ?? result.pages.length,
      contentHash,
    },
  }
}

export { ALLOWED_EXTENSIONS, MAX_FILE_SIZE }
