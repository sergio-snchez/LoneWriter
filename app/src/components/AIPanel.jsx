/** LoneWriter AI Panel */
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/i18n'
import {
  Sparkles, MessageSquare, X, ChevronRight, ChevronLeft,
  Wand2, Send, RefreshCw, Copy, Check, RotateCcw, Trash2,
  User, Pencil, AlertTriangle, CheckCheck, Bot,
  Lightbulb, Zap, AlignLeft, Type, Minimize2, Maximize2, Globe,
  ChevronDown, MoreHorizontal, ThumbsUp, ThumbsDown, Key, Save, BookOpen, Eye, Loader2
} from 'lucide-react'
import { useAI } from '../context/AIContext'
import { AIService } from '../services/aiService'
import { useNovel } from '../context/NovelContext'
import { useModal } from '../context/ModalContext'
import { createDebouncedSearch, fetchDetectedEntityData } from '../services/compendiumSearch'
import { retrieveRelevantFragments } from '../services/ragService'
import { Tooltip } from './Tooltip'
import { renderMarkdown } from '../utils/renderMarkdown'
import './AIPanel.css'

const normalizeHtmlForEditor = (html) => {
  return html
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br/>')
    .replace(/\n\n+/g, '\n')
    .trim();
}

const normalizeTextForDisplay = (text) => {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+|\s+$/g, '');
}

function extractPreviousContext(content, selection, maxWords = 120) {
  if (!content || !selection) return null;

  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const selectionLower = selection.toLowerCase();
  const plainLower = plainText.toLowerCase();

  const selectionIndex = plainLower.indexOf(selectionLower);
  if (selectionIndex === -1) return null;

  const textBefore = plainText.substring(0, selectionIndex);
  const wordsBefore = textBefore.split(/\s+/).filter(w => w.length > 0);

  if (wordsBefore.length === 0) return null;

  const startIndex = Math.max(0, wordsBefore.length - maxWords);
  const contextWords = wordsBefore.slice(startIndex);

  return contextWords.join(' ');
}

// ─── Mock data ────────────────────────────────────────────────
const ORIGINAL_TEXT = `El pergamino olía a sal y algo más, algo acre que Dorian no supo identificar hasta que acercó la llama de la vela. Entonces lo vio: las letras invisibles aflorando entre líneas, escritas con tinta de medusa, el viejo truco de los contrabandistas del norte.

—No deberías tener esto —dijo Lyra desde la puerta, sin apartar los ojos del muelle oscuro al otro lado de la ventana.`

const REWRITTEN_TEXT = `El pergamino desprendía un olor a sal entremezclado con algo más punzante, algo que Dorian no supo nombrar hasta que la llama de la vela rozó el papel. Fue entonces cuando las vio: las letras ocultas que emergían entre líneas como fantasmas, trazadas con tinta de medusa, la vieja artimaña favorita de los contrabandistas del norte.

—No deberías tener eso —murmuró Lyra sin moverse de la puerta, los ojos fijos en el muelle en sombras que se extendía al otro lado del cristal.`

const QUICK_GOALS = [
  { id: 'style', label: 'estilo', icon: Pencil, desc: 'estilo_desc' },
  { id: 'language', label: 'idioma', icon: Globe, desc: 'idioma_desc' },
  { id: 'character', label: 'personaje', icon: User, desc: 'personaje_desc' },
  { id: 'length', label: 'longitud', icon: Minimize2, desc: 'longitud_desc' },
  { id: 'clarity', label: 'claridad', icon: Lightbulb, desc: 'claridad_desc' },
  { id: 'tone', label: 'tono', icon: Type, desc: 'tono_desc' },
  { id: 'rhythm', label: 'ritmo', icon: Zap, desc: 'ritmo_desc' },
  { id: 'cohesion', label: 'cohesion', icon: AlignLeft, desc: 'cohesion_desc' },
]

const AI_AGENTS = {
  editor: { id: 'editor', name: 'Editor', color: '#6b9fd4', bgColor: 'rgba(107,159,212,0.12)', initials: 'ED', desc: 'Estructura y narrativa' },
  critic: { id: 'critic', name: 'Crítico', color: '#e07070', bgColor: 'rgba(224,112,112,0.12)', initials: 'CR', desc: 'Análisis y valoración' },
  corrector: { id: 'corrector', name: 'Corrector', color: '#5cb98a', bgColor: 'rgba(92,185,138,0.12)', initials: 'CO', desc: 'Gramática y estilo' },
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
    <Tooltip content={agent.name}>
      <div
        className="agent-avatar"
        style={{
          width: size, height: size,
          fontSize: size < 30 ? 9 : 11,
          background: agent.bgColor,
          border: `1.5px solid ${agent.color}44`,
          color: agent.color,
        }}
      >
        {agent.initials}
      </div>
    </Tooltip>
  )
}

