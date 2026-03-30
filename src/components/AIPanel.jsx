import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, MessageSquare, X, ChevronRight, ChevronLeft,
  Wand2, Send, RefreshCw, Copy, Check, RotateCcw, Trash2,
  User, Pencil, AlertTriangle, CheckCheck, Bot,
  Lightbulb, Zap, AlignLeft, Type, Minimize2, Maximize2,
  ChevronDown, MoreHorizontal, ThumbsUp, ThumbsDown, Key, Save
} from 'lucide-react'
import { useAI } from '../context/AIContext'
import { AIService } from '../services/aiService'
import { useNovel } from '../context/NovelContext'
import { useModal } from '../context/ModalContext'
import './AIPanel.css'

// ─── Mock data ────────────────────────────────────────────────
const ORIGINAL_TEXT = `El pergamino olía a sal y algo más, algo acre que Dorian no supo identificar hasta que acercó la llama de la vela. Entonces lo vio: las letras invisibles aflorando entre líneas, escritas con tinta de medusa, el viejo truco de los contrabandistas del norte.

—No deberías tener esto —dijo Lyra desde la puerta, sin apartar los ojos del muelle oscuro al otro lado de la ventana.`

const REWRITTEN_TEXT = `El pergamino desprendía un olor a sal entremezclado con algo más punzante, algo que Dorian no supo nombrar hasta que la llama de la vela rozó el papel. Fue entonces cuando las vio: las letras ocultas que emergían entre líneas como fantasmas, trazadas con tinta de medusa, la vieja artimaña favorita de los contrabandistas del norte.

—No deberías tener eso —murmuró Lyra sin moverse de la puerta, los ojos fijos en el muelle en sombras que se extendía al otro lado del cristal.`

const QUICK_GOALS = [
  { id: 'style',     label: 'Estilo',    icon: Pencil,     desc: 'Cambiar el estilo literario' },
  { id: 'tone',      label: 'Tono',      icon: Type,       desc: 'Ajustar el tono emocional' },
  { id: 'character', label: 'Personaje', icon: User,       desc: 'Reescribir según el POV (voz del personaje)' },
  { id: 'length',    label: 'Longitud',  icon: Minimize2,  desc: 'Acortar o alargar el texto' },
  { id: 'clarity',   label: 'Claridad',  icon: Lightbulb,  desc: 'Mejorar la claridad' },
  { id: 'rhythm',    label: 'Ritmo',     icon: Zap,        desc: 'Mejorar el ritmo narrativo' },
  { id: 'cohesion',  label: 'Cohesión',  icon: AlignLeft,  desc: 'Mejorar la cohesión' },
]

const AI_AGENTS = {
  editor:    { id: 'editor',    name: 'Editor',    color: '#6b9fd4', bgColor: 'rgba(107,159,212,0.12)', initials: 'ED', desc: 'Estructura y narrativa' },
  critic:    { id: 'critic',    name: 'Crítico',   color: '#e07070', bgColor: 'rgba(224,112,112,0.12)', initials: 'CR', desc: 'Análisis y valoración' },
  corrector: { id: 'corrector', name: 'Corrector', color: '#5cb98a', bgColor: 'rgba(92,185,138,0.12)',  initials: 'CO', desc: 'Gramática y estilo' },
}

