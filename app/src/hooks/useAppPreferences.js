/**
 * useAppPreferences.js — Persisted UI preferences (theme, font, mesh).
 * Extracted from App.jsx to prevent root re-renders on preference changes
 * from propagating through the entire component tree.
 */
import { useState, useEffect } from 'react'

export function useAppPreferences() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('lw_theme') || 'dark'
  )
  const [editorFont, setEditorFont] = useState(
    () => localStorage.getItem('lw_editor_font') || 'serif'
  )
  const [meshEnabled, setMeshEnabled] = useState(() => {
    const saved = localStorage.getItem('lw_mesh_enabled')
    return saved === null ? true : saved === 'true'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('lw_theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-font', editorFont)
    localStorage.setItem('lw_editor_font', editorFont)
  }, [editorFont])

  useEffect(() => {
    document.documentElement.setAttribute('data-mesh', meshEnabled ? 'on' : 'off')
    localStorage.setItem('lw_mesh_enabled', meshEnabled)
  }, [meshEnabled])

  return { theme, setTheme, editorFont, setEditorFont, meshEnabled, setMeshEnabled }
}
