import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './components'
import { NovelProvider, AIProvider, ModalProvider } from './context'
import './index.css'
import './utilities.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary name="LoneWriter">
      <ModalProvider>
        <NovelProvider>
          <AIProvider>
            <App />
          </AIProvider>
        </NovelProvider>
      </ModalProvider>
    </ErrorBoundary>
  </StrictMode>,
)
