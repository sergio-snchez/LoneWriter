import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { NovelProvider } from './context/NovelContext'
import { AIProvider } from './context/AIContext'
import { ModalProvider } from './context/ModalContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ModalProvider>
      <NovelProvider>
        <AIProvider>
          <App />
        </AIProvider>
      </NovelProvider>
    </ModalProvider>
  </React.StrictMode>,
)
