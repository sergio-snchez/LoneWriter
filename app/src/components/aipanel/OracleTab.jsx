/**
 * OracleTab — AI consistency check panel tab.
 * Extracted from AIPanel.jsx for maintainability.
 */
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/i18n'
import {
  Trash2, Check, AlertTriangle, Eye, CheckCheck, Loader2, ChevronDown, Copy
} from 'lucide-react'
import { useAI } from '../../context/AIContext'
import { useNovel } from '../../context/NovelContext'
import { useModal } from '../../context/ModalContext'
import { AIService } from '../../services/aiService'
import { fetchDetectedEntityData } from '../../services/compendiumSearch'
import { retrieveRelevantFragments } from '../../services/ragService'
import { Tooltip } from '../Tooltip'
import { renderMarkdown } from '../../utils/renderMarkdown'
import { normalizeTextForDisplay } from './aiPanelHelpers'

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

      const ragTimeout = new Promise(resolve => setTimeout(() => resolve([]), 15000))

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
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
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
                    <button className="oracle-tab__check-btn" onClick={() => toggleChecked(entry.id)}>
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
                    <button className="oracle-tab__action-btn" onClick={() => handleCopy(entry.id)}>
                      {copiedId === entry.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </Tooltip>
                  <Tooltip content={t('oraculo.eliminar')}>
                    <button className="oracle-tab__action-btn oracle-tab__action-btn--delete" onClick={() => handleDeleteEntry(entry.id)}>
                      <Trash2 size={12} />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div className={`oracle-tab__entry-text ${isExpanded ? 'oracle-tab__entry-text--expanded' : 'oracle-tab__entry-text--clamped'}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanText) }}>
              </div>
              {cleanText.length > 200 && (
                <button className="oracle-tab__read-more" onClick={() => toggleExpanded(entry.id)}>
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

export default OracleTab
