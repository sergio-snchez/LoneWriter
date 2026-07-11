import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Upload, FileText, X, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle2, Loader2, BookOpen, Plus,
  File, FileType, ArrowLeft, HardDrive, Type, Columns,
} from 'lucide-react'
import PropTypes from 'prop-types'
import { analyzeFile, confirmImport, findExistingImport, supportsFile, ALLOWED_EXTENSIONS } from '../services'
import { useNovel } from '../context'
import './ImportWizard.css'

function truncateText(text, max = 60) {
  return text.length > max ? text.slice(0, max) + '...' : text
}

function formatBytes(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function FormatBadge({ format }) {
  const colors = {
    TXT: '#a8d5a2',
    MD: '#82aaff',
    DOCX: '#4fc3f7',
    PDF: '#ef5350',
    ODT: '#ce93d8',
  }
  return (
    <span
      className="import-badge"
      style={{ '--badge-color': colors[format] || '#888' }}
    >
      {format}
    </span>
  )
}

FormatBadge.propTypes = { format: PropTypes.string.isRequired }

function SectionTree({ sections, level = 0 }) {
  const [expanded, setExpanded] = useState(true)

  const toggle = useCallback(() => setExpanded(v => !v), [])

  const typeLabel = level === 0 ? 'Acto' : level === 1 ? 'Capítulo' : 'Escena'
  const section = sections

  if (!section || (Array.isArray(section) && section.length === 0)) return null

  if (Array.isArray(section)) {
    return (
      <div className="import-tree">
        {section.map((s, i) => (
          <SectionTree key={i} sections={s} level={level} />
        ))}
      </div>
    )
  }

  const subs = section.chapters || section.scenes || []
  const hasChildren = subs.length > 0
  const wordCount = section.text ? section.text.split(/\s+/).filter(Boolean).length : 0
  const totalWords = hasChildren
    ? subs.reduce((sum, sub) => {
        const subText = sub.text || ''
        const subChildren = sub.scenes || sub.chapters || []
        const subSubWords = subChildren.length
          ? subChildren.reduce((s, c) => s + (c.text || '').split(/\s+/).filter(Boolean).length, 0)
          : 0
        return sum + subText.split(/\s+/).filter(Boolean).length + subSubWords
      }, 0)
    : wordCount

  return (
    <div className={`import-tree__item import-tree__item--level-${level}`}>
      <div className="import-tree__row">
        {hasChildren ? (
          <button className="import-tree__toggle" onClick={toggle}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="import-tree__toggle import-tree__toggle--spacer" />
        )}
        <span className="import-tree__type">{typeLabel}</span>
        <span className="import-tree__title">
          {section.title || <span className="import-tree__title--empty">(sin título)</span>}
        </span>
        <span className="import-tree__words">{totalWords.toLocaleString()} palabras</span>
      </div>
      {hasChildren && expanded && (
        <div className="import-tree__children">
          {subs.map((sub, i) => (
            <SectionTree key={i} sections={sub} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

SectionTree.propTypes = {
  sections: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
  ]).isRequired,
  level: PropTypes.number,
}

function StepFile({ onFileSelected }) {
  const { t } = useTranslation('import')
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file) => {
    if (file && supportsFile(file)) {
      onFileSelected(file)
    }
  }, [onFileSelected])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  return (
    <div className="import-step">
      <div
        className={`import-dropzone ${dragOver ? 'import-dropzone--active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="import-hidden-input"
          accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')}
          onChange={handleInputChange}
        />
        <Upload size={32} className="import-dropzone__icon" />
        <p className="import-dropzone__text">{t('dropzone_text')}</p>
        <p className="import-dropzone__formats">
          {t('formatos_aceptados', { formats: ALLOWED_EXTENSIONS.join(', ').toUpperCase() })}
        </p>
        <span className="btn btn-primary import-dropzone__btn">
          <Plus size={14} />
          {t('seleccionar')}
        </span>
      </div>
    </div>
  )
}

StepFile.propTypes = {
  onFileSelected: PropTypes.func.isRequired,
}

function StepPreview({ analysis, onBack, onContinue }) {
  const { t } = useTranslation('import')
  const { metadata, sections, hasStructure } = analysis

  const totalScenes = sections.reduce((sum, act) =>
    sum + act.chapters.reduce((s, ch) => s + ch.scenes.length, 0), 0
  )
  const totalChapters = sections.reduce((sum, act) => sum + act.chapters.length, 0)

  return (
    <div className="import-step">
      <div className="import-meta">
        <div className="import-meta__item">
          <FileType size={14} />
          <FormatBadge format={metadata.format} />
        </div>
        <div className="import-meta__item">
          <FileText size={14} />
          <span>{truncateText(metadata.fileName, 40)}</span>
        </div>
        <div className="import-meta__item">
          <Type size={14} />
          <span>{metadata.wordCount.toLocaleString()} {t('palabras')}</span>
        </div>
        <div className="import-meta__item">
          <Columns size={14} />
          <span>{metadata.pageCount} {t('paginas')}</span>
        </div>
        <div className="import-meta__item">
          <HardDrive size={14} />
          <span>{formatBytes(metadata.fileSize)}</span>
        </div>
      </div>

      {!hasStructure && (
        <div className="import-note">
          <AlertCircle size={14} />
          <span>{t('sin_estructura_nota')}</span>
        </div>
      )}

      <div className="import-summary">
        <span className="import-summary__count">
          {sections.length} {t('actos')}
        </span>
        <span className="import-summary__sep">·</span>
        <span className="import-summary__count">
          {totalChapters} {t('capitulos')}
        </span>
        <span className="import-summary__sep">·</span>
        <span className="import-summary__count">
          {totalScenes} {t('escenas')}
        </span>
      </div>

      <div className="import-preview-scroll">
        {sections.map((act, ai) => (
          <SectionTree key={ai} sections={act} level={0} />
        ))}
      </div>

      <div className="import-actions">
        <button className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={14} /> {t('atras')}
        </button>
        <button className="btn btn-primary" onClick={onContinue}>
          {t('continuar')}
        </button>
      </div>
    </div>
  )
}

StepPreview.propTypes = {
  analysis: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
}

function StepReimport({ existingResource, analysis, onSelect, onBack }) {
  const { t } = useTranslation('import')
  const [selected, setSelected] = useState(null)
  const importedDate = existingResource.updatedAt || existingResource.createdAt

  return (
    <div className="import-step import-step--reimport">
      <div className="reimport-header">
        <AlertCircle size={24} className="reimport-header__icon" />
        <h3 className="reimport-header__title">{t('reimport_titulo')}</h3>
        <p className="reimport-header__desc">
          {t('reimport_descripcion', {
            date: importedDate ? new Date(importedDate).toLocaleDateString() : '—',
            name: existingResource.name,
          })}
        </p>
      </div>

      <div className="reimport-options">
        <button
          className={`reimport-option ${selected === 'update' ? 'reimport-option--selected' : ''}`}
          onClick={() => setSelected('update')}
        >
          <span className="reimport-option__title">{t('reimport_actualizar')}</span>
          <span className="reimport-option__desc">{t('reimport_actualizar_desc')}</span>
        </button>

        <button
          className={`reimport-option ${selected === 'duplicate' ? 'reimport-option--selected' : ''}`}
          onClick={() => setSelected('duplicate')}
        >
          <span className="reimport-option__title">{t('reimport_duplicar')}</span>
          <span className="reimport-option__desc">{t('reimport_duplicar_desc')}</span>
        </button>
      </div>

      <div className="import-actions">
        <button className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={14} /> {t('atras')}
        </button>
        <button
          className="btn btn-primary"
          disabled={!selected}
          onClick={() => onSelect(selected)}
        >
          {t('continuar')}
        </button>
      </div>
    </div>
  )
}

StepReimport.propTypes = {
  existingResource: PropTypes.object.isRequired,
  analysis: PropTypes.object.isRequired,
  onSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
}

function StepConfirm({ analysis, file, onBack, onComplete, onCancel, importMode, existingResource }) {
  const { t } = useTranslation('import')
  const { activeNovel } = useNovel()
  const [destination, setDestination] = useState(activeNovel ? 'existing' : 'new')
  const defaultTitle = file.name.replace(/\.[^.]+$/, '')
  const [novelTitle, setNovelTitle] = useState(defaultTitle)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)

  const { metadata, sections } = analysis

  const totalScenes = sections.reduce((sum, act) =>
    sum + act.chapters.reduce((s, ch) => s + ch.scenes.length, 0), 0
  )
  const totalChapters = sections.reduce((sum, act) => sum + act.chapters.length, 0)

  const handleImport = useCallback(async () => {
    setImporting(true)
    setError(null)
    try {
      const result = await confirmImport(
        analysis,
        file,
        {
          createNewNovel: destination === 'new',
          existingNovelId: destination === 'existing' ? activeNovel?.id : null,
          novelTitle: novelTitle.trim(),
          importMode,
          existingResource,
        }
      )
      onComplete(destination === 'new', result.novelId)
    } catch (err) {
      setError(err.message || t('error_inesperado'))
    } finally {
      setImporting(false)
    }
  }, [analysis, file, destination, novelTitle, activeNovel, importMode, existingResource, onComplete, t])

  return (
    <div className="import-step">
      <div className="import-destination">
        <p className="import-destination__label">{t('destino_pregunta')}</p>

        <label className={`import-radio ${destination === 'new' ? 'import-radio--active' : ''}`}>
          <input
            type="radio"
            name="destination"
            value="new"
            checked={destination === 'new'}
            onChange={() => setDestination('new')}
          />
          <BookOpen size={16} />
          <span>{t('destino_nueva')}</span>
        </label>

        {destination === 'new' && (
          <div className="import-title-input-wrap">
            <input
              className="import-title-input"
              placeholder={t('titulo_placeholder')}
              value={novelTitle}
              onChange={(e) => setNovelTitle(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {activeNovel && (
          <label className={`import-radio ${destination === 'existing' ? 'import-radio--active' : ''}`}>
            <input
              type="radio"
              name="destination"
              value="existing"
              checked={destination === 'existing'}
              onChange={() => setDestination('existing')}
            />
            <Plus size={16} />
            <span>{t('destino_existente', { title: activeNovel.title })}</span>
          </label>
        )}
      </div>

      <div className="import-summary import-summary--confirm">
        <span>{t('resumen_importacion', {
          acts: sections.length,
          chapters: totalChapters,
          scenes: totalScenes,
          words: metadata.wordCount.toLocaleString(),
        })}</span>
      </div>

      {error && (
        <div className="import-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="import-actions">
        <button className="btn btn-ghost" onClick={onBack} disabled={importing}>
          <ArrowLeft size={14} /> {t('atras')}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleImport}
          disabled={importing || (destination === 'new' && !novelTitle.trim())}
        >
          {importing ? (
            <><Loader2 size={14} className="spinner" /> {t('importando')}</>
          ) : (
            <><Upload size={14} /> {t('importar')}</>
          )}
        </button>
      </div>
    </div>
  )
}

StepConfirm.propTypes = {
  analysis: PropTypes.object.isRequired,
  file: PropTypes.instanceOf(File).isRequired,
  onBack: PropTypes.func.isRequired,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  importMode: PropTypes.oneOf(['update', 'duplicate', null]),
  existingResource: PropTypes.object,
}

function StepComplete({ createdNewNovel, onClose }) {
  const { t } = useTranslation('import')

  return (
    <div className="import-step import-step--complete">
      <CheckCircle2 size={48} className="import-complete__icon" />
      <h2 className="import-complete__title">{t('completado_titulo')}</h2>
      <p className="import-complete__text">
        {createdNewNovel ? t('completado_nueva') : t('completado_existente')}
      </p>
      <button className="btn btn-primary" onClick={onClose}>
        {t('cerrar')}
      </button>
    </div>
  )
}

StepComplete.propTypes = {
  createdNewNovel: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default function ImportWizard({ novelId, onComplete, onCancel }) {
  const { t } = useTranslation('import')
  const { refreshAllNovels, switchNovel, reloadData, activeNovel } = useNovel()
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [createdNewNovel, setCreatedNewNovel] = useState(false)
  const [importedNovelId, setImportedNovelId] = useState(null)
  const [existingResource, setExistingResource] = useState(null)
  const [importMode, setImportMode] = useState(null)

  const handleFileSelected = useCallback(async (selectedFile) => {
    setFile(selectedFile)
    setLoading(true)
    setError(null)
    setExistingResource(null)
    setImportMode(null)
    try {
      const result = await analyzeFile(selectedFile)
      setAnalysis(result)
      const targetNovelId = novelId || activeNovel?.id
      if (targetNovelId && result.metadata?.contentHash) {
        const existing = await findExistingImport(result.metadata.contentHash, targetNovelId)
        if (existing) {
          setExistingResource(existing)
          setStep(2)
          return
        }
      }
      setStep(2)
    } catch (err) {
      setError(err.message || t('error_analisis'))
    } finally {
      setLoading(false)
    }
  }, [t, novelId, activeNovel])

  const handleContinue = useCallback(() => setStep(3), [])
  const handleBack = useCallback(() => setStep(s => s - 1), [])

  const handleReimportSelect = useCallback((mode) => {
    setImportMode(mode)
  }, [])

  const handleReimportBack = useCallback(() => {
    setFile(null)
    setAnalysis(null)
    setExistingResource(null)
    setImportMode(null)
    setStep(1)
  }, [])

  const handleComplete = useCallback(async (isNewNovel, novelIdResult) => {
    setCreatedNewNovel(isNewNovel)
    setImportedNovelId(novelIdResult)
    if (isNewNovel && novelIdResult) {
      await switchNovel(novelIdResult)
    } else if (novelIdResult) {
      await reloadData(novelIdResult)
    }
    await refreshAllNovels()
    setStep(4)
  }, [refreshAllNovels, switchNovel, reloadData])

  const handleClose = useCallback(() => {
    onComplete(importedNovelId)
  }, [onComplete, importedNovelId])

  const steps = [1, 2, 3]

  return (
    <div className="import-wizard">
      <div className="import-wizard__header">
        <h2 className="import-wizard__title">
          <Upload size={16} />
          {t('wizard_title')}
        </h2>
        <button className="btn btn-ghost btn-icon" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>

      {step < 4 && (
        <div className="import-steps">
          {steps.map(s => (
            <div
              key={s}
              className={`import-steps__dot ${s === step ? 'import-steps__dot--active' : ''} ${s < step ? 'import-steps__dot--done' : ''}`}
            >
              {s < step ? <CheckCircle2 size={14} /> : <span>{s}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="import-wizard__body">
        {loading ? (
          <div className="import-loading">
            <Loader2 size={32} className="spinner" />
            <p>{t('analizando')}</p>
          </div>
        ) : error && step === 1 ? (
          <div className="import-error">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button className="btn btn-ghost" onClick={() => setError(null)}>
              {t('reintentar')}
            </button>
          </div>
        ) : step === 1 ? (
          <StepFile onFileSelected={handleFileSelected} />
        ) : step === 2 && existingResource && !importMode ? (
          <StepReimport
            existingResource={existingResource}
            analysis={analysis}
            onSelect={handleReimportSelect}
            onBack={handleReimportBack}
          />
        ) : step === 2 ? (
          <StepPreview
            analysis={analysis}
            onBack={handleReimportBack}
            onContinue={handleContinue}
          />
        ) : step === 3 ? (
          <StepConfirm
            analysis={analysis}
            file={file}
            onBack={handleBack}
            onComplete={handleComplete}
            onCancel={onCancel}
            importMode={importMode}
            existingResource={existingResource}
          />
        ) : (
          <StepComplete createdNewNovel={createdNewNovel} onClose={handleClose} />
        )}
      </div>
    </div>
  )
}

ImportWizard.propTypes = {
  novelId: PropTypes.number,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
}
