/**
 * DebateTab — Multi-agent debate/chat panel tab.
 * Extracted from AIPanel.jsx for maintainability.
 */
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MessageSquare, RefreshCw, Send, Trash2,
  Pencil, User, AlertTriangle, RotateCcw,
  AlignLeft, ChevronDown, MoreHorizontal, BookOpen
} from 'lucide-react'
import { useAI } from '../../context/AIContext'
import { useNovel } from '../../context/NovelContext'
import { useModal } from '../../context/ModalContext'
import { AIService } from '../../services/aiService'
import { createDebouncedSearch } from '../../services/compendiumSearch'
import { retrieveRelevantFragments } from '../../services/ragService'
import { Tooltip } from '../Tooltip'
import { renderMarkdown } from '../../utils/renderMarkdown'
import { normalizeTextForDisplay } from './aiPanelHelpers'

function DebateTab({ activeScene }) {
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

  const [input, setInput] = useState('')
  const [loadingAgents, setLoadingAgents] = useState({})
  const [view, setView] = useState('chat')
  const [editingAgent, setEditingAgent] = useState(null)
  const [expandedMessages, setExpandedMessages] = useState(new Set())
  const [newAgent, setNewAgent] = useState(null)
  const [useSceneContext, setUseSceneContext] = useState(true)
  const [useCompendiumContext, setUseCompendiumContext] = useState(true)
  const [compendiumContext, setCompendiumContext] = useState('')
  const [rounds, setRounds] = useState(1)
  const messagesEndRef = useRef(null)
  const debouncedSearchRef = useRef(createDebouncedSearch(600))

  // Session Dropdown State
  const [sessionsMenuOpen, setSessionsMenuOpen] = useState(false)
  const [sessionEditingId, setSessionEditingId] = useState(null)
  const [sessionEditTitle, setSessionEditTitle] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSessionsMenuOpen(false);
      }
    }
    if (sessionsMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sessionsMenuOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [debateHistory, loadingAgents])

  const activeAgents = debateAgents.filter(a => a.active)
  const isAnyLoading = Object.values(loadingAgents).some(Boolean)
  const activeSessionTitle = debateSessions.find(s => s.id === activeSessionId)?.title || 'Nuevo debate';

  const getSceneChapterLabel = (scene) => {
    if (!scene || !acts) return null
    for (const act of acts) {
      if (!act.chapters) continue
      const ch = act.chapters.find(c => c.id === scene.chapterId)
      if (ch) return { chapterNumber: ch.number, sceneTitle: scene.title }
    }
    return null
  }

  const handleSend = async () => {
    if (!input.trim() || isAnyLoading) return

    if (activeSessionTitle === 'Nuevo debate') {
      const sceneInfo = getSceneChapterLabel(activeScene)
      if (sceneInfo) {
        const newTitle = sceneInfo.chapterNumber
          ? `Cap. ${sceneInfo.chapterNumber} / ${sceneInfo.sceneTitle}`
          : sceneInfo.sceneTitle
        renameDebateSession(activeSessionId, newTitle)
      }
    }

    const text = input.trim()
    setInput('')

    const userMsg = {
      role: 'user',
      text,
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    }
    addDebateMessage(userMsg)

    let compendiumInfo = ''
    let ragInfo = ''
    if (activeNovel) {
      try {
        const ragTimeout = new Promise(resolve => setTimeout(() => resolve([]), 8000));
        const ragPromise = retrieveRelevantFragments(text, activeNovel.id, 4);

        let compendiumPromise = Promise.resolve(null);
        if (useCompendiumContext) {
          compendiumPromise = debouncedSearchRef.current(text, activeNovel.id);
        }

        const [compResult, ragResult] = await Promise.allSettled([
          compendiumPromise,
          Promise.race([ragPromise, ragTimeout])
        ]);

        if (useCompendiumContext && compResult.status === 'fulfilled' && compResult.value?.formatted) {
          compendiumInfo = `\n\n--- INFORMACIÓN DEL COMPENDIO (contexto relevante) ---\n${compResult.value.formatted}`;
          setCompendiumContext(compResult.value.formatted);
        } else {
          setCompendiumContext('');
        }

        if (ragResult.status === 'fulfilled' && ragResult.value?.length > 0) {
          ragInfo = ragResult.value.map(f => `[Fragmento relevante guardado localmente]\n${f.text}`).join('\n\n');
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('[LoneWriter] Error en contexto de Debate:', err);
        setCompendiumContext('');
      }
    }

    const historyWithUser = [...debateHistory, userMsg]
    for (let r = 0; r < rounds; r++) {
      for (const agent of activeAgents) {
        setLoadingAgents(prev => ({ ...prev, [agent.id]: true }))
        try {
          const sceneContent = useSceneContext && activeScene?.content
            ? activeScene.content.replace(/<[^>]*>/g, '').slice(0, 2000)
            : null
          const pov = useSceneContext && activeScene?.pov ? activeScene.pov : null

          let roundInstruction = ''
          if (rounds > 1) {
            if (r === 0) {
              roundInstruction = t('debate.ronda_inicial', { total: rounds })
            } else if (r === rounds - 1) {
              roundInstruction = t('debate.ronda_final', { actual: r + 1, total: rounds })
            } else {
              roundInstruction = t('debate.ronda_intermedia', { actual: r + 1, total: rounds })
            }
          }

          const activeRes = resources?.filter(res => res.activeForAI && res.content) || [];
          const knowledgeBase = activeRes.length > 0
            ? activeRes.map(res => `Archivo: [${res.name}]\nContenido:\n${res.content}`).join('\n\n')
            : null;

          const response = await AIService.agentChat(agent, historyWithUser, {
            provider, apiKey, model: currentModel, localBaseUrl, sceneContent, pov, roundInstruction, knowledgeBase,
            compendiumContext: compendiumInfo || null,
            ragContext: ragInfo || null
          })

          logAIUsage(response.usage);

          const agentMsg = {
            role: 'agent',
            agent: agent.id,
            agentName: agent.name,
            agentColor: agent.color,
            agentInitials: agent.initials,
            text: response.text,
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          }
          addDebateMessage(agentMsg)
          historyWithUser.push(agentMsg)
        } catch (err) {
          addDebateMessage({
            role: 'error',
            agent: agent.id,
            agentName: agent.name,
            text: `Error: ${err.message}`,
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          })
        } finally {
          setLoadingAgents(prev => ({ ...prev, [agent.id]: false }))
        }
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Agent Management ──────────────────────────────────────────
  const AGENT_COLORS = ['#6b9fd4', '#e07070', '#5cb98a', '#c59de0', '#e0b870', '#70d4e0', '#e070b8']
  const saveEditingAgent = (changes) => {
    updateDebateAgent(editingAgent, changes)
    setEditingAgent(null)
  }

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

  // ── View: Agent Management ─────────────────────────────────
  if (view === 'agents') {
    const agentBeingEdited = editingAgent ? debateAgents.find(a => a.id === editingAgent) : null
    return (
      <div className="debate-tab">
        <div className="debate-manage-header">
          <button className="debate-back-btn" onClick={() => { setEditingAgent(null); setView('chat') }}>
            {t('debate.volver')}
          </button>
          <span className="debate-manage-title">{t('debate.gestionar')}</span>
        </div>

        {agentBeingEdited ? (
          <AgentEditForm
            agent={agentBeingEdited}
            colors={AGENT_COLORS}
            onSave={saveEditingAgent}
            onCancel={() => setEditingAgent(null)}
            canDelete={debateAgents.length > 1}
            onDelete={() => { removeDebateAgent(editingAgent); setEditingAgent(null) }}
          />
        ) : newAgent !== null ? (
          <AgentEditForm
            agent={{ name: '', desc: '', color: AGENT_COLORS[debateAgents.length % AGENT_COLORS.length], systemPrompt: '', ...newAgent }}
            colors={AGENT_COLORS}
            onSave={(changes) => { setNewAgent(prev => ({ ...prev, ...changes })); handleAddAgent() }}
            onCancel={() => setNewAgent(null)}
            isNew
          />
        ) : (
          <>
            <div className="debate-agent-list">
              {debateAgents.map(agent => (
                <div key={agent.id} className="debate-agent-card" style={{ borderLeftColor: agent.color }}>
                  <div className="debate-agent-card__info">
                    <div className="debate-agent-card__avatar" style={{ background: agent.color + '30', color: agent.color }}>
                      {agent.initials}
                    </div>
                    <div>
                      <div className="debate-agent-card__name">{agent.name}</div>
                      <div className="debate-agent-card__desc">{agent.desc || t('debate.sin_descripcion')}</div>
                    </div>
                  </div>
                  <div className="debate-agent-card__actions">
                    <Tooltip content={t('debate.editar')}>
                      <button className="debate-agent-card__btn" onClick={() => setEditingAgent(agent.id)}>
                        <Pencil size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost debate-add-agent-btn" onClick={() => setNewAgent({})}>
              {t('debate.anadir')}
            </button>
          </>
        )}
      </div>
    )
  }

  // ── View: Chat ──────────────────────────────────────────────
  return (
    <div className="debate-tab">
      {/* Toolbar */}
      <div className="debate-toolbar">
        <div className="debate-agents__list">
          {debateAgents.map(agent => (
            <Tooltip key={agent.id} content={`${agent.name} — ${t('debate.activar_agente')}`}>
              <button
                id={`debate-agent-${agent.id}`}
                className={`debate-agent-btn ${agent.active ? 'debate-agent-btn--active' : ''}`}
                style={agent.active ? { borderColor: agent.color + '60', background: agent.color + '18', color: agent.color } : {}}
                onClick={() => toggleDebateAgent(agent.id)}
              >
                <span className="debate-agent-btn__avatar" style={{ background: agent.color + '30', color: agent.color }}>
                  {agent.initials}
                </span>
                <span>{agent.name}</span>
              </button>
            </Tooltip>
          ))}
        </div>
        <div className="debate-toolbar__actions">
          {/* Sessions Dropdown */}
          <div className="debate-sessions-wrapper" ref={dropdownRef}>
            <Tooltip content={t('debate.cambiar_chat')}>
              <button className="debate-sessions-trigger" onClick={() => setSessionsMenuOpen(!sessionsMenuOpen)}>
                <MessageSquare size={13} />
                <span className="debate-sessions-truncate">{activeSessionTitle}</span>
                <ChevronDown size={12} style={{ opacity: 0.6 }} />
              </button>
            </Tooltip>

            {sessionsMenuOpen && (
              <div className="debate-sessions-dropdown">
                <button
                  className="debate-session-new-btn"
                  onClick={() => {
                    const sceneInfo = getSceneChapterLabel(activeScene)
                    addDebateSession(null, sceneInfo)
                    setSessionsMenuOpen(false)
                  }}
                >
                  <span>{t('debate.nuevo_debate')}</span>
                </button>
                <div className="debate-sessions-list">
                  {debateSessions.map(session => (
                    <div key={session.id} className={`debate-session-item ${session.id === activeSessionId ? 'active' : ''}`}>
                      {sessionEditingId === session.id ? (
                        <input
                          className="debate-session-input"
                          autoFocus
                          value={sessionEditTitle}
                          onChange={e => setSessionEditTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              renameDebateSession(session.id, sessionEditTitle);
                              setSessionEditingId(null);
                            } else if (e.key === 'Escape') {
                              setSessionEditingId(null);
                            }
                          }}
                          onBlur={() => {
                            if (sessionEditTitle.trim()) {
                              renameDebateSession(session.id, sessionEditTitle);
                            }
                            setSessionEditingId(null);
                          }}
                        />
                      ) : (
                        <span
                          className="debate-session-title"
                          onClick={() => { switchDebateSession(session.id); setSessionsMenuOpen(false); }}
                        >
                          {session.title}
                        </span>
                      )}

                      <div className="debate-session-actions">
                        <Tooltip content={t('debate.renombrar')}>
                          <button
                            className="debate-session-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionEditTitle(session.title);
                              setSessionEditingId(session.id);
                            }}
                          >
                            <Pencil size={11} />
                          </button>
                        </Tooltip>
                        <Tooltip content={t('debate.borrar_chat')}>
                          <button
                            className="debate-session-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal('confirm', {
                                title: t('debate.borrar_chat_titulo'),
                                message: t('debate.borrar_chat_mensaje', { title: session.title }),
                                isDanger: true,
                                confirmLabel: t('debate.borrar_chat_boton'),
                                onConfirm: () => deleteDebateSession(session.id)
                              });
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
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
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </Tooltip>
          <Tooltip content={useSceneContext ? t('debate.contexto_escena_on') : t('debate.contexto_escena_off')}>
            <button
              className={`debate-context-btn ${useSceneContext ? 'debate-context-btn--active' : ''}`}
              onClick={() => setUseSceneContext(p => !p)}
            >
              <AlignLeft size={13} />
            </button>
          </Tooltip>
          <Tooltip content={useCompendiumContext ? t('debate.contexto_compendio_on') : t('debate.contexto_compendio_off')}>
            <button
              className={`debate-context-btn ${useCompendiumContext ? 'debate-context-btn--active' : ''}`}
              onClick={() => setUseCompendiumContext(p => !p)}
            >
              <BookOpen size={13} />
            </button>
          </Tooltip>
          <Tooltip content={t('debate.gestionar_participantes')}>
            <button className="debate-manage-btn" onClick={() => setView('agents')}>
              <MoreHorizontal size={15} />
            </button>
          </Tooltip>
          {debateHistory.length > 0 && (
            <Tooltip content={t('debate.borrar_historial')}>
              <button
                className="debate-clear-btn"
                onClick={() => {
                  openModal('confirm', {
                    title: t('debate.limpiar_titulo'),
                    message: t('debate.limpiar_mensaje'),
                    isDanger: true,
                    confirmLabel: t('debate.limpiar_boton'),
                    onConfirm: () => clearDebateHistory()
                  });
                }}
              >
                <Trash2 size={13} />
              </button>
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
              <span className="debate-context-tag">
                <AlignLeft size={11} /> {t('debate.con_contexto', { title: activeScene.title })}
              </span>
            )}
          </div>
        )}
        {debateHistory.map(msg => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="debate-msg debate-msg--user">
                <div className="debate-msg__bubble debate-msg__bubble--user" dangerouslySetInnerHTML={{ __html: renderMarkdown(normalizeTextForDisplay(msg.text)) }}></div>
                <div className="debate-msg__meta debate-msg__meta--user">
                  <span className="debate-msg__time">{msg.time}</span>
                  <div className="debate-msg__avatar debate-msg__avatar--user"><User size={11} /></div>
                </div>
              </div>
            )
          }
          if (msg.role === 'error') {
            return (
              <div key={msg.id} className="debate-msg debate-msg--error">
                <AlertTriangle size={13} />
                <span><strong>{msg.agentName}:</strong> <span dangerouslySetInnerHTML={{ __html: renderMarkdown(normalizeTextForDisplay(msg.text)) }} /></span>
              </div>
            )
          }
          const color = msg.agentColor || '#888'
          const text = normalizeTextForDisplay(msg.text || '')
          const msgKey = String(msg.id)
          const isExpanded = expandedMessages.has(msgKey)

          return (
            <div key={msg.id} className="debate-msg debate-msg--agent">
              <div className="debate-msg__agent-header">
                <div className="debate-msg__avatar-circle" style={{ background: color + '30', color }}>
                  {msg.agentInitials || '?'}
                </div>
                <span className="debate-msg__agent-name" style={{ color }}>{msg.agentName}</span>
                <span className="debate-msg__time">{msg.time}</span>
              </div>
              <div className="debate-msg__bubble debate-msg__bubble--agent" style={{ borderLeftColor: color + '70' }}>
                <div className={`debate-msg__text ${!isExpanded ? 'debate-msg__text--clamped' : ''}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}>
                </div>
                {!isExpanded && (
                  <button
                    className="debate-msg__read-more"
                    onClick={() => setExpandedMessages(prev => new Set(prev).add(msgKey))}
                  >
                    {t('debate.leer_mas')}
                  </button>
                )}
                {isExpanded && (
                  <button
                    className="debate-msg__read-more"
                    onClick={() => setExpandedMessages(prev => {
                      const next = new Set(prev);
                      next.delete(msgKey);
                      return next;
                    })}
                  >
                    {t('debate.mostrar_menos')}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Per-agent loading indicators */}
        {Object.entries(loadingAgents).map(([agentId, isLoading]) => {
          if (!isLoading) return null
          const agent = debateAgents.find(a => a.id === agentId)
          if (!agent) return null
          return (
            <div key={`loading-${agentId}`} className="debate-msg debate-msg--agent">
              <div className="debate-msg__agent-header">
                <div className="debate-msg__avatar-circle" style={{ background: agent.color + '30', color: agent.color }}>
                  {agent.initials}
                </div>
                <span className="debate-msg__agent-name" style={{ color: agent.color }}>{agent.name}</span>
                <span className="debate-msg__time">{t('debate.escribiendo')}</span>
              </div>
              <div className="debate-msg__bubble debate-msg__bubble--agent debate-msg__typing" style={{ borderLeftColor: agent.color + '70' }}>
                <span /><span /><span />
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="debate-input-area">
        <textarea
          id="debate-input"
          className="debate-input"
          placeholder={activeAgents.length === 0 ? t('debate.placeholder_inactivo') : t('debate.placeholder_input')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={isAnyLoading || activeAgents.length === 0}
        />
        <button
          className={`debate-send-btn ${input.trim() && !isAnyLoading ? 'debate-send-btn--active' : ''}`}
          id="debate-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isAnyLoading || activeAgents.length === 0}
        >
          {isAnyLoading ? <RefreshCw size={15} className="spinner" /> : <Send size={15} />}
        </button>
      </div>
      <span className="debate-input-hint">{t('debate.hint_input')}</span>
    </div>
  )
}

// ─── Agent Edit Form ──────────────────────────────────────────
function AgentEditForm({ agent, colors, onSave, onCancel, isNew, canDelete, onDelete }) {
  const { t } = useTranslation('ai')
  const { openModal } = useModal()
  const [form, setForm] = useState({ ...agent })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  return (
    <div className="agent-edit-form">
      <div className="agent-edit-form__row">
        <div className="debate-agent-card__avatar" style={{ background: form.color + '30', color: form.color, fontSize: 14, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
          {(form.initials || form.name?.slice(0, 2) || '??').toUpperCase()}
        </div>
        <input className="agent-edit-form__input" value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('debate.nombre_placeholder')} />
      </div>
      <input className="agent-edit-form__input" value={form.desc} onChange={e => set('desc', e.target.value)} placeholder={t('debate.desc_placeholder')} />
      <div className="agent-edit-form__colors">
        {colors.map(c => (
          <button key={c} className={`agent-color-dot ${form.color === c ? 'agent-color-dot--active' : ''}`} style={{ background: c, outlineColor: c }} onClick={() => set('color', c)} />
        ))}
      </div>
      <label className="agent-edit-form__label">{t('debate.prompt_label')}</label>
      <textarea className="agent-edit-form__prompt" value={form.systemPrompt} onChange={e => set('systemPrompt', e.target.value)} rows={7} placeholder={t('debate.prompt_placeholder')} />
      <p className="agent-edit-form__hint">{t('debate.prompt_hint')}</p>
      <div className="agent-edit-form__footer">
        {!isNew && canDelete && (
          <button className="btn btn-ghost btn-danger-ghost" onClick={() => {
            openModal('confirm', {
              title: t('debate.eliminar_titulo'),
              message: t('debate.eliminar_mensaje', { name: agent.name }),
              isDanger: true,
              confirmLabel: t('debate.eliminar_boton'),
              onConfirm: onDelete
            });
          }}>{t('debate.eliminar')}</button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onCancel}>{t('debate.cancelar')}</button>
        <button className="btn btn-primary" onClick={() => onSave(form)}>
          {isNew ? t('debate.crear') : t('debate.guardar')}
        </button>
      </div>
    </div>
  )
}

export default DebateTab
