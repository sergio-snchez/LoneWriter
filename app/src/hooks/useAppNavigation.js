/**
 * useAppNavigation.js — View routing and sidebar state for App.jsx.
 * Extracted from App.jsx to isolate navigation re-renders.
 */
import { useState } from 'react'

export function useAppNavigation() {
  const [activeView, setActiveView] = useState('editor')
  const [viewKey, setViewKey] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const handleViewChange = (view) => {
    setActiveView(view)
    setViewKey(prev => prev + 1)
  }

  return {
    activeView,
    viewKey,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    handleViewChange,
  }
}