const MOCK_MESSAGES = [
  {
    id: 1, role: 'user',
    text: '¿Cómo veis la escena de la taberna en el capítulo 2? Siento que le falta tensión.',
    time: '15:02',
  },
  {
    id: 2, role: 'agent', agent: 'editor',
    text: 'La escena tiene un buen punto de partida, pero creo que el problema está en que entramos demasiado tarde. Si empezáramos cuando Dorian ya lleva un rato observando a Lyra sin acercarse, la tensión llegaría de forma más orgánica antes de que hablen.',
    time: '15:02',
  },
  {
    id: 3, role: 'agent', agent: 'critic',
    text: 'Coincido con el diagnóstico, aunque señalaría algo diferente: la taberna como espacio está infrautilizada. En la fantasía épica, los espacios cerrados y ruidosos son perfectos para conversaciones íntimas que contrastan con el caos ambiente. Ahora mismo es decorado, no personaje.',
    time: '15:03',
  },
  {
    id: 4, role: 'agent', agent: 'corrector',
    text: 'Desde el punto de vista del estilo, la frase "Dorian había bebido suficiente para olvidar pero no tanto como para no recordar" es un trabalenguas. Sugiero: "Había bebido lo justo para querer olvidar, pero no lo suficiente para conseguirlo."',
    time: '15:03',
  },
  {
    id: 5, role: 'user',
    text: '¿Y qué hacemos con el momento en que Lyra reconoce el mapa? ¿Lo muestro demasiado pronto?',
    time: '15:06',
  },
  {
    id: 6, role: 'agent', agent: 'editor',
    text: 'Sí, creo que sí. Ese reconocimiento debería ser el clímax emocional del capítulo, pero ahora ocurre casi de pasada. Te propongo trasladarlo al final de la escena, justo cuando el lector ya ha bajado la guardia. El efecto sería mucho más potente.',
    time: '15:06',
  },
  {
    id: 7, role: 'agent', agent: 'critic',
    text: 'Totalmente de acuerdo. Además, ese momento de reconocimiento puede funcionar como un gancho perfecto para el siguiente capítulo sin necesidad de un cliffhanger forzado. El lector cierra el capítulo con una pregunta implícita, no con una explosión.',
    time: '15:07',
  },
]

// ─── Sub-components ───────────────────────────────────────────

function AgentAvatar({ agentId, size = 28 }) {
  const agent = AI_AGENTS[agentId]
  if (!agent) return null
  return (
    <div
      className="agent-avatar"
      style={{
        width: size, height: size,
        fontSize: size < 30 ? 9 : 11,
        background: agent.bgColor,
        border: `1.5px solid ${agent.color}44`,
        color: agent.color,
      }}
      title={agent.name}
    >
      {agent.initials}
    </div>
  )
}

