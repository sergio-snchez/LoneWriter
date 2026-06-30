import { StrictMode, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './components'
import { NovelProvider, AIProvider, ModalProvider } from './context'
import { openDatabase, db } from './db/database'
import './index.css'
import './utilities.css'

function DbRecovery({ onRetry, onReset }) {
  const [resetting, setResetting] = useState(false)
  const errorInfo = (() => {
    try {
      const raw = sessionStorage.getItem('lw_db_error')
      return raw ? JSON.parse(raw) : { message: 'Unknown error' }
    } catch {
      return { message: 'Unknown error' }
    }
  })()

  const handleReset = async () => {
    setResetting(true)
    try {
      await db.delete()
      sessionStorage.removeItem('lw_db_error')
      window.location.reload()
    } catch (e) {
      console.error('[DB] Reset failed:', e)
      setResetting(false)
    }
  }

  return (
    <div className="app-loading" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', lineHeight: 1 }}>⚠️</div>
      <h2 style={{ margin: 0 }}>Database Error</h2>
      <p style={{ maxWidth: 400, color: 'var(--text-secondary)' }}>{errorInfo.message}</p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={onRetry} disabled={resetting}>
          Retry
        </button>
        <button className="btn btn-secondary" onClick={handleReset} disabled={resetting}>
          {resetting ? 'Resetting...' : 'Reset Database'}
        </button>
      </div>
    </div>
  )
}

function Boot() {
  const [dbState, setDbState] = useState('loading')

  useEffect(() => {
    openDatabase().then(ok => setDbState(ok ? 'ready' : 'error'))
  }, [])

  if (dbState === 'loading') {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <span>Initializing database...</span>
      </div>
    )
  }

  if (dbState === 'error') {
    return (
      <DbRecovery
        onRetry={() => { setDbState('loading'); openDatabase().then(ok => setDbState(ok ? 'ready' : 'error')) }}
      />
    )
  }

  return (
    <ErrorBoundary name="LoneWriter">
      <ModalProvider>
        <NovelProvider>
          <AIProvider>
            <App />
          </AIProvider>
        </NovelProvider>
      </ModalProvider>
    </ErrorBoundary>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
