/**
 * useEditorDnd.js — Custom hook encapsulating all Drag & Drop logic for the Editor.
 * Extracted from Editor.jsx for maintainability.
 *
 * Handles: act reorder, chapter reorder/move, scene reorder/move.
 * Provides: sensors, activeDragId, getDragLabel, handleDragStart/Over/Cancel/End
 */
import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/**
 * @param {object} params
 * @param {Array}    params.acts            - Current acts array from NovelContext
 * @param {string}   params.novelId         - Active novel ID
 * @param {Function} params.updateActOrder
 * @param {Function} params.updateChapterOrder
 * @param {Function} params.updateSceneOrder
 * @param {Function} params.moveScene
 * @param {Function} params.moveChapter
 * @param {Function} params.setExpandedIds  - Setter for the expanded set (auto-expand on hover)
 * @param {Set}      params.expandedIds     - Current expanded set
 */
export function useEditorDnd({
  acts,
  novelId,
  updateActOrder,
  updateChapterOrder,
  updateSceneOrder,
  moveScene,
  moveChapter,
  setExpandedIds,
  expandedIds,
}) {
  const { t } = useTranslation('editor')
  const [activeDragId, setActiveDragId] = useState(null)
  const hoverTimerRef = useRef(null)

  // ── Sensors ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Drag ghost label ─────────────────────────────────────────────────────
  const getDragLabel = (id) => {
    if (!id) return ''
    const idStr = id.toString()
    if (idStr.startsWith('act-')) {
      const act = acts.find(a => `act-${a.id}` === idStr)
      return act ? act.title : t('drag.acto')
    }
    if (idStr.startsWith('ch-')) {
      for (const act of acts) {
        const ch = (act.chapters || []).find(c => `ch-${c.id}` === idStr)
        if (ch) return ch.title
      }
      return t('drag.capitulo')
    }
    if (idStr.startsWith('scene-')) {
      for (const act of acts) {
        for (const ch of act.chapters || []) {
          const sc = (ch.scenes || []).find(s => `scene-${s.id}` === idStr)
          if (sc) return sc.title
        }
      }
      return t('drag.escena')
    }
    return ''
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDragStart = (event) => {
    setActiveDragId(event.active.id)
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return
    const overIdStr = over.id.toString()
    if (active.id !== over.id && (overIdStr.startsWith('act-') || overIdStr.startsWith('ch-'))) {
      if (!expandedIds.has(over.id)) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = setTimeout(() => {
          setExpandedIds(prev => new Set([...prev, over.id]))
        }, 600)
      }
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
    }
  }

  const handleDragCancel = () => {
    setActiveDragId(null)
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
  }

  const handleDragEnd = async (event) => {
    setActiveDragId(null)
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    const { active, over } = event
    if (!over) return

    const activeIdStr = active.id.toString()
    const overIdStr = over.id.toString()
    if (activeIdStr === overIdStr) return

    const getNumId = (str) => parseInt(str.split('-')[1])

    // 1. Reorder Acts
    if (activeIdStr.startsWith('act-')) {
      const activeId = getNumId(activeIdStr)
      const overId = getNumId(overIdStr)
      const oldIndex = acts.findIndex(a => a.id === activeId)
      const newIndex = acts.findIndex(a => a.id === overId)
      if (newIndex !== -1) {
        updateActOrder(novelId, arrayMove(acts, oldIndex, newIndex).map(a => a.id))
      }
      return
    }

    // 2. Reorder / Move Chapters & Scenes
    const activeType = activeIdStr.startsWith('ch-') ? 'chapter' : activeIdStr.startsWith('scene-') ? 'scene' : null
    if (!activeType) return

    const numericActiveId = getNumId(activeIdStr)
    let activeParentId = null

    for (const act of acts) {
      if (activeType === 'chapter' && act.chapters?.some(c => c.id === numericActiveId)) {
        activeParentId = act.id
        break
      }
      if (activeType === 'scene') {
        for (const ch of act.chapters || []) {
          if (ch.scenes?.some(s => s.id === numericActiveId)) {
            activeParentId = ch.id
            break
          }
        }
      }
      if (activeParentId) break
    }
    if (!activeParentId) return

    // Moving Scenes
    if (activeType === 'scene') {
      let targetChapterId = null
      let targetAct = null
      for (const act of acts) {
        for (const ch of act.chapters || []) {
          if (`ch-${ch.id}` === overIdStr || ch.scenes?.some(s => `scene-${s.id}` === overIdStr)) {
            targetChapterId = ch.id
            targetAct = act
            break
          }
        }
        if (targetChapterId) break
      }
      if (targetChapterId) {
        const targetChapter = targetAct.chapters.find(c => c.id === targetChapterId)
        const sourceChapter = acts.flatMap(a => a.chapters || []).find(c => c.id === activeParentId)
        const currentScenes = [...(targetChapter.scenes || [])]
        const numericOverId = getNumId(overIdStr)
        if (activeParentId === targetChapterId) {
          const oldIndex = currentScenes.findIndex(s => s.id === numericActiveId)
          const newIndex = currentScenes.findIndex(s => s.id === numericOverId)
          if (oldIndex !== -1 && newIndex !== -1) {
            updateSceneOrder(novelId, arrayMove(currentScenes, oldIndex, newIndex).map(s => s.id))
          }
        } else {
          const activeSceneObj = sourceChapter.scenes.find(s => s.id === numericActiveId)
          const overIndex = currentScenes.findIndex(s => s.id === numericOverId)
          if (overIndex !== -1) currentScenes.splice(overIndex, 0, activeSceneObj)
          else currentScenes.push(activeSceneObj)
          moveScene(numericActiveId, targetChapterId, currentScenes.map(s => s.id))
        }
      }
    }

    // Moving Chapters
    if (activeType === 'chapter') {
      let targetActId = null
      for (const act of acts) {
        if (`act-${act.id}` === overIdStr || act.chapters?.some(c => `ch-${c.id}` === overIdStr)) {
          targetActId = act.id
          break
        }
      }
      if (targetActId) {
        const targetAct = acts.find(a => a.id === targetActId)
        const sourceAct = acts.find(a => a.id === activeParentId)
        const currentChapters = [...(targetAct.chapters || [])]
        const numericOverId = getNumId(overIdStr)
        if (activeParentId === targetActId) {
          const oldIndex = currentChapters.findIndex(c => c.id === numericActiveId)
          const newIndex = currentChapters.findIndex(c => c.id === numericOverId)
          if (oldIndex !== -1 && newIndex !== -1) {
            updateChapterOrder(novelId, arrayMove(currentChapters, oldIndex, newIndex).map(c => c.id))
          }
        } else {
          const activeChapterObj = sourceAct.chapters.find(c => c.id === numericActiveId)
          const overIndex = currentChapters.findIndex(c => c.id === numericOverId)
          if (overIndex !== -1) currentChapters.splice(overIndex, 0, activeChapterObj)
          else currentChapters.push(activeChapterObj)
          moveChapter(numericActiveId, targetActId, currentChapters.map(c => c.id))
        }
      }
    }
  }

  return {
    activeDragId,
    sensors,
    getDragLabel,
    handleDragStart,
    handleDragOver,
    handleDragCancel,
    handleDragEnd,
  }
}