// ─── Tab: Rewrite ─────────────────────────────────────────────
function RewriteTab({ activeScene }) {
  const { 
    selection, provider, apiKey, localBaseUrl, prompts, currentModel,
    lastRewrite, setLastRewrite, updatePrompt 
  } = useAI();
  const { resources } = useNovel();
  const { openModal } = useModal();
  
  const [instruction, setInstruction] = useState('')
  const [activeGoal, setActiveGoal] = useState('style')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleRewrite = async () => {
    if (!selection) {
      openModal('confirm', {
        title: 'Selección vacía',
        message: 'Por favor, selecciona un texto en el editor primero para que la IA tenga algo que procesar.',
        confirmLabel: 'Entendido',
        onConfirm: () => {}
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      const activeRes = resources?.filter(r => r.activeForAI && r.content) || [];
      const knowledgeBase = activeRes.length > 0 
        ? activeRes.map(r => `Archivo: [${r.name}]\nContenido:\n${r.content}`).join('\n\n')
        : null;

      const result = await AIService.rewrite(selection, activeGoal, prompts[activeGoal], {
        provider,
        apiKey,
        model: currentModel,
        localBaseUrl,
        customInstructions: instruction,
        pov: activeScene?.pov,
        knowledgeBase
      });
      setLastRewrite(result);
    } catch (error) {
      openModal('confirm', {
        title: 'Error de IA',
        message: `Hubo un problema al contactar con el proveedor: ${error.message}`,
        confirmLabel: 'Cerrar',
        onConfirm: () => {}
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!lastRewrite) return;
    const event = new CustomEvent('ai-apply-rewrite', { detail: lastRewrite });
    window.dispatchEvent(event);
    // Limpiar el resultado después de aplicar para evitar duplicados y cerrar la vista de resultado
    setLastRewrite('');
    setInstruction('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(lastRewrite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rewrite-tab">
      {/* Original text */}
      <div className="rewrite-section">
        <div className="rewrite-section__label">
          <AlignLeft size={12} />
          Texto seleccionado
          <span className="rewrite-section__meta">
            {activeScene ? `${activeScene.title}` : 'Ninguna escena seleccionada'}
          </span>
        </div>
        <div className={`rewrite-original ${!selection ? 'rewrite-original--empty' : ''}`}>
          {selection || 'Selecciona un texto en el editor para comenzar a reescribir...'}
        </div>
      </div>

      {/* Quick goals */}
      <div className="rewrite-section">
        <div className="rewrite-section__label">
          <Zap size={12} />
          Objetivo rápido
          <button 
            className="rewrite-section__edit-prompt" 
            onClick={() => setIsEditingPrompt(!isEditingPrompt)}
            title="Editar prompt base"
          >
            {isEditingPrompt ? 'Cerrar editor' : 'Ver prompt'}
          </button>
        </div>
        
        {isEditingPrompt && (
          <div className="prompt-editor">
            <textarea 
              className="prompt-editor__textarea"
              value={prompts[activeGoal]}
              onChange={(e) => updatePrompt(activeGoal, e.target.value)}
              rows={3}
            />
            <p className="prompt-editor__hint">
              Puedes usar [TONO], [LONGITUD] o [PERSONAJE] como variables.
            </p>
          </div>
        )}

        <div className="rewrite-goals">
          {QUICK_GOALS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`rewrite-goal-${id}`}
              className={`rewrite-goal ${activeGoal === id ? 'rewrite-goal--active' : ''}`}
              onClick={() => setActiveGoal(id)}
              title={QUICK_GOALS.find(g => g.id === id)?.desc}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom instruction */}
      <div className="rewrite-section">
        <div className="rewrite-section__label">
          <Pencil size={12} />
          Instrucción personalizada
        </div>
        <div className="rewrite-instruction">
          <textarea
            id="rewrite-instruction-input"
            className="rewrite-instruction__textarea"
            placeholder={
              activeGoal === 'tone' ? 'Ej: melancólico, eufórico, sarcástico...' :
              activeGoal === 'length' ? 'Ej: mucho más corto, un párrafo extenso...' :
              'Ej: hazlo más tenso y cinematográfico...'
            }
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="rewrite-actions">
        <button className="btn btn-ghost" id="rewrite-clear-btn" onClick={() => { setInstruction(''); setLastRewrite(''); }}>
          <RotateCcw size={12} />
          Limpiar
        </button>
        <button 
          className="btn btn-primary rewrite-actions__main" 
          id="rewrite-submit-btn" 
          onClick={handleRewrite}
          disabled={isGenerating || !selection}
        >
          {isGenerating ? <RefreshCw size={13} className="spinner" /> : <Wand2 size={13} />}
          {isGenerating ? 'Generando...' : 'Reescribir'}
        </button>
      </div>

      {/* Result */}
      {lastRewrite && (
        <div className="rewrite-result">
          <div className="rewrite-result__header">
            <div className="rewrite-result__label">
              <Sparkles size={12} />
              Propuesta de reescritura
            </div>
            <div className="rewrite-result__actions">
              <button
                className="res-action-btn"
                id="rewrite-copy-btn"
                onClick={handleCopy}
                title="Copiar"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              <button className="res-action-btn" id="rewrite-refresh-btn" title="Regenerar" onClick={handleRewrite}>
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
          <div className="rewrite-result__text">
            {lastRewrite}
          </div>
          <div className="rewrite-result__footer">
            <span className="rewrite-result__goal-tag">
              <Zap size={10} /> {QUICK_GOALS.find(g => g.id === activeGoal)?.label} aplicado
            </span>
          </div>
          <div className="rewrite-result__apply">
            <button className="btn btn-ghost" style={{ flex: 1 }} id="rewrite-discard-btn" onClick={() => setLastRewrite('')}>
              Descartar
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} id="rewrite-apply-btn" onClick={handleApply}>
              <Check size={13} />
              Aplicar cambio
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Debate forum ────────────────────────────────────────
function DebateTab({ activeScene }) {
  const {
    provider, apiKey, localBaseUrl, currentModel,
    debateAgents, debateHistory,
    addDebateMessage, clearDebateHistory,
    toggleDebateAgent, updateDebateAgent, addDebateAgent, removeDebateAgent,
    debateSessions, activeSessionId, switchDebateSession, renameDebateSession, deleteDebateSession, addDebateSession
  } = useAI()
  const { resources } = useNovel()
  const { openModal } = useModal()

  const [input, setInput] = useState('')
  const [loadingAgents, setLoadingAgents] = useState({}) // { agentId: true/false }
  const [view, setView] = useState('chat') // 'chat' | 'agents'
  const [editingAgent, setEditingAgent] = useState(null) // agent id being edited
  const [newAgent, setNewAgent] = useState(null) // draft for new agent
  const [useSceneContext, setUseSceneContext] = useState(true)
  const [rounds, setRounds] = useState(1)
  const messagesEndRef = useRef(null)

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

  const handleSend = async () => {
    if (!input.trim() || isAnyLoading) return
    const text = input.trim()
    setInput('')

    const userMsg = {
      role: 'user',
      text,
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    }
    addDebateMessage(userMsg)

    // Fire each active agent sequentially for N rounds
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
              roundInstruction = `(NOTA DE SISTEMA: Ronda 1 de ${rounds}. Aún quedan más rondas, da tu opinión inicial e invita a los demás a debatirla).`
            } else if (r === rounds - 1) {
              roundInstruction = `(NOTA DE SISTEMA: Ronda FINAL ${r + 1} de ${rounds}. Trata de acercar posturas o sacar una conclusión definitiva basándote en lo que han dicho tus compañeros).`
            } else {
              roundInstruction = `(NOTA DE SISTEMA: Ronda ${r + 1} de ${rounds}. Lee a tus compañeros y responde, rebate o construye sobre sus argumentos).`
            }
          }

          const activeRes = resources?.filter(res => res.activeForAI && res.content) || [];
          const knowledgeBase = activeRes.length > 0 
            ? activeRes.map(res => `Archivo: [${res.name}]\nContenido:\n${res.content}`).join('\n\n')
            : null;

          const response = await AIService.agentChat(agent, historyWithUser, {
            provider, apiKey, model: currentModel, localBaseUrl, sceneContent, pov, roundInstruction, knowledgeBase
          })

          const agentMsg = {
            role: 'agent',
            agent: agent.id,
            agentName: agent.name,
            agentColor: agent.color,
            agentInitials: agent.initials,
            text: response,
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

  // ── Agent Management ────────────────────────────────────────
  const AGENT_COLORS = ['#6b9fd4','#e07070','#5cb98a','#c59de0','#e0b870','#70d4e0','#e070b8']
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
      systemPrompt: newAgent.systemPrompt || `Eres un asistente especializado en escritura creativa llamado ${newAgent.name}. Responde siempre en español y de forma concisa.`,
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
            ← Volver al debate
          </button>
          <span className="debate-manage-title">Gestionar participantes</span>
        </div>

        {/* Edit form for a specific agent */}
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
                      <div className="debate-agent-card__desc">{agent.desc || 'Sin descripción'}</div>
                    </div>
                  </div>
                  <div className="debate-agent-card__actions">
                    <button className="debate-agent-card__btn" onClick={() => setEditingAgent(agent.id)} title="Editar">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost debate-add-agent-btn" onClick={() => setNewAgent({})}>
              + Añadir participante
            </button>
          </>
        )}
      </div>
    )
  }

  // ── View: Chat ─────────────────────────────────────────────
  return (
    <div className="debate-tab">
      {/* Toolbar */}
      <div className="debate-toolbar">
        <div className="debate-agents__list">
          {debateAgents.map(agent => (
            <button
              key={agent.id}
              id={`debate-agent-${agent.id}`}
              className={`debate-agent-btn ${agent.active ? 'debate-agent-btn--active' : ''}`}
              style={agent.active ? { borderColor: agent.color + '60', background: agent.color + '18', color: agent.color } : {}}
              onClick={() => toggleDebateAgent(agent.id)}
              title={`${agent.name} — click para activar/desactivar`}
            >
              <span className="debate-agent-btn__avatar" style={{ background: agent.color + '30', color: agent.color }}>
                {agent.initials}
              </span>
              <span>{agent.name}</span>
            </button>
          ))}
        </div>
        <div className="debate-toolbar__actions">
          {/* Sessions Dropdown */}
          <div className="debate-sessions-wrapper" ref={dropdownRef}>
            <button className="debate-sessions-trigger" onClick={() => setSessionsMenuOpen(!sessionsMenuOpen)} title="Cambiar de chat">
              <MessageSquare size={13} />
              <span className="debate-sessions-truncate">{activeSessionTitle}</span>
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>

            {sessionsMenuOpen && (
              <div className="debate-sessions-dropdown">
                <button 
                  className="debate-session-new-btn"
                  onClick={() => { addDebateSession(); setSessionsMenuOpen(false); }}
                >
                  <span>+ Nuevo debate</span>
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
                        <button 
                          className="debate-session-action-btn"
                          title="Renombrar chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionEditTitle(session.title);
                            setSessionEditingId(session.id);
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                        <button 
                          className="debate-session-action-btn"
                          title="Borrar chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal('confirm', {
                              title: 'Borrar chat',
                              message: `¿Seguro que quieres borrar el historial de "${session.title}" permanentemente?`,
                              isDanger: true,
                              confirmLabel: 'Borrar Chat',
                              onConfirm: () => deleteDebateSession(session.id)
                            });
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="debate-rounds" title="Número de veces que los agentes se responderán entre sí">
            <RotateCcw size={13} strokeWidth={2.5} />
            <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
          <button
            className={`debate-context-btn ${useSceneContext ? 'debate-context-btn--active' : ''}`}
            onClick={() => setUseSceneContext(p => !p)}
            title={useSceneContext ? 'Desactivar contexto de escena' : 'Activar contexto de escena actual'}
          >
            <AlignLeft size={13} />
          </button>
          <button className="debate-manage-btn" onClick={() => setView('agents')} title="Gestionar participantes">
            <MoreHorizontal size={15} />
          </button>
          {debateHistory.length > 0 && (
            <button
              className="debate-clear-btn"
              onClick={() => {
                openModal('confirm', {
                  title: 'Limpiar chat',
                  message: '¿Estás seguro de que quieres borrar todo el historial de este debate?',
                  isDanger: true,
                  confirmLabel: 'Limpiar Todo',
                  onConfirm: () => clearDebateHistory()
                });
              }}
              title="Borrar historial"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="debate-messages" id="debate-messages-container">
        {debateHistory.length === 0 && (
          <div className="debate-empty">
            <MessageSquare size={28} />
            <p>Escribe una pregunta o pega un fragmento de tu novela para comenzar el debate.</p>
            {activeScene && useSceneContext && (
              <span className="debate-context-tag">
                <AlignLeft size={11} /> Con contexto: {activeScene.title}
              </span>
            )}
          </div>
        )}
        {debateHistory.map(msg => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="debate-msg debate-msg--user">
                <div className="debate-msg__bubble debate-msg__bubble--user">{msg.text}</div>
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
                <span><strong>{msg.agentName}:</strong> {msg.text}</span>
              </div>
            )
          }
          const color = msg.agentColor || '#888'
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
                {msg.text}
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
                <span className="debate-msg__time">escribiendo...</span>
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
          placeholder={activeAgents.length === 0 ? 'Activa al menos un participante...' : 'Escribe tu pregunta o pega un fragmento...'}
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
      <span className="debate-input-hint">Enter para enviar · Shift+Enter para nueva línea</span>
    </div>
  )
}

// ─── Agent Edit Form ──────────────────────────────────────────
function AgentEditForm({ agent, colors, onSave, onCancel, isNew, canDelete, onDelete }) {
  const [form, setForm] = useState({ ...agent })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  return (
    <div className="agent-edit-form">
      <div className="agent-edit-form__row">
        <div className="debate-agent-card__avatar" style={{ background: form.color + '30', color: form.color, fontSize: 14, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
          {(form.initials || form.name?.slice(0, 2) || '??').toUpperCase()}
        </div>
        <input className="agent-edit-form__input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre del participante" />
      </div>
      <input className="agent-edit-form__input" value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="Descripción breve (ej: Estructura y narrativa)" />
      <div className="agent-edit-form__colors">
        {colors.map(c => (
          <button key={c} className={`agent-color-dot ${form.color === c ? 'agent-color-dot--active' : ''}`} style={{ background: c, outlineColor: c }} onClick={() => set('color', c)} />
        ))}
      </div>
      <label className="agent-edit-form__label">System Prompt</label>
      <textarea className="agent-edit-form__prompt" value={form.systemPrompt} onChange={e => set('systemPrompt', e.target.value)} rows={7} placeholder="Define la personalidad y el rol de este agente..." />
      <p className="agent-edit-form__hint">El prompt define cómo responde el agente. Puedes indicar su especialidad, tono, formato de respuesta y cualquier instrucción adicional.</p>
      <div className="agent-edit-form__footer">
        {!isNew && canDelete && (
          <button className="btn btn-ghost btn-danger-ghost" onClick={() => {
            openModal('confirm', {
              title: 'Eliminar Participante',
              message: `¿Seguro que quieres eliminar a ${agent.name} del foro de debate?`,
              isDanger: true,
              confirmLabel: 'Eliminar',
              onConfirm: onDelete
            });
          }}>Eliminar</button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onSave(form)}>
          {isNew ? 'Crear participante' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ─── Main AI Panel ────────────────────────────────────────────
export default function AIPanel({ open, onClose, activeScene, onOpenSettings }) {
  const { openModal } = useModal()
  const [activeTab, setActiveTab] = useState('rewrite')
  const { apiKey, currentModel } = useAI()

  return (
    <>
      <div className={`ai-panel ${open ? 'ai-panel--open' : ''}`} id="ai-panel">
        {/* Panel header */}
        <div className="ai-panel__header">
          <div className="ai-panel__header-left">
            <Sparkles size={15} className="ai-panel__header-icon" />
            <span className="ai-panel__header-title">Asistente IA</span>
          </div>
          
          <div className="ai-panel__header-right">
            <button 
              className={`ai-panel__api-btn ${!apiKey ? 'needs-key' : ''}`}
              onClick={() => onOpenSettings('ia')}
              title="Configurar API"
            >
              <Key size={13} />
              <span className="ai-panel__api-btn-text" style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentModel || 'API'}
              </span>
            </button>
            <button className="ai-panel__close" id="ai-panel-close-btn" onClick={onClose} aria-label="Cerrar panel IA">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* API settings logic moved to global SettingsModal */}

        {/* Tabs */}
        <div className="ai-panel__tabs">
          <button
            id="ai-tab-rewrite"
            className={`ai-panel__tab ${activeTab === 'rewrite' ? 'ai-panel__tab--active' : ''}`}
            onClick={() => setActiveTab('rewrite')}
          >
            <Wand2 size={13} />
            Reescribir
          </button>
          <button
            id="ai-tab-debate"
            className={`ai-panel__tab ${activeTab === 'debate' ? 'ai-panel__tab--active' : ''}`}
            onClick={() => setActiveTab('debate')}
          >
            <MessageSquare size={13} />
            Foro de debate
          </button>
        </div>

        {/* Tab content */}
        <div className="ai-panel__content">
          {activeTab === 'rewrite' && <RewriteTab activeScene={activeScene} />}
          {activeTab === 'debate' && <DebateTab activeScene={activeScene} />}
        </div>
      </div>
    </>
  )
}
