import { useState, useEffect, useMemo } from 'react'
import { db } from '../db/database'
import i18n from '../i18n/i18n'

const getDefaultDebateAgents = () => [
  {
    id: 'editor',
    name: i18n.t('ai:agentes.editor_nombre'),
    color: '#6b9fd4',
    initials: 'ED',
    desc: i18n.t('ai:agentes.editor_desc'),
    active: true,
    systemPrompt: i18n.t('ai:agentes.editor_prompt'),
  },
  {
    id: 'critic',
    name: i18n.t('ai:agentes.critico_nombre'),
    color: '#e07070',
    initials: 'CR',
    desc: i18n.t('ai:agentes.critico_desc'),
    active: true,
    systemPrompt: i18n.t('ai:agentes.critico_prompt'),
  },
  {
    id: 'corrector',
    name: i18n.t('ai:agentes.corrector_nombre'),
    color: '#5cb98a',
    initials: 'CO',
    desc: i18n.t('ai:agentes.corrector_desc'),
    active: false,
    systemPrompt: i18n.t('ai:agentes.corrector_prompt'),
  },
]

export function useDebate({ activeNovel }) {
  const [debateAgents, setDebateAgents] = useState(getDefaultDebateAgents())
  const [debateSessions, setDebateSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)

  const debateHistory = debateSessions.find(s => s.id === activeSessionId)?.messages || []

  useEffect(() => {
    const loadDebateData = async () => {
      if (!activeNovel) {
        setDebateAgents(getDefaultDebateAgents())
        setDebateSessions([])
        setActiveSessionId(null)
        localStorage.removeItem('activeDebateSessionId')
        return
      }

      let agents = await db.debateAgents.where('novelId').equals(activeNovel.id).toArray()
      if (agents.length === 0) {
        const defaultAgentsToInsert = getDefaultDebateAgents().map(({ id, ...rest }) => ({ ...rest, novelId: activeNovel.id }))
        await db.debateAgents.bulkAdd(defaultAgentsToInsert)
        agents = await db.debateAgents.where('novelId').equals(activeNovel.id).toArray()
      }
      setDebateAgents(agents)

      let sessions = await db.debateSessions.where('novelId').equals(activeNovel.id).toArray()

      const oldHistoryStr = localStorage.getItem('debate_history')
      if (oldHistoryStr) {
        const oldHistory = JSON.parse(oldHistoryStr)
        if (oldHistory.length > 0) {
          const legacySession = {
            novelId: activeNovel.id,
            title: i18n.t('ai:debate_anterior'),
            updatedAt: new Date().toISOString(),
            messages: oldHistory,
          }
          const newId = await db.debateSessions.add(legacySession)
          legacySession.id = newId
          sessions.push(legacySession)
          localStorage.removeItem('debate_history')
        }
      }

      sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      setDebateSessions(sessions)

      if (sessions.length > 0) {
        const savedSessionId = localStorage.getItem('activeDebateSessionId')
        const sessionExists = savedSessionId && sessions.some(s => String(s.id) === String(savedSessionId))
        setActiveSessionId(sessionExists ? Number(savedSessionId) : sessions[0].id)
      } else {
        const newSession = {
          novelId: activeNovel.id,
          title: i18n.t('ai:tabs.debate'),
          updatedAt: new Date().toISOString(),
          messages: [],
        }
        const newId = await db.debateSessions.add(newSession)
        newSession.id = newId
        setDebateSessions([newSession])
        setActiveSessionId(newId)
        localStorage.setItem('activeDebateSessionId', newId)
      }
    }

    loadDebateData()
  }, [activeNovel])

  // Session mutators
  const addDebateSession = async (title = null, scene = null) => {
    if (!activeNovel) return
    let sessionTitle = title
    if (!sessionTitle && scene) {
      sessionTitle = scene.chapterNumber ? `Cap. ${scene.chapterNumber} / ${scene.sceneTitle}` : scene.sceneTitle || i18n.t('ai:tabs.debate')
    }
    if (!sessionTitle) sessionTitle = i18n.t('ai:tabs.debate')
    const session = {
      novelId: activeNovel.id,
      title: sessionTitle,
      updatedAt: new Date().toISOString(),
      messages: [],
    }
    const id = await db.debateSessions.add(session)
    session.id = id
    setDebateSessions(prev => [session, ...prev])
    setActiveSessionId(id)
    localStorage.setItem('activeDebateSessionId', id)
  }

  const switchDebateSession = (id) => {
    setActiveSessionId(id)
    localStorage.setItem('activeDebateSessionId', id)
  }

  const renameDebateSession = async (id, title) => {
    const date = new Date().toISOString()
    await db.debateSessions.update(id, { title, updatedAt: date })
    setDebateSessions(prev => prev.map(s => s.id === id ? { ...s, title, updatedAt: date } : s).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
  }

  const deleteDebateSession = async (id) => {
    await db.debateSessions.delete(id)
    setDebateSessions(prev => {
      const filtered = prev.filter(s => s.id !== id)
      if (activeSessionId === id) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id)
          localStorage.setItem('activeDebateSessionId', filtered[0].id)
        } else {
          setActiveSessionId(null)
          setTimeout(() => addDebateSession(i18n.t('ai:tabs.debate')), 0)
        }
      }
      return filtered
    })
  }

  const clearDebateHistory = async () => {
    if (!activeSessionId) return
    const date = new Date().toISOString()
    await db.debateSessions.update(activeSessionId, { messages: [], updatedAt: date })
    setDebateSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [], updatedAt: date } : s))
  }

  const addDebateMessage = async (msg) => {
    if (!activeSessionId) return
    setDebateSessions(prev => {
      const date = new Date().toISOString()
      const newSessions = prev.map(s => {
        if (s.id === activeSessionId) {
          const updatedMessages = [...s.messages, { ...msg, id: Date.now() + Math.random() }]
          db.debateSessions.update(activeSessionId, { messages: updatedMessages, updatedAt: date })
          return { ...s, messages: updatedMessages, updatedAt: date }
        }
        return s
      })
      return newSessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    })
  }

  // Agent mutators
  const updateDebateAgent = async (id, changes) => {
    const isSpanish = i18n.language === 'es'
    const langDirective = isSpanish
      ? 'Responde SIEMPRE en el idioma de la aplicación.'
      : 'You MUST always respond in the application language.'

    let finalChanges = { ...changes }
    if (changes.systemPrompt) {
      const currentAgent = debateAgents.find(a => a.id === id)
      const hasLangDirective = changes.systemPrompt.includes('Responde SIEMPRE') || changes.systemPrompt.includes('You MUST always respond')
      if (!hasLangDirective) {
        const basePrompt = currentAgent?.systemPrompt || ''
        const hadDirective = basePrompt.includes('Responde SIEMPRE') || basePrompt.includes('You MUST always respond')
        if (!hadDirective && changes.systemPrompt) {
          finalChanges.systemPrompt = changes.systemPrompt + '\n\n' + langDirective
        }
      }
    }
    await db.debateAgents.update(id, finalChanges)
    setDebateAgents(prev => prev.map(a => a.id === id ? { ...a, ...finalChanges } : a))
  }

  const addDebateAgent = async (agent) => {
    if (!activeNovel) return
    const isSpanish = i18n.language === 'es'
    const langDirective = isSpanish
      ? 'Responde SIEMPRE en el idioma de la aplicación.'
      : 'You MUST always respond in the application language.'
    const systemPrompt = agent.systemPrompt || ''
    const hasLangDirective = systemPrompt.includes('Responde SIEMPRE') || systemPrompt.includes('You MUST always respond')
    const newSystemPrompt = hasLangDirective ? systemPrompt : systemPrompt + (systemPrompt ? '\n\n' : '') + langDirective
    const newAgent = { ...agent, systemPrompt: newSystemPrompt, novelId: activeNovel.id, active: true }
    const id = await db.debateAgents.add(newAgent)
    newAgent.id = id
    setDebateAgents(prev => [...prev, newAgent])
  }

  const removeDebateAgent = async (id) => {
    await db.debateAgents.delete(id)
    setDebateAgents(prev => prev.filter(a => a.id !== id))
  }

  const toggleDebateAgent = async (id) => {
    const agent = debateAgents.find(a => a.id === id)
    if (!agent) return
    const newActiveState = !agent.active
    await db.debateAgents.update(id, { active: newActiveState })
    setDebateAgents(prev => prev.map(a => a.id === id ? { ...a, active: newActiveState } : a))
  }

  return useMemo(() => ({
    debateAgents,
    debateSessions,
    debateHistory,
    activeSessionId,
    addDebateSession,
    switchDebateSession,
    renameDebateSession,
    deleteDebateSession,
    clearDebateHistory,
    addDebateMessage,
    updateDebateAgent,
    addDebateAgent,
    removeDebateAgent,
    toggleDebateAgent,
  }), [
    debateAgents, debateSessions, debateHistory, activeSessionId,
    addDebateSession, switchDebateSession, renameDebateSession,
    deleteDebateSession, clearDebateHistory, addDebateMessage,
    updateDebateAgent, addDebateAgent, removeDebateAgent, toggleDebateAgent,
  ])
}
