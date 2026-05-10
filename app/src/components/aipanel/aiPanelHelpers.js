/**
 * aiPanelHelpers.js — Shared constants and pure helpers for AI Panel tabs.
 * Extracted from AIPanel.jsx for maintainability.
 */
import {
  Pencil, Globe, User, Minimize2, Lightbulb, Type, Zap, AlignLeft
} from 'lucide-react'

/* ---- Rewrite quick-goals ---- */
export const QUICK_GOALS = [
  { id: 'style',    label: 'estilo',    icon: Pencil,   desc: 'estilo_desc' },
  { id: 'language', label: 'idioma',    icon: Globe,    desc: 'idioma_desc' },
  { id: 'character',label: 'personaje', icon: User,     desc: 'personaje_desc' },
  { id: 'length',   label: 'longitud',  icon: Minimize2,desc: 'longitud_desc' },
  { id: 'clarity',  label: 'claridad',  icon: Lightbulb,desc: 'claridad_desc' },
  { id: 'tone',     label: 'tono',      icon: Type,     desc: 'tono_desc' },
  { id: 'rhythm',   label: 'ritmo',     icon: Zap,      desc: 'ritmo_desc' },
  { id: 'cohesion', label: 'cohesion',  icon: AlignLeft,desc: 'cohesion_desc' },
]

/* ---- Pure text helpers ---- */
export const normalizeHtmlForEditor = (html) => {
  return html
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br/>')
    .replace(/\n\n+/g, '\n')
    .trim()
}

export const normalizeTextForDisplay = (text) => {
  if (!text) return ''
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
}

export function extractPreviousContext(content, selection, maxWords = 120) {
  if (!content || !selection) return null

  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const selectionLower = selection.toLowerCase()
  const plainLower = plainText.toLowerCase()

  const selectionIndex = plainLower.indexOf(selectionLower)
  if (selectionIndex === -1) return null

  const textBefore = plainText.substring(0, selectionIndex)
  const wordsBefore = textBefore.split(/\s+/).filter(w => w.length > 0)

  if (wordsBefore.length === 0) return null

  const startIndex = Math.max(0, wordsBefore.length - maxWords)
  return wordsBefore.slice(startIndex).join(' ')
}
