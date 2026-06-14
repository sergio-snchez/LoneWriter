import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { db } from '../db/database';
import { useNovel, useAIConfig, useAIMpc, useAIUsage, useOracle, useDebate } from './';
import { AIService } from '../services';

// Re-export for backward-compat (SettingsModal imports DEFAULT_MODELS from here)
export { DEFAULT_MODELS } from './useAIConfig';

const AIContext = createContext();

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

export const AIProvider = ({ children }) => {
  const { activeNovel, activeScene } = useNovel();

  // ── Extracted Hooks ─────────────────────────────────────────────────────────
  const aiConfig  = useAIConfig();
  const aiMpc     = useAIMpc({ activeNovel });
  const aiUsage   = useAIUsage({ db, provider: aiConfig.provider, currentModel: aiConfig.currentModel });
  const oracle    = useOracle({ activeNovel, activeScene });
  const debate    = useDebate({ activeNovel });

  // ── Rewrite selection & result ─────────────────────────────────────────────
  const [selection, setSelection]     = useState('');
  const [lastRewrite, setLastRewrite] = useState('');

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
      setLastRewrite(entry ? entry.text : '');
    };
    restoreLastRewrite();
  }, [activeNovel, activeScene]);

  const saveLastRewrite = async (text, goal, instruction, originalText) => {
    if (!activeNovel || !activeScene) return;
    setLastRewrite(text);
    const existing = await db.lastRewrite
      .where({ novelId: activeNovel.id, sceneId: activeScene.id })
      .toArray();
    for (const e of existing) {
      await db.lastRewrite.delete(e.id);
    }
    await db.lastRewrite.add({
      novelId: activeNovel.id, sceneId: activeScene.id,
      text, goal, instruction, originalText,
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

  const value = useMemo(() => ({
    ...aiConfig,
    ...aiMpc,
    ...aiUsage,
    ...oracle,
    ...debate,
    selection, setSelection,
    lastRewrite, setLastRewrite, saveLastRewrite, discardLastRewrite,
    testConnection: AIService.testConnection,
  }), [aiConfig, aiMpc, aiUsage, oracle, debate, selection, lastRewrite]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

AIProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
