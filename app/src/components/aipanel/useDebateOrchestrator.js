import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/i18n'
import { AIService, createDebouncedSearch, retrieveRelevantFragments } from '../../services'

export function useDebateOrchestrator({ activeScene, debateAgents, debateHistory, activeSessionId, activeSessionTitle, addDebateMessage, renameDebateSession, activeNovel, acts, resources, provider, apiKey, currentModel, localBaseUrl, logAIUsage }) {
  const { t } = useTranslation('ai')
  const [input, setInput] = useState('')
  const [loadingAgents, setLoadingAgents] = useState({})
  const [rounds, setRounds] = useState(1)
  const [useSceneContext, setUseSceneContext] = useState(true)
  const [useCompendiumContext, setUseCompendiumContext] = useState(true)
  const [compendiumContext, setCompendiumContext] = useState('')
  const messagesEndRef = useRef(null)
  const debouncedSearchRef = useRef(createDebouncedSearch(600))

  const activeAgents = debateAgents.filter(a => a.active)
  const isAnyLoading = Object.values(loadingAgents).some(Boolean)

  const getSceneChapterLabel = (scene) => {
    if (!scene || !acts) return null
    for (const act of acts) {
      if (!act.chapters) continue
      const ch = act.chapters.find(c => c.id === scene.chapterId)
      if (ch) return { chapterNumber: ch.number, sceneTitle: scene.title }
    }
    return null
  }

  const handleSend = useCallback(async () => {
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
      time: new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
    }
    addDebateMessage(userMsg)

    let compendiumInfo = ''
    let ragInfo = ''
    if (activeNovel) {
      try {
        const ragController = new AbortController()
        const ragTimeout = new Promise(resolve => setTimeout(() => { ragController.abort(); resolve([]) }, 8000))
        const ragPromise = retrieveRelevantFragments(text, activeNovel.id, 4, null, ragController.signal)

        let compendiumPromise = Promise.resolve(null)
        if (useCompendiumContext) {
          compendiumPromise = debouncedSearchRef.current(text, activeNovel.id)
        }

        const [compResult, ragResult] = await Promise.allSettled([
          compendiumPromise,
          Promise.race([ragPromise, ragTimeout])
        ])

        if (useCompendiumContext && compResult.status === 'fulfilled' && compResult.value?.formatted) {
          compendiumInfo = `\n\n--- INFORMACIÓN DEL COMPENDIO (contexto relevante) ---\n${compResult.value.formatted}`
          setCompendiumContext(compResult.value.formatted)
        } else {
          setCompendiumContext('')
        }

        if (ragResult.status === 'fulfilled' && ragResult.value?.length > 0) {
          ragInfo = ragResult.value.map(f => `[Fragmento relevante guardado localmente]\n${f.text}`).join('\n\n')
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('[LoneWriter] Error en contexto de Debate:', err)
        setCompendiumContext('')
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
            if (r === 0) roundInstruction = t('debate.ronda_inicial', { total: rounds })
            else if (r === rounds - 1) roundInstruction = t('debate.ronda_final', { actual: r + 1, total: rounds })
            else roundInstruction = t('debate.ronda_intermedia', { actual: r + 1, total: rounds })
          }

          const activeRes = resources?.filter(res => res.activeForAI && res.content) || []
          const knowledgeBase = activeRes.length > 0
            ? activeRes.map(res => `Archivo: [${res.name}]\nContenido:\n${res.content}`).join('\n\n')
            : null

          const response = await AIService.agentChat(agent, historyWithUser, {
            provider, apiKey, model: currentModel, localBaseUrl, sceneContent, pov, roundInstruction, knowledgeBase,
            compendiumContext: compendiumInfo || null,
            ragContext: ragInfo || null
          })

          logAIUsage(response.usage)

          const agentMsg = {
            role: 'agent',
            agent: agent.id,
            agentName: agent.name,
            agentColor: agent.color,
            agentInitials: agent.initials,
            text: response.text,
            time: new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
          }
          addDebateMessage(agentMsg)
          historyWithUser.push(agentMsg)
        } catch (err) {
          addDebateMessage({
            role: 'error',
            agent: agent.id,
            agentName: agent.name,
            text: `Error: ${err.message}`,
            time: new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
          })
        } finally {
          setLoadingAgents(prev => ({ ...prev, [agent.id]: false }))
        }
      }
    }
  }, [input, isAnyLoading, activeSessionTitle, activeSessionId, debateHistory, activeScene, activeNovel, acts, resources, provider, apiKey, currentModel, localBaseUrl, logAIUsage, addDebateMessage, renameDebateSession, rounds, activeAgents, useSceneContext, useCompendiumContext, t, getSceneChapterLabel])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return {
    input, setInput,
    loadingAgents, rounds, setRounds,
    useSceneContext, setUseSceneContext,
    useCompendiumContext, setUseCompendiumContext,
    compendiumContext, setCompendiumContext,
    messagesEndRef,
    activeAgents, isAnyLoading,
    handleSend, handleKeyDown, getSceneChapterLabel,
  }
}
