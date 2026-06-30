import { createContext, useContext } from 'react'
import { useAppPreferences } from '../hooks/useAppPreferences'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const value = useAppPreferences()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return ctx
}
