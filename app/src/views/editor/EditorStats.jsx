import { useState, useEffect, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import {
  BarChart2, Target, Flame, CheckCircle2, FileText,
  ChevronsDownUp, ChevronsUpDown
} from 'lucide-react'
import { Tooltip } from '../../components'
import './EditorStats.css'

const GOAL_TEMPLATES = [
  { label: 'objetivos.plantillas.micro_relato', words: 1000, targetScenes: 2, scenesRange: '1-2', wps: '500-1000', chaptersRange: '—' },
  { label: 'objetivos.plantillas.cuento_corto', words: 5000, targetScenes: 5, scenesRange: '3-6', wps: '1000-1500', chaptersRange: '1-3' },
  { label: 'objetivos.plantillas.novela_corta', words: 30000, targetScenes: 25, scenesRange: '20-30', wps: '1000-1500', chaptersRange: '5-10' },
  { label: 'objetivos.plantillas.novela_estandar', words: 80000, targetScenes: 70, scenesRange: '60-80', wps: '1200-1500', chaptersRange: '15-25' },
  { label: 'objetivos.plantillas.novela_fantasia', words: 110000, targetScenes: 100, scenesRange: '80-100', wps: '1200-1500', chaptersRange: '20-35' },
]

function ProgressBar({ value, max, label, sublabel, color }) {
  const { t } = useTranslation('editor')
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="progress-item" style={{ '--stat-color': color || 'var(--accent)' }}>
      <div className="progress-item__labels">
        <span className="progress-item__label">{label}</span>
        <span className="progress-item__nums">{value?.toLocaleString() || 0} / {max?.toLocaleString() || 0}</span>
      </div>
      <div className="progress-item__bar-bg">
        <div
          className="progress-item__bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      {sublabel && <span className="progress-item__sublabel">{pct}%</span>}
    </div>
  )
}

