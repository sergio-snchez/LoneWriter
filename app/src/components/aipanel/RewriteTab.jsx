/**
 * RewriteTab — AI rewrite panel tab.
 * Extracted from AIPanel.jsx for maintainability.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/i18n'
import {
  Sparkles, Wand2, RefreshCw, Copy, Check, Trash2,
  Pencil, Zap, AlignLeft
} from 'lucide-react'
import { useAI } from '../../context/AIContext'
import { useNovel } from '../../context/NovelContext'
import { useModal } from '../../context/ModalContext'
import { AIService } from '../../services/aiService'
import { Tooltip } from '../Tooltip'
import { renderMarkdown } from '../../utils/renderMarkdown'
import { QUICK_GOALS, normalizeHtmlForEditor, extractPreviousContext } from './aiPanelHelpers'

export function RewriteTab({ activeScene }) {
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
