/**
 * OracleTab — AI consistency check panel tab.
 * Extracted from AIPanel.jsx for maintainability.
 */
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import i18n from '../../i18n/i18n'
import {
  Trash2, Check, AlertTriangle, Eye, CheckCheck, Loader2, ChevronDown, Copy, X, XCircle
} from 'lucide-react'
import './OracleTab.css'
import './Markdown.css'
import { useAI, useNovel, useModal } from '../../context'
import { AIService, fetchDetectedEntityData, retrieveRelevantFragments, buildContextWithBudget, PROVIDER_DEFAULTS } from '../../services'
import { MarkdownRenderer, Tooltip } from '../'
import { normalizeTextForDisplay } from './aiPanelHelpers'
import { copyToClipboard } from '../../utils/clipboard'

function OracleTab({ activeScene }) {
  useEffect(() => {
    localStorage.setItem('lw_oracle_visited', 'true')
  }, [])

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
  const [isEntitiesExpanded, setIsEntitiesExpanded] = useState(true)
  const [includePrevScene, setIncludePrevScene] = useState(true)
  const [ragScope, setRagScope] = useState('chapter')
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

  const getActForScene = (sceneId) => {
    if (!acts || !sceneId) return null
    for (const act of acts) {
      if (!act.chapters) continue
      for (const ch of act.chapters) {
        if (!ch.scenes) continue
        if (ch.scenes.some(s => s.id === sceneId)) return act.id
      }
    }
    return null
  }

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [oracleHistory])

  const stripJsonBlock = (text) => {
    let cleaned = text.replace(/```(?:json)?\s*\{[\s\S]*?"hasContradiction"[\s\S]*?\}\s*```/gi, '');
    cleaned = cleaned.replace(/\{[\s\S]*"hasContradiction"[\s\S]*\}/g, '').trim();
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

      const ragController = new AbortController()
      const ragTimeout = new Promise(resolve => setTimeout(() => { ragController.abort(); resolve([]) }, 15000))

      // Build RAG scope filter (skip entirely when 'none')
      const ragScopeFilter = {}
      if (ragScope === 'chapter' && activeScene?.chapterId) {
        ragScopeFilter.chapterId = activeScene.chapterId
      } else if (ragScope === 'act') {
        const actId = getActForScene(activeScene?.id)
        if (actId) ragScopeFilter.actId = actId
      }

      const [compResult, ragResult] = await Promise.allSettled([
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
        (ragScope !== 'none' && activeNovel?.id)
          ? Promise.race([retrieveRelevantFragments(plainText, activeNovel.id, 4, { excludeSceneId: activeScene?.id, signal: ragController.signal, ...ragScopeFilter }), ragTimeout])
          : Promise.resolve([])
      ])

      const compendiumInfo = compResult.status === 'fulfilled' ? (compResult.value || '') : ''
      setCompContextUsed(compendiumInfo)

      const fragments = ragResult.status === 'fulfilled' ? (ragResult.value || []) : []
      if (ragResult.status === 'rejected') {
        console.warn('[RAG] Retrieval failed (proceeding without it):', ragResult.reason)
      }

      // Include chronologically previous scene for continuity validation
      let prevSceneText = ''
      if (includePrevScene && acts?.length > 0 && activeScene?.id != null) {
        const allScenes = acts.flatMap(act =>
          act.chapters?.flatMap(ch =>
            ch.scenes || []
          ) || []
        )
        const currentIdx = allScenes.findIndex(s => s.id === activeScene.id)
        if (currentIdx > 0) {
          const prev = allScenes[currentIdx - 1]
          if (prev?.content) {
            const plain = prev.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
            if (plain.length >= 10) prevSceneText = plain
          }
        }
      }

      const oraclePrompt = t('oracle_prompt')

      const oracleCompendium = t('oraculo.prompt_compendium')
      const oraclePrevCtx = t('oraculo.prompt_prev_ctx')
      const oracleNoComp = t('oraculo.prompt_no_comp')
      const oracleNoPrev = t('oraculo.prompt_no_prev')
      const oracleText = t('oraculo.prompt_text')
      const oracleAnswer = t('oraculo.prompt_answer')

      const tagLabel = t('oraculo.prompt_tag')
      const prevSceneLabel = t('oraculo.prompt_prev_scene')
      let ragContextText = ''
      if (prevSceneText) {
        ragContextText += `${prevSceneLabel}\n${prevSceneText}`
      }
      if (fragments.length > 0) {
        if (ragContextText) ragContextText += '\n\n---\n\n'
        ragContextText += fragments.map((f, i) => `[${tagLabel} ${i + 1}]: ${f}`).join('\n\n')
      }

      // Apply token budget — compendium always full, scene/RAG truncated if needed
      const maxTokens = PROVIDER_DEFAULTS[provider] || 8000
      const budget = buildContextWithBudget({
        prompt: oraclePrompt,
        compendium: compendiumInfo || oracleNoComp,
        sceneText: plainText,
        ragFragments: ragContextText ? [ragContextText] : [],
      }, maxTokens)

      if (budget.warnings.length > 0) {
        console.warn('[Oracle] Token budget warnings:', budget.warnings)
      }

      const fullPrompt = `${budget.prompt}

${oracleCompendium}
${budget.compendium}

${oraclePrevCtx}
${budget.ragFragments[0] || oracleNoPrev}

${oracleText}
${budget.sceneText}

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
        time: new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
        sceneId: activeScene.id,
        sceneTitle: activeScene.title,
        chapterId: activeScene.chapterId || null,
        chapterNumber: chapterInfo?.number || null,
        compendiumUsed: compendiumInfo,
        hasContradiction: parsed.hasContradiction,
      })
    } catch (err) {
      console.error('[Oracle] Full error:', err);
      setError(t('oraculo.error_consulta', { error: err.message }))
    } finally {
      setIsChecking(false)
    }
  }

  const handleCopy = (id) => {
    const entry = oracleHistory.find(e => e.id === id)
    if (!entry) return
    copyToClipboard(stripJsonBlock(entry.text))
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

  const toggleChecked = (id) => { toggleOracleCorrected(id) }

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
      {/* Detected Compendium Entities */}
      {oracleStatus.detectedEntities?.length > 0 && (
        <div className="oracle-coreference-section">
          <button
            className="oracle-coreference-section__header"
            onClick={() => setIsEntitiesExpanded(!isEntitiesExpanded)}
          >
            <span className="oracle-coreference-section__label">{t('oraculo.coincidencias')}</span>
            <ChevronDown size={14} className={`oracle-expand-icon ${isEntitiesExpanded ? 'oracle-expand-icon--open' : ''}`} />
          </button>

          {isEntitiesExpanded && (
            <div className="oracle-coreference-chips">
              {oracleStatus.detectedEntities.filter(e => e?.name).map((e) => (
                <Tooltip key={e.name} content={
                  <div>
                    <strong>{e.name}</strong> ({e.label})
                    <br />
                    {e.matchedTerms?.join(', ')}
                  </div>
                }>
                  <span className={`oracle-entity-tag oracle-entity-tag--hoverable ${oracleStatus.status === 'error' ? 'oracle-entity-tag--error' : oracleStatus.status === 'success' ? 'oracle-entity-tag--success' : ''}`}>
                    {e.name}
                  </span>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rewrite-context-toggle">
        <label className="context-toggle-label">
          <input
            type="checkbox"
            checked={includePrevScene}
            onChange={(e) => setIncludePrevScene(e.target.checked)}
          />
          <span>{t('oraculo.include_prev_scene')}</span>
        </label>
      </div>

      <div className="oracle-rag-scope">
        <label className="oracle-rag-scope__label">{t('oraculo.rag_scope')}</label>
        <select
          className="oracle-rag-scope__select"
          value={ragScope}
          onChange={(e) => setRagScope(e.target.value)}
        >
          <option value="chapter">{t('oraculo.rag_scope_chapter')}</option>
          <option value="act">{t('oraculo.rag_scope_act')}</option>
          <option value="all">{t('oraculo.rag_scope_all')}</option>
          <option value="none">{t('oraculo.rag_scope_none')}</option>
        </select>
        <span className="oracle-rag-scope__hint">{t('oraculo.rag_scope_hint')}</span>
      </div>

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
        {oracleHistory.map(entry => (
          <OracleEntry
            key={entry.id}
            entry={entry}
            isExpanded={expandedEntries.has(entry.id)}
            isChecked={checkedEntries.has(entry.id)}
            copiedId={copiedId}
            stripJsonBlock={stripJsonBlock}
            onToggleChecked={toggleChecked}
            onCopy={handleCopy}
            onDelete={handleDeleteEntry}
            onToggleExpanded={toggleExpanded}
            t={t}
          />
        ))}

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

/* ---- Sub-component: a single oracle history entry ---- */
function OracleEntry({ entry, isExpanded, isChecked, copiedId, stripJsonBlock, onToggleChecked, onCopy, onDelete, onToggleExpanded, t }) {
  const cleanText = stripJsonBlock(entry.text)
  return (
    <div className={`oracle-tab__entry ${isChecked ? 'oracle-tab__entry--checked' : ''} ${entry.hasContradiction ? 'oracle-tab__entry--contradiction' : ''}`}>
      <div className="oracle-tab__entry-header">
        <div className="oracle-tab__entry-left">
          {entry.hasContradiction ? (
            <Tooltip content={isChecked ? t('oraculo.marcar_pendiente') : t('oraculo.marcar_corregido')}>
              <button className={`oracle-tab__check-btn ${!isChecked ? 'oracle-tab__check-btn--error' : ''}`} onClick={() => onToggleChecked(entry.id)}>
                {isChecked ? <Check size={14} /> : <X size={14} />}
              </button>
            </Tooltip>
          ) : (
            <button className="oracle-tab__check-btn" disabled>
              <CheckCheck size={14} />
            </button>
          )}
          <div className="oracle-tab__entry-info">
            <div className="oracle-tab__entry-label">
              <Eye size={12} />
              {t('oraculo.titulo')}
            </div>
            {(entry.chapterNumber || entry.sceneTitle) && (
              <span className="oracle-tab__entry-location">
                {entry.chapterNumber ? `${t('oraculo.cap_abbr')} ${entry.chapterNumber}` : t('oraculo.sin_cap')} / {entry.sceneTitle || t('oraculo.sin_escena')}
              </span>
            )}
          </div>
        </div>
        <div className="oracle-tab__entry-meta">
          <span className="oracle-tab__entry-time">{entry.time}</span>
          <Tooltip content={t('oraculo.copiar')}>
            <button className="oracle-tab__action-btn" onClick={() => onCopy(entry.id)}>
              {copiedId === entry.id ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </Tooltip>
          <Tooltip content={t('oraculo.eliminar')}>
            <button className="oracle-tab__action-btn oracle-tab__action-btn--delete" onClick={() => onDelete(entry.id)}>
              <Trash2 size={12} />
            </button>
          </Tooltip>
        </div>
      </div>
      <MarkdownRenderer className="oracle-tab__entry-text" content={cleanText} clamped={!isExpanded} />
      {cleanText.length > 200 && (
        <button className="oracle-tab__read-more" onClick={() => onToggleExpanded(entry.id)}>
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
}

OracleTab.propTypes = {
  activeScene: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    content: PropTypes.string,
    pov: PropTypes.string,
    chapterId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};

OracleEntry.propTypes = {
  entry: PropTypes.object.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  isChecked: PropTypes.bool.isRequired,
  copiedId: PropTypes.any,
  stripJsonBlock: PropTypes.func.isRequired,
  onToggleChecked: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleExpanded: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

export default OracleTab
