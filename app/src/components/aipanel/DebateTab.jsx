import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import {
  MessageSquare, RefreshCw, Send, Trash2,
  Pencil, User, AlertTriangle, RotateCcw,
  AlignLeft, ChevronDown, MoreHorizontal, BookOpen
} from 'lucide-react'
import './DebateTab.css'
import './DebateToolbar.css'
import './DebateManagePanel.css'
import './DebateInput.css'
import './Markdown.css'
import { useAI, useNovel, useModal } from '../../context'
import { MarkdownRenderer, Tooltip } from '../'
import { normalizeTextForDisplay } from './aiPanelHelpers'
import { useDebateOrchestrator } from './useDebateOrchestrator'
import { AgentEditForm } from './AgentEditForm'

const AGENT_COLORS = ['#6b9fd4', '#e07070', '#5cb98a', '#c59de0', '#e0b870', '#70d4e0', '#e070b8']

function DebateTab({ activeScene }) {
  DebateTab.propTypes = {
    activeScene: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string,
      content: PropTypes.string,
      pov: PropTypes.string,
      chapterId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  };

  const { t } = useTranslation('ai')
  const {
    provider, apiKey, localBaseUrl, currentModel,
    debateAgents, debateHistory,
    addDebateMessage, clearDebateHistory,
    toggleDebateAgent, updateDebateAgent, addDebateAgent, removeDebateAgent,
    debateSessions, activeSessionId, switchDebateSession, renameDebateSession, deleteDebateSession, addDebateSession,
    logAIUsage
  } = useAI()
  const { resources, activeNovel, acts } = useNovel()
  const { openModal } = useModal()
  const activeSessionTitle = debateSessions.find(s => s.id === activeSessionId)?.title || 'Nuevo debate'

  const {
    input, setInput,
    loadingAgents,
    rounds, setRounds,
    useSceneContext, setUseSceneContext,
    useCompendiumContext, setUseCompendiumContext,
    messagesEndRef,
    activeAgents, isAnyLoading,
    handleSend, handleKeyDown, getSceneChapterLabel,
  } = useDebateOrchestrator({
    activeScene, debateAgents, debateHistory, activeSessionId, activeSessionTitle,
    addDebateMessage, renameDebateSession, activeNovel, acts, resources,
    provider, apiKey, currentModel, localBaseUrl, logAIUsage,
  })

  const [view, setView] = useState('chat')
  const [editingAgent, setEditingAgent] = useState(null)
  const [expandedMessages, setExpandedMessages] = useState(new Set())
  const [newAgent, setNewAgent] = useState(null)

  const [sessionsMenuOpen, setSessionsMenuOpen] = useState(false)
  const [sessionEditingId, setSessionEditingId] = useState(null)
  const [sessionEditTitle, setSessionEditTitle] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setSessionsMenuOpen(false)
    }
    if (sessionsMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sessionsMenuOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [debateHistory, loadingAgents])

  const saveEditingAgent = (changes) => { updateDebateAgent(editingAgent, changes); setEditingAgent(null) }

  const handleAddAgent = () => {
    if (!newAgent?.name?.trim()) return
    addDebateAgent({
      name: newAgent.name.trim(),
      initials: newAgent.name.trim().slice(0, 2).toUpperCase(),
      color: newAgent.color || AGENT_COLORS[debateAgents.length % AGENT_COLORS.length],
      desc: newAgent.desc || '',
      systemPrompt: newAgent.systemPrompt || t('debate.agente_asistente_prompt', { name: newAgent.name }),
    })
    setNewAgent(null)
  }

  // ── View: Agent Management ──────────────────────
  if (view === 'agents') {
    const agentBeingEdited = editingAgent ? debateAgents.find(a => a.id === editingAgent) : null
    return (
      <div className="debate-tab">
        <div className="debate-manage-header">
          <button className="debate-back-btn" onClick={() => { setEditingAgent(null); setView('chat') }}>{t('debate.volver')}</button>
          <span className="debate-manage-title">{t('debate.gestionar')}</span>
        </div>
        {agentBeingEdited ? (
          <AgentEditForm agent={agentBeingEdited} colors={AGENT_COLORS} onSave={saveEditingAgent} onCancel={() => setEditingAgent(null)} canDelete={debateAgents.length > 1} onDelete={() => { removeDebateAgent(editingAgent); setEditingAgent(null) }} />
        ) : newAgent !== null ? (
          <AgentEditForm agent={{ name: '', desc: '', color: AGENT_COLORS[debateAgents.length % AGENT_COLORS.length], systemPrompt: '', ...newAgent }} colors={AGENT_COLORS} onSave={(changes) => { setNewAgent(prev => ({ ...prev, ...changes })); handleAddAgent() }} onCancel={() => setNewAgent(null)} isNew />
        ) : (
          <>
            <div className="debate-agent-list">
              {debateAgents.map(agent => (
                <div key={agent.id} className="debate-agent-card" style={{ '--agent-color': agent.color }}>
                  <div className="debate-agent-card__info">
                    <div className="debate-agent-card__avatar">{agent.initials}</div>
                    <div>
                      <div className="debate-agent-card__name">{agent.name}</div>
                      <div className="debate-agent-card__desc">{agent.desc || t('debate.sin_descripcion')}</div>
                    </div>
                  </div>
                  <div className="debate-agent-card__actions">
                    <Tooltip content={t('debate.editar')}>
                      <button className="debate-agent-card__btn" onClick={() => setEditingAgent(agent.id)}><Pencil size={13} /></button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost debate-add-agent-btn" onClick={() => setNewAgent({})}>{t('debate.anadir')}</button>
          </>
        )}
      </div>
    )
  }

  // ── View: Chat ──────────────────────────────────
  return (
    <div className="debate-tab">
      <div className="debate-toolbar">
        <div className="debate-agents__list">
          {debateAgents.map(agent => (
            <Tooltip key={agent.id} content={`${agent.name} — ${t('debate.activar_agente')}`}>
              <button id={`debate-agent-${agent.id}`} className={`debate-agent-btn ${agent.active ? 'debate-agent-btn--active' : ''}`} style={{ '--agent-color': agent.color }} onClick={() => toggleDebateAgent(agent.id)}>
                <span className="debate-agent-btn__avatar">{agent.initials}</span>
                <span>{agent.name}</span>
              </button>
            </Tooltip>
          ))}
        </div>
        <div className="debate-toolbar__actions">
          <div className="debate-sessions-wrapper" ref={dropdownRef}>
            <Tooltip content={t('debate.cambiar_chat')}>
              <button className="debate-sessions-trigger" onClick={() => setSessionsMenuOpen(!sessionsMenuOpen)}>
                <MessageSquare size={13} />
                <span className="debate-sessions-truncate">{activeSessionTitle}</span>
                <ChevronDown size={12} className="debate-sessions-trigger__chevron" />
              </button>
            </Tooltip>
            {sessionsMenuOpen && (
              <div className="debate-sessions-dropdown">
                <button className="debate-session-new-btn" onClick={() => { const si = getSceneChapterLabel(activeScene); addDebateSession(null, si); setSessionsMenuOpen(false) }}>
                  <span>{t('debate.nuevo_debate')}</span>
                </button>
                <div className="debate-sessions-list">
                  {debateSessions.map(session => (
                    <div key={session.id} className={`debate-session-item ${session.id === activeSessionId ? 'active' : ''}`}>
                      {sessionEditingId === session.id ? (
                        <input className="debate-session-input" autoFocus value={sessionEditTitle} onChange={e => setSessionEditTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { renameDebateSession(session.id, sessionEditTitle); setSessionEditingId(null) } else if (e.key === 'Escape') setSessionEditingId(null) }} onBlur={() => { if (sessionEditTitle.trim()) renameDebateSession(session.id, sessionEditTitle); setSessionEditingId(null) }} />
                      ) : (
                        <span className="debate-session-title" onClick={() => { switchDebateSession(session.id); setSessionsMenuOpen(false) }}>{session.title}</span>
                      )}
                      <div className="debate-session-actions">
                        <Tooltip content={t('debate.renombrar')}>
                          <button className="debate-session-action-btn" onClick={(e) => { e.stopPropagation(); setSessionEditTitle(session.title); setSessionEditingId(session.id) }}><Pencil size={11} /></button>
                        </Tooltip>
                        <Tooltip content={t('debate.borrar_chat')}>
                          <button className="debate-session-action-btn" onClick={(e) => { e.stopPropagation(); openModal('confirm', { title: t('debate.borrar_chat_titulo'), message: t('debate.borrar_chat_mensaje', { title: session.title }), isDanger: true, confirmLabel: t('debate.borrar_chat_boton'), onConfirm: () => deleteDebateSession(session.id) }) }}><Trash2 size={11} /></button>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Tooltip content={t('debate.rondas')}>
            <div className="debate-rounds">
              <RotateCcw size={13} strokeWidth={2.5} />
              <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
                <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
              </select>
            </div>
          </Tooltip>
          <Tooltip content={useSceneContext ? t('debate.contexto_escena_on') : t('debate.contexto_escena_off')}>
            <button className={`debate-context-btn ${useSceneContext ? 'debate-context-btn--active' : ''}`} onClick={() => setUseSceneContext(p => !p)}><AlignLeft size={13} /></button>
          </Tooltip>
          <Tooltip content={useCompendiumContext ? t('debate.contexto_compendio_on') : t('debate.contexto_compendio_off')}>
            <button className={`debate-context-btn ${useCompendiumContext ? 'debate-context-btn--active' : ''}`} onClick={() => setUseCompendiumContext(p => !p)}><BookOpen size={13} /></button>
          </Tooltip>
          <Tooltip content={t('debate.gestionar_participantes')}>
            <button className="debate-manage-btn" onClick={() => setView('agents')}><MoreHorizontal size={15} /></button>
          </Tooltip>
          {debateHistory.length > 0 && (
            <Tooltip content={t('debate.borrar_historial')}>
              <button className="debate-clear-btn" onClick={() => openModal('confirm', { title: t('debate.limpiar_titulo'), message: t('debate.limpiar_mensaje'), isDanger: true, confirmLabel: t('debate.limpiar_boton'), onConfirm: () => clearDebateHistory() })}><Trash2 size={13} /></button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="debate-messages" id="debate-messages-container">
        {debateHistory.length === 0 && (
          <div className="debate-empty">
            <MessageSquare size={28} />
            <p>{t('debate.vacio')}</p>
            {activeScene && useSceneContext && (
              <span className="debate-context-tag"><AlignLeft size={11} /> {t('debate.con_contexto', { title: activeScene.title })}</span>
            )}
          </div>
        )}
        {debateHistory.map(msg => {
          if (msg.role === 'user') return (
            <div key={msg.id} className="debate-msg debate-msg--user">
              <MarkdownRenderer className="debate-msg__bubble debate-msg__bubble--user" content={normalizeTextForDisplay(msg.text)} />
              <div className="debate-msg__meta debate-msg__meta--user">
                <span className="debate-msg__time">{msg.time}</span>
                <div className="debate-msg__avatar debate-msg__avatar--user"><User size={11} /></div>
              </div>
            </div>
          )
          if (msg.role === 'error') return (
            <div key={msg.id} className="debate-msg debate-msg--error">
              <AlertTriangle size={13} />
              <strong>{msg.agentName}:</strong> <MarkdownRenderer className="debate-msg__error-text" content={normalizeTextForDisplay(msg.text)} />
            </div>
          )
          const color = msg.agentColor || '#888'
          const text = normalizeTextForDisplay(msg.text || '')
          const msgKey = String(msg.id)
          const isExpanded = expandedMessages.has(msgKey)
          return (
            <div key={msg.id} className="debate-msg debate-msg--agent" style={{ '--agent-color': color }}>
              <div className="debate-msg__agent-header">
                <div className="debate-msg__avatar-circle">{msg.agentInitials || '?'}</div>
                <span className="debate-msg__agent-name">{msg.agentName}</span>
                <span className="debate-msg__time">{msg.time}</span>
              </div>
              <div className="debate-msg__bubble debate-msg__bubble--agent">
              <MarkdownRenderer className="debate-msg__text" content={text} clamped={!isExpanded} />
                {!isExpanded && <button className="debate-msg__read-more" onClick={() => setExpandedMessages(prev => new Set(prev).add(msgKey))}>{t('debate.leer_mas')}</button>}
                {isExpanded && <button className="debate-msg__read-more" onClick={() => setExpandedMessages(prev => { const n = new Set(prev); n.delete(msgKey); return n })}>{t('debate.mostrar_menos')}</button>}
              </div>
            </div>
          )
        })}
        {Object.entries(loadingAgents).map(([agentId, isLoading]) => {
          if (!isLoading) return null
          const agent = debateAgents.find(a => a.id === agentId)
          if (!agent) return null
          return (
            <div key={`loading-${agentId}`} className="debate-msg debate-msg--agent" style={{ '--agent-color': agent.color }}>
              <div className="debate-msg__agent-header">
                <div className="debate-msg__avatar-circle">{agent.initials}</div>
                <span className="debate-msg__agent-name">{agent.name}</span>
                <span className="debate-msg__time">{t('debate.escribiendo')}</span>
              </div>
              <div className="debate-msg__bubble debate-msg__bubble--agent debate-msg__typing"><span /><span /><span /></div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="debate-input-area">
        <textarea id="debate-input" className="debate-input" placeholder={activeAgents.length === 0 ? t('debate.placeholder_inactivo') : t('debate.placeholder_input')} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={2} disabled={isAnyLoading || activeAgents.length === 0} />
        <button className={`debate-send-btn ${input.trim() && !isAnyLoading ? 'debate-send-btn--active' : ''}`} id="debate-send-btn" onClick={handleSend} disabled={!input.trim() || isAnyLoading || activeAgents.length === 0}>
          {isAnyLoading ? <RefreshCw size={15} className="spinner" /> : <Send size={15} />}
        </button>
      </div>
      <span className="debate-input-hint">{t('debate.hint_input')}</span>
    </div>
  )
}

export default DebateTab
