import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import i18n from '../i18n/i18n';
import { db } from '../db/database';
import { useNovel } from './NovelContext';
import { createDebouncedEntityDetector, parseOracleResponse } from '../services/entityDetector';

const AIContext = createContext();

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

const DEFAULT_MODELS = {
  google:      'gemini-2.0-flash',
  openai:      'gpt-4o-mini',
  anthropic:   'claude-3-5-sonnet-20241022',
  openrouter:  'openrouter/auto',
  local:       'local-model',
};

const DEFAULT_PROMPTS = {
  style: 'Reescribe el siguiente texto para mejorar su estilo literario, haciéndolo más sugerente y evocador, pero manteniendo el significado original.',
  tone: 'Ajusta el tono emocional del siguiente texto para que sea más [TONO], manteniendo la coherencia con el resto de la narrativa.',
  length: 'Modifica la longitud del siguiente texto para que sea más [LONGITUD], sin perder la esencia de lo que se cuenta.',
  clarity: 'Mejora la claridad y legibilidad del siguiente texto, eliminando redundancias y simplificando frases complejas.',
  rhythm: 'Optimiza el ritmo narrativo del siguiente texto, alternando frases cortas y largas para crear una cadencia más dinámica y envolvente.',
  cohesion: 'Mejora la cohesión y la fluidez entre las frases del siguiente texto, asegurando que las transiciones sean naturales y lógicas.',
  character: 'Reescribe el siguiente texto desde el punto de vista (POV) de [PERSONAJE], reflejando su voz única, sus pensamientos y su forma de ver el mundo.'
};

export const DEFAULT_DEBATE_AGENTS = [
  {
    id: 'editor',
    name: i18n.t('ai:agente_editor_nombre'),
    color: '#6b9fd4',
    initials: 'ED',
    desc: i18n.t('ai:agente_editor_desc'),
    active: true,
    systemPrompt: `Eres un editor literario experto especializado en narrativa de ficción. Tu rol en este foro es analizar la estructura narrativa, el arco de personajes, el ritmo de la trama y la coherencia del mundo ficticio. Quando respondas:
- Sé constructivo y específico. Señala exactamente qué funciona y qué no.
- Propón alternativas concretas cuando identifiques un problema.
- Mantén un tono profesional pero accesible.
- Recuerda el contexto de toda la conversación anterior.
- Responde siempre en español y de forma concisa (máximo 3-4 párrafos).`,
  },
  {
    id: 'critic',
    name: i18n.t('ai:agente_critico_nombre'),
    color: '#e07070',
    initials: 'CR',
    desc: i18n.t('ai:agente_critico_desc'),
    active: true,
    systemPrompt: `Eres un crítico literario con amplia experiencia en narrativa española e internacional. Tu rol es ofrecer una valoración analítica y honesta del texto, sin suavizar los problemas pero tampoco siendo innecesariamente duro. Cuando respondas:
- Aporta perspectiva comparativa (referencias a otros autores o técnicas cuando sea relevante).
- Distingue entre problemas de fondo (concepto, personaje, trama) y de forma (estilo, prosa).
- No repitas lo que ya han dicho los demás participantes; añade una perspectiva nueva.
- Recuerda el contexto de toda la conversación anterior.
- Responde siempre en español y de forma concisa (máximo 3-4 párrafos).`,
  },
  {
    id: 'corrector',
    name: i18n.t('ai:agente_corrector_nombre'),
    color: '#5cb98a',
    initials: 'CO',
    desc: i18n.t('ai:agente_corrector_desc'),
    active: true,
    systemPrompt: `Eres un corrector de estilo especializado en narrativa literaria en español. Tu rol es identificar problemas de gramática, ortografía, puntuación, registro, y estilo a nivel de frase y párrafo. Cuando respondas:
- Cita literalmente las frases problemáticas y propón la corrección exacta.
- Explica brevemente el motivo de cada corrección.
- Comenta sobre tics de escritura o patrones repetitivos que notes en el texto.
- Recuerda el contexto de toda la conversación anterior.
- Responde siempre en español y de forma concisa (máximo 3-4 párrafos).`,
  },
];

