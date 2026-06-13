/**
 * AIPanel — Main container for the AI side panel.
 * Tabs (RewriteTab, DebateTab, OracleTab) live in ./aipanel/
 */
import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Sparkles, X, Wand2, MessageSquare, Eye, Key } from 'lucide-react'
import { useAI } from '../context'
import { Tooltip } from './'
import { RewriteTab, DebateTab, OracleTab } from './aipanel/index'
import './AIPanel.css'

const AIPanel = memo(function AIPanel({ open, onClose, activeScene, defaultTab = 'rewrite', onOpenSettings }) {
  const { t } = useTranslation('ai')
  const [activeTab, setActiveTab] = useState(defaultTab)
  const { apiKey, currentModel } = useAI()

  const [panelWidth, setPanelWidth] = useState(380)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragRef.current) return
      let newWidth = window.innerWidth - e.clientX
      if (newWidth < 350) newWidth = 350
      if (newWidth > 600) newWidth = 600
      setPanelWidth(newWidth)
    }
    const handleMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = false
        setIsDragging(false)
        document.body.style.cursor = 'default'
        document.body.classList.remove('no-select')
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const startDrag = useCallback((e) => {
    if (window.innerWidth <= 768) return
    dragRef.current = true
    setIsDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.classList.add('no-select')
    e.preventDefault()
  }, [])

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  return (
    <>
      <div
        className={`ai-panel ${open ? 'ai-panel--open' : ''} ${isDragging ? 'ai-panel--dragging' : ''}`}
        id="ai-panel"
        style={open ? { '--panel-width': `${panelWidth}px` } : {}}
      >
        <div className="ai-panel__resizer" onMouseDown={startDrag} />

        {/* Panel header */}
        <div className="ai-panel__header">
          <div className="ai-panel__header-left">
            <Sparkles size={15} className="ai-panel__header-icon" />
            <span className="ai-panel__header-title">{t('titulo_panel')}</span>
          </div>

          <div className="ai-panel__header-right">
            <Tooltip content={t('configurar_api')}>
              <button
                className={`ai-panel__api-btn ${!apiKey ? 'needs-key' : ''}`}
                onClick={() => onOpenSettings('ia')}
              >
                <Key size={13} />
                <span className="ai-panel__api-btn-text">
                  {currentModel || 'API'}
                </span>
              </button>
            </Tooltip>
            <button className="ai-panel__close" id="ai-panel-close-btn" onClick={onClose} aria-label={t('cerrar')}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="ai-panel__tabs">
          <button
            id="ai-tab-rewrite"
            className={`ai-panel__tab ${activeTab === 'rewrite' ? 'ai-panel__tab--active' : ''}`}
            onClick={() => handleTabChange('rewrite')}
          >
            <Wand2 size={13} />
            {t('tabs.reescribir')}
          </button>
          <button
            id="ai-tab-debate"
            className={`ai-panel__tab ${activeTab === 'debate' ? 'ai-panel__tab--active' : ''}`}
            onClick={() => handleTabChange('debate')}
          >
            <MessageSquare size={13} />
            {t('tabs.debate')}
          </button>
          <button
            id="ai-tab-oracle"
            className={`ai-panel__tab ${activeTab === 'oracle' ? 'ai-panel__tab--active' : ''}`}
            onClick={() => handleTabChange('oracle')}
          >
            <Eye size={13} />
            {t('tabs.oraculo')}
          </button>
        </div>

        {/* Tab content */}
        <div className="ai-panel__content">
          {activeTab === 'rewrite' && <RewriteTab activeScene={activeScene} />}
          {activeTab === 'debate' && <DebateTab activeScene={activeScene} />}
          {activeTab === 'oracle' && <OracleTab activeScene={activeScene} />}
        </div>
      </div>
    </>
  )
})

AIPanel.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  activeScene: PropTypes.object,
  defaultTab: PropTypes.oneOf(['rewrite', 'debate', 'oracle']),
  onOpenSettings: PropTypes.func.isRequired,
}

export default AIPanel