const EditorStats = memo(function EditorStats({ activeNovel, acts, streak, t, updateNovelTarget, isStatsExpanded, setIsStatsExpanded }) {
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const goalEditorRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (goalEditorRef.current && !goalEditorRef.current.contains(event.target)) {
        const isClickOnToggle = event.target.closest('.kpi--interactive')
        if (!isClickOnToggle) {
          setShowGoalEditor(false)
        }
      }
    }

    const handleToggleStats = () => {
      setIsStatsExpanded(true)
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }

    if (showGoalEditor) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    window.addEventListener('toggle-stats', handleToggleStats)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('toggle-stats', handleToggleStats)
    }
  }, [showGoalEditor])

  const totalChapters = acts.reduce((acc, act) => acc + (act.chapters?.length || 0), 0)
  const completedChapters = acts.reduce((acc, act) => acc + (act.chapters?.filter(c => c.status === 'Finalizado').length || 0), 0)
  const allScenes = acts.flatMap(act => (act.chapters || []).flatMap(ch => ch.scenes || []))
  const totalScenes = allScenes.length
  const completedScenes = allScenes.filter(s => s.status === 'Finalizado').length
  const wordPct = activeNovel ? Math.round((activeNovel.wordCount / (activeNovel.targetWords || 100000)) * 100) : 0
  const scenePct = (activeNovel?.targetScenes || 60) > 0 ? Math.round((completedScenes / (activeNovel.targetScenes || 60)) * 100) : 0

  return (
    <div className={`editor-stats card ${!isStatsExpanded ? 'editor-stats--collapsed' : ''}`}>
      <div className="editor-stats__header" onClick={() => setIsStatsExpanded(!isStatsExpanded)}>
        <div className="stats-header__left">
          <BarChart2 size={16} className="editor-stats__icon" />
          <div className="stats-header__text">
            <span className="editor-stats__title">{t('estadisticas.titulo')}</span>
            {!isStatsExpanded && (
              <span className="stats-header__summary">
                {t('estadisticas.resumen', {
                  words: activeNovel?.wordCount?.toLocaleString() || 0,
                  streak: streak > 0 ? t('estadisticas.dias_fuego', { count: streak }) : t('estadisticas.sin_escribir_hoy')
                })}
              </span>
            )}
          </div>
        </div>
        <button className="btn btn-ghost btn-icon stats-toggle" onClick={(e) => { e.stopPropagation(); setIsStatsExpanded(!isStatsExpanded) }}>
          {isStatsExpanded ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
        </button>
      </div>

      <div className="editor-stats__content">
        <div className="editor-stats__kpis">
          <div className="kpi">
            <Target size={16} className="kpi__icon" />
            <div>
              <div className="kpi__value">{wordPct}%</div>
              <div className="kpi__label">{t('estadisticas.objetivo_total')}</div>
            </div>
          </div>
          <div className="kpi">
            <Flame size={16} className={`kpi__icon ${streak > 0 ? 'kpi__icon--gold' : 'kpi__icon--muted'}`} />
            <div>
              <div className="kpi__value">{streak}</div>
              <div className="kpi__label">{t('estadisticas.racha_dias')}</div>
            </div>
          </div>
          <div className="kpi">
            <CheckCircle2 size={16} className="kpi__icon kpi__icon--green" />
            <div>
              <div className="kpi__value">{completedScenes}</div>
              <div className="kpi__label">{t('estadisticas.escenas_listas')}</div>
            </div>
          </div>
          <div className="kpi kpi--interactive" ref={goalEditorRef} onClick={() => setShowGoalEditor(!showGoalEditor)}>
            <FileText size={16} className="kpi__icon kpi__icon--gold" />
            <div>
              <div className="kpi__value">{activeNovel?.wordCount?.toLocaleString() || 0}</div>
              <div className="kpi__label">{t('estadisticas.palabras_totales')}</div>
            </div>
            {showGoalEditor && (
              <div className="goal-editor-popover" onClick={e => e.stopPropagation()}>
                <div className="goal-editor__header">{t('objetivos.establecer')}</div>
                <div className="goal-editor__custom">
                  <input
                    type="number"
                    defaultValue={activeNovel?.targetWords}
                    onBlur={(e) => updateNovelTarget(activeNovel.id, parseInt(e.target.value), activeNovel?.targetScenes)}
                    placeholder={t('objetivos.meta_personalizada')}
                  />
                </div>
                <div className="goal-editor__templates">
                  {GOAL_TEMPLATES.map(g => (
                    <button
                      key={g.label}
                      className="goal-template-btn"
                      onClick={() => {
                        updateNovelTarget(activeNovel.id, g.words, g.targetScenes)
                        setShowGoalEditor(false)
                      }}
                    >
                      <div className="goal-template-btn__main">
                        <span className="goal-template-btn__label">{t(g.label)}</span>
                        <span className="goal-template-btn__words">{t('objetivos.plantilla_palabras', { count: g.words })}</span>
                      </div>
                      <div className="goal-template-btn__meta">
                        <span className="goal-template-btn__meta-row">{t('objetivos.plantilla_meta', { scenes: g.scenesRange, wps: g.wps })}</span>
                        <span className="goal-template-btn__meta-row goal-template-btn__chapters">{t('objetivos.plantilla_capitulos', { count: g.chaptersRange })}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="editor-stats__bars">
          <ProgressBar
            label={t('estadisticas.progreso_palabras')}
            value={activeNovel?.wordCount || 0}
            max={activeNovel?.targetWords || 100000}
            sublabel={`${wordPct}%`}
            color="var(--accent)"
          />
          <ProgressBar
            label={t('estadisticas.escenas_completadas')}
            value={completedScenes}
            max={activeNovel?.targetScenes || 60}
            sublabel={`${scenePct}%`}
            color="var(--green)"
          />
        </div>
      </div>
    </div>
  )
})
EditorStats.propTypes = {
  activeNovel: PropTypes.object,
  acts: PropTypes.array,
  streak: PropTypes.number,
  t: PropTypes.func.isRequired,
  updateNovelTarget: PropTypes.func,
  isStatsExpanded: PropTypes.bool,
  setIsStatsExpanded: PropTypes.func,
};

export default EditorStats