// ─── Tab: Rewrite ─────────────────────────────────────────────
function RewriteTab({ activeScene }) {
  const { t } = useTranslation('ai')
  const {
    selection, provider, apiKey, localBaseUrl, prompts, currentModel,
    lastRewrite, setLastRewrite, saveLastRewrite, discardLastRewrite, updatePrompt,
    logAIUsage, oracleStatus
  } = useAI();
  const { resources } = useNovel();
  const { openModal } = useModal();

  const [instruction, setInstruction] = useState('')
  const [activeGoal, setActiveGoal] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [includePreviousContext, setIncludePreviousContext] = useState(true)

  const handleRewrite = async () => {
    if (!selection) {
      openModal('confirm', {
        title: t('rewrite.seleccion_vacia_titulo'),
        message: t('rewrite.seleccion_vacia_mensaje'),
        confirmLabel: t('rewrite.seleccion_vacia_boton'),
        onConfirm: () => { }
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log('[Rewrite] Reescribiendo escena', activeScene?.id, '— objetivo:', activeGoal);
      const activeRes = resources?.filter(r => r.activeForAI && r.content) || [];
      const knowledgeBase = activeRes.length > 0
        ? activeRes.map(r => `Archivo: [${r.name}]\nContenido:\n${r.content}`).join('\n\n')
        : null;

      const previousContext = includePreviousContext
        ? extractPreviousContext(activeScene?.content, selection, 120)
        : null;

      console.log('[Rewrite] previousContext:', previousContext ? `${previousContext.substring(0, 80)}...` : 'null');


      const response = await AIService.rewrite(selection, activeGoal, instruction ? "" : (activeGoal ? prompts[activeGoal] : ""), {
        provider,
        apiKey,
        model: currentModel,
        localBaseUrl,
        customInstructions: instruction,
        pov: activeScene?.pov,
        knowledgeBase,
        previousContext,
      });
      logAIUsage(response.usage);
      saveLastRewrite(response.text, activeGoal, instruction, selection);
    } catch (error) {
      openModal('confirm', {
        title: t('rewrite.error_ia_titulo'),
        message: t('rewrite.error_ia_mensaje', { error: error.message }),
        confirmLabel: t('rewrite.error_ia_boton'),
        onConfirm: () => { }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!lastRewrite) return;
    const normalizedContent = normalizeHtmlForEditor(lastRewrite);
    const event = new CustomEvent('ai-apply-rewrite', { detail: normalizedContent });
    window.dispatchEvent(event);
    setLastRewrite('');
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
          {t('rewrite.texto_seleccionado')}
          <span className="rewrite-section__meta">
            {activeScene ? `${activeScene.title}` : t('rewrite.ninguna_escena')}
          </span>
        </div>
        <div className={`rewrite-original ${!selection ? 'rewrite-original--empty' : ''}`}>
          {selection || t('rewrite.seleccionar_placeholder')}
        </div>
      </div>

      {/* Quick goals */}
      <div className="rewrite-section">
        <div className="rewrite-section__label">
          <Zap size={12} />
          {t('rewrite.objetivo_rapido')}
        </div>

        <div className="rewrite-goals">
          {QUICK_GOALS.map(({ id, label, icon: Icon, desc }) => (
            <Tooltip key={id} content={t(`objetivos.${desc}`)}>
              <button
                id={`rewrite-goal-${id}`}
                className={`rewrite-goal ${activeGoal === id ? 'rewrite-goal--active' : ''}`}
                onClick={() => {
                  setActiveGoal(id);
                  // Populate the instruction textarea with the prompt template
                  const template = prompts[id] || '';
                  const isSpanish = i18n.language === 'es';
                  const defaultTone = isSpanish ? 'más dramático' : 'more dramatic';
                  const defaultLength = isSpanish ? 'conciso' : 'concise';
                  const defaultChar = activeScene?.pov || (isSpanish ? 'el protagonista' : 'the protagonist');

                  const processed = template
                    .replace(/\[TONO\]/g, defaultTone).replace(/\[TONE\]/g, defaultTone)
                    .replace(/\[LONGITUD\]/g, defaultLength).replace(/\[LENGTH\]/g, defaultLength)
                    .replace(/\[PERSONAJE\]/g, defaultChar).replace(/\[CHARACTER\]/g, defaultChar);

                  setInstruction(processed);
                }}
              >
                <Icon size={11} />
                {t(`objetivos.${label}`)}
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Context toggle */}
        <div className="rewrite-context-toggle">
          <label className="context-toggle-label">
            <input
              type="checkbox"
              checked={includePreviousContext}
              onChange={(e) => setIncludePreviousContext(e.target.checked)}
            />
            <span>{t('rewrite.include_context')}</span>
          </label>
        </div>
      </div>

      {/* Custom instruction */}
      <div className="rewrite-section">
        <div className="rewrite-section__label">
          <Pencil size={12} />
          {t('rewrite.instruccion_personalizada')}
        </div>
        <div className="rewrite-instruction">
          <textarea
            id="rewrite-instruction-input"
            className="rewrite-instruction__textarea"
            placeholder={
              activeGoal === 'tone' ? t('rewrite.instruccion_tono') :
                activeGoal === 'language' ? t('rewrite.instruccion_idioma') :
                  activeGoal === 'length' ? t('rewrite.instruccion_longitud') :
                    t('rewrite.instruccion_defecto')
            }
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="rewrite-actions">
        <button
          className="btn btn-primary rewrite-actions__main"
          id="rewrite-submit-btn"
          onClick={handleRewrite}
          disabled={isGenerating || !selection}
        >
          {isGenerating ? <RefreshCw size={13} className="spinner rewrite-spinner" /> : <Wand2 size={13} />}
          {isGenerating ? t('rewrite.generando') : t('rewrite.reescribir')}
        </button>
      </div>

      {/* Result */}
      {lastRewrite && (
        <div className="rewrite-result">
          <div className="rewrite-result__header">
            <div className="rewrite-result__label">
              <Sparkles size={12} />
              {t('rewrite.propuesta')}
            </div>
            <div className="rewrite-result__actions">
              <Tooltip content="Copiar">
                <button
                  className="res-action-btn"
                  id="rewrite-copy-btn"
                  onClick={handleCopy}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </Tooltip>
              <Tooltip content="Regenerar">
                <button className="res-action-btn" id="rewrite-refresh-btn" onClick={handleRewrite}>
                  <RefreshCw size={12} />
                </button>
              </Tooltip>
            </div>
          </div>
          <div className="rewrite-result__text" dangerouslySetInnerHTML={{ __html: renderMarkdown(lastRewrite) }}></div>
          <div className="rewrite-result__footer">
            <span className="rewrite-result__goal-tag">
              <Zap size={10} /> {t('rewrite.aplicado', { goal: t(`objetivos.${QUICK_GOALS.find(g => g.id === activeGoal)?.label}`) })}
            </span>
          </div>
          <div className="rewrite-result__apply">
            <button className="btn btn-ghost" style={{ flex: 1 }} id="rewrite-discard-btn" onClick={() => {
              openModal('confirm', {
                title: t('rewrite.descartar_titulo'),
                message: t('rewrite.descartar_mensaje'),
                isDanger: true,
                confirmLabel: t('rewrite.descartar_boton'),
                onConfirm: () => discardLastRewrite()
              });
            }}>
              <Trash2 size={12} />
              {t('rewrite.descartar')}
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} id="rewrite-apply-btn" onClick={handleApply}>
              <Check size={13} />
              {t('rewrite.aplicar')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Debate forum ────────────────────────────────────────
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

  // ── Agent Management ────────────────────────────────────────
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

  // ── View: Chat ─────────────────────────────────────────────
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

// ─── Tab: Oracle ──────────────────────────────────────────────
function OracleTab({ activeScene }) {
  const { t } = useTranslation('ai')
  const {
    provider, apiKey, localBaseUrl, currentModel,
    oracleHistory, addOracleEntry, clearOracleHistory,
    deleteOracleEntry, toggleOracleCorrected, checkedEntries,
    oracleStatus, checkOracleResponse, resetOracleStatus,
    logAIUsage
  } = useAI()
  const { activeNovel, acts } = useNovel()
  const { openModal } = useModal()

  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [compContextUsed, setCompContextUsed] = useState('')
  const [expandedEntries, setExpandedEntries] = useState(new Set())
  const [isSaliencyExpanded, setIsSaliencyExpanded] = useState(false)
  const [isEntitiesExpanded, setIsEntitiesExpanded] = useState(true)
  const historyEndRef = useRef(null)

  const getChapterInfo = (chapterId) => {
    if (!chapterId || !acts) return null
    for (const act of acts) {
      if (!act.chapters) continue
      const ch = act.chapters.find(c => c.id === chapterId)
      if (ch) return { number: ch.number, title: ch.title }
    }
    return null
  }

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [oracleHistory])

  const stripJsonBlock = (text) => {
    let cleaned = text.replace(/\{[\s\S]*"hasContradiction"[\s\S]*\}/g, '').trim();
    cleaned = normalizeTextForDisplay(cleaned);
    return cleaned;
  }

  const handleCheck = async () => {
    if (!activeScene?.content) {
      setError(t('oraculo.error_sin_texto'))
      return
    }
    if (!apiKey && provider !== 'local') {
      setError(t('oraculo.error_api'))
      return
    }

    setIsChecking(true)
    setError('')

    try {

      const plainText = activeScene.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

      if (!plainText || plainText.length < 10) {
        setError(t('oraculo.error_corto'))
        setIsChecking(false)
        return
      }

      // ── Run compendium + RAG in parallel, with a max 15s timeout on RAG ──
      const ragTimeout = new Promise(resolve =>
        setTimeout(() => resolve([]), 15000)
      )


      const [compResult, ragResult] = await Promise.allSettled([
        // Compendium entity sheets
        (activeNovel && oracleStatus.detectedEntities?.length > 0)
          ? (async () => {
            try {
              return await fetchDetectedEntityData(oracleStatus.detectedEntities, activeNovel.id);
            } catch (e) {
              console.error('[Oracle] fetchDetectedEntityData error:', e);
              return '';
            }
          })()
          : Promise.resolve(''),
        // RAG context (capped at 15s so it never blocks)
        activeNovel?.id
          ? Promise.race([retrieveRelevantFragments(plainText, activeNovel.id, 4, activeScene?.id), ragTimeout])
          : Promise.resolve([])
      ])

      const compendiumInfo = compResult.status === 'fulfilled' ? (compResult.value || '') : ''
      setCompContextUsed(compendiumInfo)

      const fragments = ragResult.status === 'fulfilled' ? (ragResult.value || []) : []
      if (ragResult.status === 'rejected') {
        console.warn('[RAG] Retrieval failed (proceeding without it):', ragResult.reason)
      }
      const ragContext = fragments.length > 0
        ? fragments.map((f, i) => `[Fragmento ${i + 1}]: ${f}`).join('\n\n')
        : ''

      const oraclePrompt = t('oracle_prompt')
      const isSpanish = i18n.language === 'es'

      const oracleCompendium = isSpanish ? '--- TEXTO DEL COMPENDIO (FUENTE DE VERDAD ABSOLUTA) ---' : '--- COMPENDIUM TEXT (ABSOLUTE SOURCE OF TRUTH) ---';
      const oraclePrevCtx = isSpanish ? '--- CONTEXTO ANTERIOR DEL MANUSCRITO (SOLO COMO REFERENCIA, NUNCA DESMIENTE AL COMPENDIO) ---' : '--- PREVIOUS MANUSCRIPT CONTEXT (ONLY AS REFERENCE, NEVER DISPUTE THE COMPENDIUM) ---';
      const oracleNoComp = isSpanish ? 'No se encontraron fichas relevantes del Compendio para este texto.' : 'No relevant Compendium entries found for this text.';
      const oracleNoPrev = isSpanish ? 'No hay contexto anterior indexado aún (o se está usando sin RAG).' : 'No previous context indexed yet (or RAG is not being used).';
      const oracleText = isSpanish ? '--- TEXTO A ANALIZAR ---' : '--- TEXT TO ANALYZE ---';
      const oracleAnswer = isSpanish ? '--- TU RESPUESTA ---' : '--- YOUR ANSWER ---';



      const fullPrompt = `${oraclePrompt}

${oracleCompendium}
${compendiumInfo || oracleNoComp}

${oraclePrevCtx}
${ragContext || oracleNoPrev}

${oracleText}
${plainText}

${oracleAnswer}`

      const response = await AIService.rewrite(fullPrompt, 'style', '', {
        provider,
        apiKey,
        model: currentModel,
        localBaseUrl,
      })

      logAIUsage(response.usage)

      if (!response.text) {
        throw new Error('La IA no devolvió texto');
      }

      const parsed = checkOracleResponse(response.text)

      const chapterInfo = getChapterInfo(activeScene.chapterId)

      addOracleEntry({
        text: response.text,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        sceneId: activeScene.id,
        sceneTitle: activeScene.title,
        chapterId: activeScene.chapterId || null,
        chapterNumber: chapterInfo?.number || null,
        compendiumUsed: compendiumInfo,
      })
    } catch (err) {
      console.error('[Oracle] Full error:', err);
      setError(t('oraculo.error_consulta', { error: err.message + ' - ' + err.stack }))
    } finally {
      setIsChecking(false)
    }
  }


  const handleCopy = (id) => {
    const entry = oracleHistory.find(e => e.id === id)
    if (!entry) return
    navigator.clipboard.writeText(stripJsonBlock(entry.text))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClear = () => {
    if (oracleHistory.length === 0) return
    openModal('confirm', {
      title: t('oraculo.limpiar_titulo'),
      message: t('oraculo.limpiar_mensaje'),
      isDanger: true,
      confirmLabel: t('oraculo.limpiar_boton'),
      onConfirm: () => clearOracleHistory()
    })
  }

  const handleDeleteEntry = (id) => {
    deleteOracleEntry(id)
    setExpandedEntries(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const toggleChecked = (id) => {
    toggleOracleCorrected(id)
  }

  const toggleExpanded = (id) => {
    setExpandedEntries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="oracle-tab">
      {/* Entidades Detectadas del Compendio — solo si hay entidades */}
      {oracleStatus.detectedEntities?.length > 0 && (
        <div className="oracle-coreference-section">
          <button
            className="oracle-coreference-section__header"
            onClick={() => setIsEntitiesExpanded(!isEntitiesExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer'
            }}
          >
            <span className="oracle-coreference-section__label">{t('oraculo.coincidencias')}</span>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isEntitiesExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>

          {isEntitiesExpanded && (
            <div className="oracle-coreference-chips" style={{ marginTop: '2px' }}>
              {oracleStatus.detectedEntities.filter(e => e?.name).map((e) => (
                <Tooltip key={e.name} content={
                  <div>
                    <strong>{e.name}</strong> ({e.label})
                    <br />
                    {e.matchedTerms?.join(', ')}
                  </div>
                }>
                  <span className={`oracle-entity-tag oracle-entity-tag--hoverable ${oracleStatus.status === 'error' ? 'oracle-entity-tag--error' : ''}`}>
                    {e.name}
                  </span>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      )}

      {activeScene && (
        <span className="oracle-tab__scene-tag">
          <Eye size={11} /> {t('oraculo.escena', { title: activeScene.title })}
        </span>
      )}

      {/* Error */}
      {error && (
        <div className="oracle-tab__error">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* History */}
      <div className="oracle-tab__history">
        {oracleHistory.map(entry => {
          const isExpanded = expandedEntries.has(entry.id)
          const isChecked = checkedEntries.has(entry.id)
          const cleanText = stripJsonBlock(entry.text)
          return (
            <div key={entry.id} className={`oracle-tab__entry ${isChecked ? 'oracle-tab__entry--checked' : ''}`}>
              <div className="oracle-tab__entry-header">
                <div className="oracle-tab__entry-left">
                  <Tooltip content={isChecked ? t('oraculo.marcar_pendiente') : t('oraculo.marcar_corregido')}>
                    <button
                      className="oracle-tab__check-btn"
                      onClick={() => toggleChecked(entry.id)}
                    >
                      {isChecked ? <CheckCheck size={14} /> : <Check size={14} />}
                    </button>
                  </Tooltip>
                  <div className="oracle-tab__entry-info">
                    <div className="oracle-tab__entry-label">
                      <Eye size={12} />
                      {t('oraculo.titulo')}
                    </div>
                    {(entry.chapterNumber || entry.sceneTitle) && (
                      <span className="oracle-tab__entry-location">
                        {entry.chapterNumber ? `Cap. ${entry.chapterNumber}` : t('oraculo.sin_cap')} / {entry.sceneTitle || t('oraculo.sin_escena')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="oracle-tab__entry-meta">
                  <span className="oracle-tab__entry-time">{entry.time}</span>
                  <Tooltip content={t('oraculo.copiar')}>
                    <button
                      className="oracle-tab__action-btn"
                      onClick={() => handleCopy(entry.id)}
                    >
                      {copiedId === entry.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </Tooltip>
                  <Tooltip content={t('oraculo.eliminar')}>
                    <button
                      className="oracle-tab__action-btn oracle-tab__action-btn--delete"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div className={`oracle-tab__entry-text ${isExpanded ? 'oracle-tab__entry-text--expanded' : 'oracle-tab__entry-text--clamped'}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanText) }}>
              </div>
              {cleanText.length > 200 && (
                <button
                  className="oracle-tab__read-more"
                  onClick={() => toggleExpanded(entry.id)}
                >
                  {isExpanded ? t('oraculo.mostrar_menos') : t('oraculo.leer_mas')}
                </button>
              )}
              {entry.compendiumUsed && isExpanded && (
                <details className="oracle-tab__entry-context-details">
                  <summary>{t('oraculo.contexto_compendio')}</summary>
                  <pre className="oracle-tab__context-pre">{entry.compendiumUsed}</pre>
                </details>
              )}
            </div>
          )
        })}

        {/* Loading */}
        {isChecking && (
          <div className="oracle-tab__entry oracle-tab__entry--loading">
            <Loader2 size={16} className="spinner" />
            <span>{t('oraculo.consultando_compendio')}</span>
          </div>
        )}

        <div ref={historyEndRef} />
      </div>

      {/* Compendium context */}
      {compContextUsed && (
        <details className="oracle-tab__context-details">
          <summary>{t('oraculo.contexto_compendio')}</summary>
          <pre className="oracle-tab__context-pre">{compContextUsed}</pre>
        </details>
      )}

      {/* Fixed bottom section */}
      <div className="oracle-tab__bottom">
        <div className="oracle-tab__intro">
          <p>{t('oraculo.intro')}</p>
        </div>
        <div className="oracle-tab__actions">
          <button
            className="btn btn-ghost oracle-tab__clear-btn"
            onClick={handleClear}
            disabled={oracleHistory.length === 0}
          >
            <Trash2 size={12} />
            {t('oraculo.limpiar')}
          </button>
          <button
            className={`btn oracle-tab__check-btn-main ${oracleStatus.status === 'error' ? 'btn-danger' :
              oracleStatus.status === 'suspicious' ? 'oracle-tab__check-btn--alert' :
                'btn-primary'
              }`}
            onClick={handleCheck}
            disabled={isChecking || !activeScene?.content}
          >
            {isChecking ? (
              <>
                <Loader2 size={13} className="spinner" />
                {t('oraculo.consultando')}
              </>
            ) : oracleStatus.status === 'error' ? (
              <>
                <AlertTriangle size={13} />
                {t('oraculo.reconsultar')}
              </>
            ) : oracleStatus.status === 'suspicious' ? (
              <>
                <AlertTriangle size={13} />
                {t('oraculo.consultar')}
              </>
            ) : (
              <>
                <Eye size={13} />
                {t('oraculo.consultar')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main AI Panel ────────────────────────────────────────────
export default function AIPanel({ open, onClose, activeScene, defaultTab = 'rewrite', onOpenSettings }) {
  const { t } = useTranslation('ai')
  const { openModal } = useModal()
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

  const startDrag = (e) => {
    if (window.innerWidth <= 768) return; // Prevent drag on mobile
    dragRef.current = true
    setIsDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.classList.add('no-select')
    e.preventDefault()
  }

  useEffect(() => {
    if (defaultTab && open) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, open]);

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
                <span className="ai-panel__api-btn-text" style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentModel || 'API'}
                </span>
              </button>
            </Tooltip>
            <button className="ai-panel__close" id="ai-panel-close-btn" onClick={onClose} aria-label={t('cerrar')}>
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
            {t('tabs.reescribir')}
          </button>
          <button
            id="ai-tab-debate"
            className={`ai-panel__tab ${activeTab === 'debate' ? 'ai-panel__tab--active' : ''}`}
            onClick={() => setActiveTab('debate')}
          >
            <MessageSquare size={13} />
            {t('tabs.debate')}
          </button>
          <button
            id="ai-tab-oracle"
            className={`ai-panel__tab ${activeTab === 'oracle' ? 'ai-panel__tab--active' : ''}`}
            onClick={() => setActiveTab('oracle')}
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
}
