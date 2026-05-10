/**
 * useAppUI.js — Transient UI state for App.jsx modals, menus, and inline edits.
 * Extracted from App.jsx to prevent modal/menu state changes from re-rendering
 * the full app tree (views, sidebar, AI panel, etc.).
 */
import { useState, useEffect, useRef } from 'react'

export function useAppUI() {
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiPanelTab, setAiPanelTab] = useState('rewrite')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('cloud')
  const [menuOpen, setMenuOpen] = useState(false)
  const [typingComplete, setTypingComplete] = useState(false)
  const [pwaUpdateOpen, setPwaUpdateOpen] = useState(false)
  const [isEditingNovelTitle, setIsEditingNovelTitle] = useState(false)
  const [editedNovelTitle, setEditedNovelTitle] = useState('')

  const projectMenuRef = useRef(null)

  // Close project menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Open Oracle panel via custom event
  useEffect(() => {
    const handleOpenOracle = () => {
      setAiPanelTab('oracle')
      setAiPanelOpen(true)
    }
    window.addEventListener('open-oracle-panel', handleOpenOracle)
    return () => window.removeEventListener('open-oracle-panel', handleOpenOracle)
  }, [])

  return {
    aiPanelOpen, setAiPanelOpen,
    aiPanelTab, setAiPanelTab,
    settingsOpen, setSettingsOpen,
    settingsTab, setSettingsTab,
    menuOpen, setMenuOpen,
    typingComplete, setTypingComplete,
    pwaUpdateOpen, setPwaUpdateOpen,
    isEditingNovelTitle, setIsEditingNovelTitle,
    editedNovelTitle, setEditedNovelTitle,
    projectMenuRef,
  }
}
