import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import i18n from '../i18n/i18n';
import { db } from '../db/database';
import { useNovel } from './NovelContext';
import { createDebouncedEntityDetector, parseOracleResponse } from '../services/entityDetector';
import { addToIgnoredNames } from '../services/mpcService';

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

const DEFAULT_PROMPTS = () => ({
  style: i18n.t('ai:rewrite_prompts.style'),
  tone: i18n.t('ai:rewrite_prompts.tone'),
  length: i18n.t('ai:rewrite_prompts.length'),
  clarity: i18n.t('ai:rewrite_prompts.clarity'),
  rhythm: i18n.t('ai:rewrite_prompts.rhythm'),
  cohesion: i18n.t('ai:rewrite_prompts.cohesion'),
  character: i18n.t('ai:rewrite_prompts.character'),
});

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
    return DEFAULT_PROMPTS();
  });

  useEffect(() => {
    setPrompts(DEFAULT_PROMPTS());
  }, [i18n.language]);
  
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

  // ── MPC — Monitor de Propuestas del Compendio ─────────────────────────────
  // 'idle' | 'analyzing' | 'error'
  const [mpcStatus, setMpcStatus] = useState('idle');
  const [mpcProposals, setMpcProposals] = useState([]);
  const [isMpcDrawerOpen, setIsMpcDrawerOpen] = useState(false);
  const [isMpcEnabled, setIsMpcEnabled] = useState(() => {
    const saved = localStorage.getItem('ai_mpc_enabled');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ai_mpc_enabled', isMpcEnabled ? 'true' : 'false');
  }, [isMpcEnabled]);

  const mpcCooldownRef = useRef(null); // timestamp de último análisis
  const MPC_COOLDOWN_MS = 15_000; // 15 segundos entre análisis a la IA para ahorrar tokens pero mantener fluidez

  const currentModel = selectedModels[provider] || DEFAULT_MODELS[provider] || '';

  // ── AI Usage Monitoring ──────────────────────────────────────────────────
  const [usageStats, setUsageStats] = useState({ tokens: 0, requests: 0 });

  const refreshUsage = useCallback(async () => {
    if (!provider || !currentModel) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const entry = await db.aiUsage.where('[date+provider+model]')
        .equals([today, provider, currentModel])
        .first();
      setUsageStats(entry || { tokens: 0, requests: 0 });
    } catch (err) {
      console.error('[AIContext] Error loading usage stats:', err);
    }
  }, [provider, currentModel]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const logAIUsage = useCallback(async (usage) => {
    if (!usage) return;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await db.transaction('rw', db.aiUsage, async () => {
        let entry = await db.aiUsage.where('[date+provider+model]')
          .equals([today, provider, currentModel])
          .first();
          
        if (entry) {
          await db.aiUsage.update(entry.id, {
            tokens: (entry.tokens || 0) + (usage.total_tokens || 0),
            requests: (entry.requests || 0) + 1
          });
        } else {
          await db.aiUsage.add({
            date: today,
            provider,
            model: currentModel,
            tokens: usage.total_tokens || 0,
            requests: 1
          });
        }
      });
      refreshUsage();
    } catch (err) {
      console.error('[AIContext] Error logging usage:', err);
    }
  }, [provider, currentModel, refreshUsage]);

  // Restore and sync MPC proposals to keep them persistent during refreshes
  const activeNovelId = activeNovel?.id;
  useEffect(() => {
    if (!activeNovelId) {
      setMpcProposals([]);
      return;
    }
    const savedStr = localStorage.getItem(`mpc_prop_${activeNovelId}`);
    if (savedStr) {
      try {
        setMpcProposals(JSON.parse(savedStr));
      } catch (e) {
        setMpcProposals([]);
      }
    } else {
      setMpcProposals([]);
    }
  }, [activeNovelId]);

  useEffect(() => {
    if (activeNovelId) {
      localStorage.setItem(`mpc_prop_${activeNovelId}`, JSON.stringify(mpcProposals));
    }
  }, [mpcProposals, activeNovelId]);

  // ── Debate Agents & Sessions (Async Dexie) ────────────────────────
  const [debateAgents, setDebateAgents] = useState(getDefaultDebateAgents());
  const [debateSessions, setDebateSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Derived history for the active session to maintain compatibility with AIPanel
  const debateHistory = debateSessions.find(s => s.id === activeSessionId)?.messages || [];

  useEffect(() => {
    const loadDebateData = async () => {
      if (!activeNovel) {
        setDebateAgents(getDefaultDebateAgents());
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
        const defaultAgentsToInsert = getDefaultDebateAgents().map(({ id, ...rest }) => ({ ...rest, novelId: activeNovel.id }));
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
          title: i18n.t('ai:tabs.debate'),
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
      sessionTitle = scene.chapterNumber ? `Cap. ${scene.chapterNumber} / ${scene.sceneTitle}` : scene.sceneTitle || i18n.t('ai:tabs.debate');
    }
    if (!sessionTitle) {
      sessionTitle = i18n.t('ai:tabs.debate');
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
          setTimeout(() => addDebateSession(i18n.t('ai:tabs.debate')), 0);
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
    const isSpanish = i18n.language === 'es';
    const langDirective = isSpanish 
      ? 'Responde SIEMPRE en el idioma de la aplicación.' 
      : 'You MUST always respond in the application language.';
    
    let finalChanges = { ...changes };
    
    if (changes.systemPrompt) {
      const currentAgent = debateAgents.find(a => a.id === id);
      const hasLangDirective = changes.systemPrompt.includes('Responde SIEMPRE') || changes.systemPrompt.includes('You MUST always respond');
      if (!hasLangDirective) {
        const basePrompt = currentAgent?.systemPrompt || '';
        const hadDirective = basePrompt.includes('Responde SIEMPRE') || basePrompt.includes('You MUST always respond');
        if (!hadDirective && changes.systemPrompt) {
          finalChanges.systemPrompt = changes.systemPrompt + '\n\n' + langDirective;
        }
      }
    }
    
    await db.debateAgents.update(id, finalChanges);
    setDebateAgents(prev => prev.map(a => a.id === id ? { ...a, ...finalChanges } : a));
  };

  const addDebateAgent = async (agent) => {
    if (!activeNovel) return;
    
    const isSpanish = i18n.language === 'es';
    const langDirective = isSpanish 
      ? 'Responde SIEMPRE en el idioma de la aplicación.' 
      : 'You MUST always respond in the application language.';
    
    const systemPrompt = agent.systemPrompt || '';
    const hasLangDirective = systemPrompt.includes('Responde SIEMPRE') || systemPrompt.includes('You MUST always respond');
    
    const newSystemPrompt = hasLangDirective 
      ? systemPrompt 
      : systemPrompt + (systemPrompt ? '\n\n' : '') + langDirective;
    
    const newAgent = { ...agent, systemPrompt: newSystemPrompt, novelId: activeNovel.id, active: true };
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


  useEffect(() => {
    localStorage.setItem('ai_custom_prompts', JSON.stringify(prompts));
  }, [prompts]);

  const updatePrompt = (id, value) => {
    setPrompts(prev => ({ ...prev, [id]: value }));
  };

  const resetPrompt = (id) => {
    setPrompts(prev => ({ ...prev, [id]: DEFAULT_PROMPTS()[id] }));
  };

  // ── MPC actions ────────────────────────────────────────────────────────────

  /** Descarta una propuesta solo en esta sesión */
  const dismissMpcProposal = useCallback((proposalId) => {
    setMpcProposals(prev => prev.filter(p => p.id !== proposalId));
  }, []);

  /** Descarta una propuesta y la añade a la lista de ignorados permanentes */
  const dismissMpcProposalPermanently = useCallback(async (proposal) => {
    if (!activeNovel) return;
    const name = proposal.name || proposal.title || '';
    if (name) {
      await addToIgnoredNames(activeNovel.id, name, proposal.type);
    }
    setMpcProposals(prev => prev.filter(p => p.id !== proposal.id));
  }, [activeNovel]);

  /** Acepta una propuesta: la elimina de la bandeja (la escritura en DB la gestiona el componente via addCompendiumEntry) */
  const acceptMpcProposal = useCallback((proposalId) => {
    setMpcProposals(prev => prev.filter(p => p.id !== proposalId));
  }, []);

  /** Limpia todas las propuestas pendientes */
  const clearMpcProposals = useCallback(() => {
    setMpcProposals([]);
  }, []);

  /** Añade propuestas nuevas evitando duplicados por nombre */
  const addMpcProposals = useCallback((newProposals) => {
    setMpcProposals(prev => {
      const existingNames = new Set(prev.map(p => (p.name || p.title || '').toLowerCase()));
      const filtered = newProposals.filter(p => {
        const n = (p.name || p.title || '').toLowerCase();
        return n && !existingNames.has(n);
      });
      return [...prev, ...filtered];
    });
  }, []);

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
    // MPC
    mpcProposals, mpcStatus, setMpcStatus,
    addMpcProposals,
    dismissMpcProposal,
    dismissMpcProposalPermanently,
    acceptMpcProposal,
    clearMpcProposals,
    mpcCooldownRef,
    MPC_COOLDOWN_MS,
    isMpcEnabled,
    setIsMpcEnabled,
    usageStats,
    logAIUsage,
    refreshUsage,
    isMpcDrawerOpen, 
    setIsMpcDrawerOpen
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};