export const AIProvider = ({ children }) => {
  const { activeNovel, activeScene } = useNovel();
  const [provider, setProvider] = useState(() => localStorage.getItem('ai_provider') || 'google');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_api_key') || '');
  const [localBaseUrl, setLocalBaseUrlState] = useState(() => localStorage.getItem('ai_local_base_url') || 'http://localhost:1234/v1');
  const [selectedModels, setSelectedModels] = useState(() => {
    const saved = localStorage.getItem('ai_selected_models');
    return saved ? JSON.parse(saved) : { ...DEFAULT_MODELS };
  });
  const [prompts, setPrompts] = useState(() => {
    const saved = localStorage.getItem('ai_custom_prompts');
    return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
  });
  
  const [selection, setSelection] = useState('');
  const [lastRewrite, setLastRewrite] = useState('');
  const [oracleText, setOracleText] = useState('');

  // ── Oracle History & Status (Async Dexie) ────────────────────────────────
  const [oracleHistory, setOracleHistory] = useState([]);
  const [oracleStatus, setOracleStatus] = useState({
    status: 'idle',
    detectedEntities: [],
    lastContradiction: null,
  });
  const entityDetectorRef = useRef(createDebouncedEntityDetector(() => {}, 2000));

  // ── Debate Agents & Sessions (Async Dexie) ────────────────────────
  const [debateAgents, setDebateAgents] = useState(DEFAULT_DEBATE_AGENTS);
  const [debateSessions, setDebateSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Derived history for the active session to maintain compatibility with AIPanel
  const debateHistory = debateSessions.find(s => s.id === activeSessionId)?.messages || [];

  useEffect(() => {
    const loadDebateData = async () => {
      if (!activeNovel) {
        setDebateAgents(DEFAULT_DEBATE_AGENTS);
        setDebateSessions([]);
        setActiveSessionId(null);
        setOracleHistory([]);
        setLastRewrite('');
        localStorage.removeItem('activeDebateSessionId');
        return;
      }

      // Load agents for this novel
      let agents = await db.debateAgents.where('novelId').equals(activeNovel.id).toArray();
      if (agents.length === 0) {
        // First time loading for this novel: import defaults
        const defaultAgentsToInsert = DEFAULT_DEBATE_AGENTS.map(({ id, ...rest }) => ({ ...rest, novelId: activeNovel.id }));
        await db.debateAgents.bulkAdd(defaultAgentsToInsert);
        agents = await db.debateAgents.where('novelId').equals(activeNovel.id).toArray();
      }
      setDebateAgents(agents);

      // Load sessions
      let sessions = await db.debateSessions.where('novelId').equals(activeNovel.id).toArray();
      
      // MIGRATION: Check if there's old localStorage data that needs rescuing
      const oldHistoryStr = localStorage.getItem('debate_history');
      if (oldHistoryStr) {
        const oldHistory = JSON.parse(oldHistoryStr);
        if (oldHistory.length > 0) {
          const legacySession = {
            novelId: activeNovel.id,
            title: i18n.t('ai:debate_anterior'),
            updatedAt: new Date().toISOString(),
            messages: oldHistory
          };
          const newId = await db.debateSessions.add(legacySession);
          legacySession.id = newId;
          sessions.push(legacySession);
          localStorage.removeItem('debate_history'); // Burn the bridge
        }
      }

      sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setDebateSessions(sessions);
      
      if (sessions.length > 0) {
        const savedSessionId = localStorage.getItem('activeDebateSessionId');
        const sessionExists = savedSessionId && sessions.some(s => String(s.id) === String(savedSessionId));
        setActiveSessionId(sessionExists ? Number(savedSessionId) : sessions[0].id);
      } else {
        const newSession = {
          novelId: activeNovel.id,
          title: i18n.t('ai:nuevo_debate'),
          updatedAt: new Date().toISOString(),
          messages: []
        };
        const newId = await db.debateSessions.add(newSession);
        newSession.id = newId;
        setDebateSessions([newSession]);
        setActiveSessionId(newId);
        localStorage.setItem('activeDebateSessionId', newId);
      }

      // Load oracle history for this novel
      const oracleEntries = await db.oracleEntries.where('novelId').equals(activeNovel.id).sortBy('createdAt');
      setOracleHistory(oracleEntries);
    };

    loadDebateData();
  }, [activeNovel]);

  // Restore last rewrite when activeScene changes
  useEffect(() => {
    const restoreLastRewrite = async () => {
      if (!activeNovel || !activeScene) {
        setLastRewrite('');
        return;
      }
      const entry = await db.lastRewrite
        .where({ novelId: activeNovel.id, sceneId: activeScene.id })
        .first();
      if (entry) {
        setLastRewrite(entry.text);
      } else {
        setLastRewrite('');
      }
    };
    restoreLastRewrite();
  }, [activeNovel, activeScene]);

  // Persisted lastRewrite
  const saveLastRewrite = async (text, goal, instruction, originalText) => {
    if (!activeNovel || !activeScene) return;
    setLastRewrite(text);
    // Delete any previous entry for this scene
    const existing = await db.lastRewrite
      .where({ novelId: activeNovel.id, sceneId: activeScene.id })
      .toArray();
    for (const e of existing) {
      await db.lastRewrite.delete(e.id);
    }
    // Insert new entry
    await db.lastRewrite.add({
      novelId: activeNovel.id,
      sceneId: activeScene.id,
      text,
      goal,
      instruction,
      originalText,
      savedAt: new Date().toISOString(),
    });
  };

  const discardLastRewrite = async () => {
    if (!activeNovel || !activeScene) return;
    setLastRewrite('');
    await db.lastRewrite
      .where({ novelId: activeNovel.id, sceneId: activeScene.id })
      .delete();
  };

  // Oracle mutators
  const addOracleEntry = async (entry) => {
    if (!activeNovel) return;
    const newEntry = {
      ...entry,
      id: undefined,
      novelId: activeNovel.id,
      sceneId: entry.sceneId || null,
      createdAt: new Date().toISOString(),
    };
    const id = await db.oracleEntries.add(newEntry);
    newEntry.id = id;
    setOracleHistory(prev => [...prev, newEntry]);
  };

  const clearOracleHistory = async () => {
    if (!activeNovel) return;
    await db.oracleEntries.where('novelId').equals(activeNovel.id).delete();
    setOracleHistory([]);
  };

  const deleteOracleEntry = async (entryId) => {
    if (!activeNovel) return;
    await db.oracleEntries.delete(entryId);
    setOracleHistory(prev => prev.filter(e => e.id !== entryId));
  };

  const toggleOracleCorrected = async (entryId) => {
    if (!activeNovel) return;
    const entry = oracleHistory.find(e => e.id === entryId);
    if (!entry) return;
    const newCorrectedState = !entry.isCorrected;
    await db.oracleEntries.update(entryId, { isCorrected: newCorrectedState });
    setOracleHistory(prev => prev.map(e => e.id === entryId ? { ...e, isCorrected: newCorrectedState } : e));
  };

  const checkedEntries = new Set(oracleHistory.filter(e => e.isCorrected).map(e => e.id));

  // Entity detection + traffic light status (only current paragraph/selection)
  useEffect(() => {
    if (!activeNovel || !oracleText) {
      setOracleStatus({ status: 'idle', detectedEntities: [], lastContradiction: null });
      entityDetectorRef.current.cancel();
      return;
    }

    const plainText = oracleText.trim();
    if (plainText.length < 3) {
      setOracleStatus({ status: 'idle', detectedEntities: [], lastContradiction: null });
      return;
    }

    entityDetectorRef.current.immediate(plainText, activeNovel.id)
      .then(({ detections }) => {
        const criticalDetections = detections.filter(d => d.severity === 'critical');
        const doubtfulDetections = detections.filter(d => d.severity === 'doubtful');
        
        if (criticalDetections.length > 0) {
          setOracleStatus(prev => ({
            ...prev,
            status: 'suspicious',
            detectedEntities: criticalDetections,
          }));
        } else if (doubtfulDetections.length >= 2) {
          setOracleStatus(prev => ({
            ...prev,
            status: 'suspicious',
            detectedEntities: doubtfulDetections,
          }));
        } else {
          setOracleStatus(prev => ({
            ...prev,
            status: 'idle',
            detectedEntities: [],
          }));
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('[LoneWriter] Entity detection error:', err);
        }
      });
  }, [activeNovel, oracleText]);

  const markOracleContradiction = (message) => {
    setOracleStatus(prev => ({
      ...prev,
      status: 'error',
      lastContradiction: message,
    }));
  };

  const resetOracleStatus = () => {
    setOracleStatus({ status: 'idle', detectedEntities: [], lastContradiction: null });
  };

  const checkOracleResponse = (aiResponse) => {
    const result = parseOracleResponse(aiResponse);
    if (result.hasContradiction) {
      markOracleContradiction(result.message);
    } else {
      setOracleStatus(prev => ({
        ...prev,
        status: 'idle',
        lastContradiction: null,
      }));
    }
    return result;
  };

  // Session mutators
  const addDebateSession = async (title = null, scene = null) => {
    if (!activeNovel) return;
    let sessionTitle = title;
    if (!sessionTitle && scene) {
      sessionTitle = scene.chapterNumber ? `Cap. ${scene.chapterNumber} / ${scene.sceneTitle}` : scene.sceneTitle || i18n.t('ai:nuevo_debate');
    }
    if (!sessionTitle) {
      sessionTitle = i18n.t('ai:nuevo_debate');
    }
    const session = {
      novelId: activeNovel.id,
      title: sessionTitle,
      updatedAt: new Date().toISOString(),
      messages: []
    };
    const id = await db.debateSessions.add(session);
    session.id = id;
    setDebateSessions(prev => [session, ...prev]);
    setActiveSessionId(id);
    localStorage.setItem('activeDebateSessionId', id);
  };

  const switchDebateSession = (id) => {
    setActiveSessionId(id);
    localStorage.setItem('activeDebateSessionId', id);
  };

  const renameDebateSession = async (id, title) => {
    const date = new Date().toISOString();
    await db.debateSessions.update(id, { title, updatedAt: date });
    setDebateSessions(prev => prev.map(s => s.id === id ? { ...s, title, updatedAt: date } : s).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  };

  const deleteDebateSession = async (id) => {
    await db.debateSessions.delete(id);
    setDebateSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
          localStorage.setItem('activeDebateSessionId', filtered[0].id);
        } else {
          setActiveSessionId(null); 
          // Async call outside of set state, but we can just use setTimeout to break the synchronous flow
          setTimeout(() => addDebateSession(i18n.t('ai:nuevo_debate')), 0);
        }
      }
      return filtered;
    });
  };

  const clearDebateHistory = async () => {
    if (!activeSessionId) return;
    const date = new Date().toISOString();
    await db.debateSessions.update(activeSessionId, { messages: [], updatedAt: date });
    setDebateSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [], updatedAt: date } : s));
  };

  const addDebateMessage = async (msg) => {
    if (!activeSessionId) return;
    setDebateSessions(prev => {
      const date = new Date().toISOString();
      const newSessions = prev.map(s => {
        if (s.id === activeSessionId) {
          const updatedMessages = [...s.messages, { ...msg, id: Date.now() + Math.random() }];
          db.debateSessions.update(activeSessionId, { messages: updatedMessages, updatedAt: date });
          return { ...s, messages: updatedMessages, updatedAt: date };
        }
        return s;
      });
      return newSessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });
  };

  // Agent mutators
  const updateDebateAgent = async (id, changes) => {
    await db.debateAgents.update(id, changes);
    setDebateAgents(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
  };

  const addDebateAgent = async (agent) => {
    if (!activeNovel) return;
    const newAgent = { ...agent, novelId: activeNovel.id, active: true };
    const id = await db.debateAgents.add(newAgent);
    newAgent.id = id;
    setDebateAgents(prev => [...prev, newAgent]);
  };

  const removeDebateAgent = async (id) => {
    await db.debateAgents.delete(id);
    setDebateAgents(prev => prev.filter(a => a.id !== id));
  };

  const toggleDebateAgent = async (id) => {
    const agent = debateAgents.find(a => a.id === id);
    if (!agent) return;
    const newActiveState = !agent.active;
    await db.debateAgents.update(id, { active: newActiveState });
    setDebateAgents(prev => prev.map(a => a.id === id ? { ...a, active: newActiveState } : a));
  };

  useEffect(() => {
    localStorage.setItem('ai_provider', provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem('ai_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('ai_selected_models', JSON.stringify(selectedModels));
  }, [selectedModels]);

  const setModelForProvider = (prov, modelId) => {
    setSelectedModels(prev => ({ ...prev, [prov]: modelId }));
  };

  const setLocalBaseUrl = (val) => {
    setLocalBaseUrlState(val);
    localStorage.setItem('ai_local_base_url', val);
  };

  const currentModel = selectedModels[provider] || DEFAULT_MODELS[provider] || '';

  useEffect(() => {
    localStorage.setItem('ai_custom_prompts', JSON.stringify(prompts));
  }, [prompts]);

  const updatePrompt = (id, value) => {
    setPrompts(prev => ({ ...prev, [id]: value }));
  };

  const resetPrompt = (id) => {
    setPrompts(prev => ({ ...prev, [id]: DEFAULT_PROMPTS[id] }));
  };

  const value = {
    provider, setProvider,
    apiKey, setApiKey,
    localBaseUrl, setLocalBaseUrl,
    selectedModels, setModelForProvider,
    currentModel,
    prompts, updatePrompt, resetPrompt,
    selection, setSelection,
    oracleText, setOracleText,
    lastRewrite, setLastRewrite, saveLastRewrite, discardLastRewrite,
    oracleHistory, addOracleEntry, clearOracleHistory, deleteOracleEntry, toggleOracleCorrected, checkedEntries,
    oracleStatus, checkOracleResponse, resetOracleStatus, markOracleContradiction,
    debateAgents, debateHistory,
    addDebateMessage, clearDebateHistory,
    updateDebateAgent, addDebateAgent, removeDebateAgent, toggleDebateAgent,
    debateSessions,
    activeSessionId,
    addDebateSession,
    switchDebateSession,
    renameDebateSession,
    deleteDebateSession,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};
