import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import {
  BookOpen, ChevronDown, ChevronRight, Eye, FileDown, Clock, Sparkles, Loader2
} from 'lucide-react'
import { AIService, ExportService } from '../../services'
import { Tooltip, CustomDatePicker } from '../../components'
import { STATUS_OPTIONS } from './EditorSortables'
import { useNovel, useAI } from '../../context'
import debounce from 'lodash/debounce'
import './EditorToolbar.css'

const EditorToolbar = memo(function EditorToolbar({ onNavigate, menuOpen, handleManualMpcScan }) {
  const {
    activeScene, activeNovel, characters, updateScene,
    headerExpanded, setHeaderExpanded,
  } = useNovel();

  const {
    oracleStatus, mpcProposals, mpcStatus, logAIUsage,
    apiKey, provider, currentModel, localBaseUrl,
  } = useAI();

  const { t } = useTranslation('editor')
  const [generatingSynopsis, setGeneratingSynopsis] = useState(false)
  const [localSynopsis, setLocalSynopsis] = useState('')
  const [localChronology, setLocalChronology] = useState('')

  useEffect(() => {
    if (activeScene) {
      setLocalSynopsis(activeScene.synopsis || '')
      setLocalChronology(activeScene.inGameDate || '')
    }
  }, [activeScene?.id, activeScene?.synopsis, activeScene?.inGameDate])

  const debouncedSynopsisSave = useCallback(
    debounce((id, val) => {
      updateScene(id, { synopsis: val })
    }, 1000),
    [updateScene]
  )

  const handleSynopsisChange = (e) => {
    const val = e.target.value
    setLocalSynopsis(val)
    if (activeScene) {
      debouncedSynopsisSave(activeScene.id, val)
    }
  }

  const handleMetaChange = async (field, value) => {
    if (!activeScene) return
    await updateScene(activeScene.id, { [field]: value })
  }

  const handleGenerateSynopsis = async () => {
    if (!activeScene || !activeScene.content) return
    try {
      const plainText = activeScene.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (plainText.length < 20) return
      setGeneratingSynopsis(true)
      const aiConfig = { provider, apiKey, model: currentModel, localBaseUrl }
      const { text, usage } = await AIService.summarizeScene(plainText, aiConfig)
      logAIUsage(usage)
      await handleMetaChange('synopsis', text)
      setLocalSynopsis(text)
    } catch (err) {
      console.error(err)
    } finally {
      setGeneratingSynopsis(false)
    }
  }

  const handleExportScene = async () => {
    if (!activeScene) return
    try {
      await ExportService.exportToWord(
        activeScene.title,
        activeScene.content,
        t('exportar.escena_vacia_word')
      )
    } catch (err) {
      if (err.message === 'SCENE_EMPTY') {
        console.warn('[LoneWriter] Export aborted: scene is empty.')
      } else {
        console.error('[LoneWriter] exportToWord error:', err)
      }
    }
  }

  const handleExportSceneODT = async () => {
    if (!activeScene) return
    try {
      await ExportService.exportToODT(
        activeScene.title,
        activeScene.content,
        t('exportar.escena_vacia_word')
      )
    } catch (err) {
      if (err.message === 'SCENE_EMPTY') {
        console.warn('[LoneWriter] ODT export aborted: scene is empty.')
      } else {
        console.error('[LoneWriter] exportToODT error:', err)
      }
    }
  }

  if (!activeScene) return null

  return (
    <div className="editor-header">
      <div className="editor-header__info">
        <div className="editor-header__breadcrumb">
          <BookOpen size={12} />
          <span>{activeNovel?.title}</span>
          <ChevronRight size={10} />
          <span>{activeScene.title}</span>
        </div>
        <div className="editor-header__title-row">
          <div className="editor-header__title-container">
            <h2 className="editor-header__title">{activeScene.title}</h2>
            <button
              className="header-toggle"
              onClick={() => setHeaderExpanded(!headerExpanded)}
            >
              {headerExpanded ? <ChevronDown size={20} className="toggle-icon--rotated" /> : <ChevronDown size={20} />}
            </button>
          </div>

          <div className={`editor-header__metadata ${!headerExpanded ? 'header-collapsed' : ''}`}>
            <div className="meta-field">
              <Clock size={12} />
              <select
                value={activeScene.status}
                onChange={(e) => handleMetaChange('status', e.target.value)}
                className="meta-select"
              >
                {STATUS_OPTIONS.map(opt => {
                  const key = opt.toLowerCase().replace(/ /g, '_')
                  return <option key={opt} value={opt}>{t(`estado.${key}`)}</option>
                })}
              </select>
            </div>
            <div className="meta-field">
              <Eye size={12} />
              <select
                value={activeScene.pov}
                onChange={(e) => handleMetaChange('pov', e.target.value)}
                className="meta-select"
              >
                <option value="">{t('editor.sin_pov')}</option>
                {characters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="meta-field">
              <Clock size={12} />
              <Tooltip content={t('editor.tooltip_cronologia', 'Momento cronológico (ej: Día 1, Pasado, 1240...)')}>
                <input
                  type="text"
                  className="meta-input-text"
                  placeholder={t('editor.cronologia_placeholder', 'Cronología...')}
                  value={localChronology}
                  onChange={(e) => setLocalChronology(e.target.value)}
                  onBlur={(e) => handleMetaChange('inGameDate', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur()
                  }}
                />
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      <div className={`editor-header__status-row ${!headerExpanded ? 'header-collapsed' : ''}`}>
        <Tooltip content={t('editor.exportar_word')}>
          <button className="btn btn-ghost btn-sm" onClick={handleExportScene}>
            <FileDown size={14} />
            {t('editor.word')}
          </button>
        </Tooltip>
        <Tooltip content={t('editor.exportar_odt')}>
          <button className="btn btn-ghost btn-sm" onClick={handleExportSceneODT}>
            <FileDown size={14} />
            {t('editor.odt')}
          </button>
        </Tooltip>
        <Tooltip content={t('editor.tooltip_oraculo')}>
          <div
            className={`oracle-traffic-light oracle-traffic-light--${oracleStatus.status} editor-traffic-light ${oracleStatus.status !== 'idle' ? 'editor-traffic-light--clickable' : ''}`}
            onClick={() => {
              if (oracleStatus.status !== 'idle') {
                window.dispatchEvent(new CustomEvent('open-oracle-panel'))
              }
            }}
          >
            <div className="oracle-traffic-light__dot" />
            <span className="oracle-traffic-light__label">
              {oracleStatus.status === 'idle' && t('editor.sin_coincidencias')}
              {oracleStatus.status === 'suspicious' && t('editor.coincidencias')}
              {oracleStatus.status === 'success' && t('editor.revisado_ok', 'Coherencia verificada')}
              {oracleStatus.status === 'error' && t('editor.contradiccion')}
            </span>
          </div>
        </Tooltip>
        {activeScene && (
          <Tooltip content={t('compendium:mpc.tooltip')}>
            <div
              className={`mpc-traffic-light ${mpcStatus === 'analyzing' ? 'mpc-traffic-light--analyzing' : ''} ${mpcProposals.length > 0 ? 'mpc-traffic-light--active' : ''}`}
              onClick={() => {
                if (mpcProposals.length > 0 || mpcStatus === 'analyzing') {
                  onNavigate('compendium')
                } else {
                  handleManualMpcScan()
                }
              }}
            >
              {mpcProposals.length > 0 || mpcStatus === 'analyzing' ? (
                <span className="mpc-traffic-light__count">{mpcProposals.length > 0 ? mpcProposals.length : <Loader2 size={12} className="spin" />}</span>
              ) : (
                <Sparkles size={14} className="mpc-traffic-light__icon" />
              )}
              <span>
                {mpcStatus === 'analyzing' ? t('ai:oraculo.consultando') : t('compendium:mpc.titulo')}
              </span>
            </div>
          </Tooltip>
        )}
      </div>
      <div className={`editor-header__synopsis-container ${!headerExpanded ? 'header-collapsed' : ''}`}>
        <Tooltip content={t('editor.generar_sinopsis')}>
          <button className="synopsis-ai-btn" onClick={handleGenerateSynopsis} disabled={generatingSynopsis}>
            {generatingSynopsis ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
          </button>
        </Tooltip>
        <div className="editor-header__synopsis-row">
          <input
            type="text"
            className="editor-header__synopsis-input"
            placeholder={t('editor.sinopsis_placeholder')}
            value={localSynopsis}
            onChange={handleSynopsisChange}
          />
        </div>
      </div>
    </div>
  )
})
EditorToolbar.propTypes = {
  onNavigate: PropTypes.func,
  menuOpen: PropTypes.bool,
  handleManualMpcScan: PropTypes.func,
};

export default EditorToolbar
