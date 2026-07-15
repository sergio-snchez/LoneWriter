import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import {
  Upload, FileText, X, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle2, Loader2, BookOpen, Plus,
  File, FileType, ArrowLeft, HardDrive, Type, Columns,
  BookMarked,
} from 'lucide-react'
import PropTypes from 'prop-types'
import { analyzeFile, confirmImport, findExistingImport, supportsFile, ALLOWED_EXTENSIONS } from '../services'
import { compileNarrativeStructure } from '../services/import/narrativeCompiler'
import { db } from '../db/database'
import { useNovel } from '../context'
import TokenReview from './TokenReview'
import './ImportWizard.css'

function truncateText(text, max = 60) {
  return text.length > max ? text.slice(0, max) + '...' : text
}

function formatBytes(bytes) {
  if (!bytes) return i18n.t('import:format_size_zero')
  const k = 1024
  const sizeKeys = ['format_size_bytes', 'format_size_kb', 'format_size_mb', 'format_size_gb']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + i18n.t(`import:${sizeKeys[i]}`)
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
  const { t } = useTranslation('import')
  const [expanded, setExpanded] = useState(true)

  const toggle = useCallback(() => setExpanded(v => !v), [])

  const typeLabel = level === 0 ? t('token_type_H1') : level === 1 ? t('token_type_H2') : t('token_type_H3')
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
          {section.title || <span className="import-tree__title--empty">{t('section_no_title')}</span>}
        </span>
        <span className="import-tree__words">{totalWords.toLocaleString()} {t('palabras')}</span>
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

function StepImportMode({ analysis, onSelect, onBack }) {
  const { t } = useTranslation('import')
  const { metadata } = analysis

  return (
    <div className="import-step import-step--mode">
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
          <HardDrive size={14} />
          <span>{formatBytes(metadata.fileSize)}</span>
        </div>
      </div>

      <h3 className="import-mode__title">{t('import_mode_title')}</h3>
      <p className="import-mode__subtitle">{t('import_mode_subtitle')}</p>

      <div className="import-mode__options">
        <button className="import-mode__option" onClick={() => onSelect('narrative')}>
          <FileText size={24} className="import-mode__option-icon" />
          <div className="import-mode__option-content">
            <span className="import-mode__option-title">{t('import_mode_narrative')}</span>
            <span className="import-mode__option-desc">{t('import_mode_narrative_desc')}</span>
          </div>
          <ChevronRight size={16} className="import-mode__option-arrow" />
        </button>

        <button className="import-mode__option" onClick={() => onSelect('lore')}>
          <BookMarked size={24} className="import-mode__option-icon" />
          <div className="import-mode__option-content">
            <span className="import-mode__option-title">{t('import_mode_lore')}</span>
            <span className="import-mode__option-desc">{t('import_mode_lore_desc')}</span>
          </div>
          <ChevronRight size={16} className="import-mode__option-arrow" />
        </button>
      </div>

      <div className="import-actions">
        <button className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={14} /> {t('atras')}
        </button>
        <span />
      </div>
    </div>
  )
}

StepImportMode.propTypes = {
  analysis: PropTypes.object.isRequired,
  onSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
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

function StepLoreConfig({ analysis, loreTitle, onLoreTitleChange, loreCategory, onLoreCategoryChange, loreTags, onLoreTagsChange, onBack, onContinue }) {
  const { t } = useTranslation('import')
  const { metadata, rawContent } = analysis
  const previewText = rawContent ? rawContent.slice(0, 500) : ''

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
          <HardDrive size={14} />
          <span>{formatBytes(metadata.fileSize)}</span>
        </div>
      </div>

      <h3 className="lore-config__title">{t('lore_config_title')}</h3>

      <div className="lore-config__fields">
        <div className="lore-config__field">
          <label className="lore-config__label">{t('lore_config_entry_title')}</label>
          <input
            className="lore-config__input"
            value={loreTitle}
            onChange={(e) => onLoreTitleChange(e.target.value)}
            placeholder={t('lore_config_title_placeholder')}
            autoFocus
          />
        </div>

        <div className="lore-config__field">
          <label className="lore-config__label">{t('lore_config_category')}</label>
          <input
            className="lore-config__input"
            value={loreCategory}
            onChange={(e) => onLoreCategoryChange(e.target.value)}
            placeholder={t('lore_config_category_placeholder')}
          />
        </div>

        <div className="lore-config__field">
          <label className="lore-config__label">{t('lore_config_tags')}</label>
          <input
            className="lore-config__input"
            value={loreTags}
            onChange={(e) => onLoreTagsChange(e.target.value)}
            placeholder={t('lore_config_tags_placeholder')}
          />
        </div>
      </div>

      {previewText && (
        <div className="lore-config__preview">
          <span className="lore-config__preview-label">{t('lore_config_preview')}</span>
          <div className="lore-config__preview-text">{previewText}...</div>
        </div>
      )}

      <div className="import-actions">
        <button className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={14} /> {t('atras')}
        </button>
        <button className="btn btn-primary" onClick={onContinue} disabled={!loreTitle.trim()}>
          {t('continuar')}
        </button>
      </div>
    </div>
  )
}

StepLoreConfig.propTypes = {
  analysis: PropTypes.object.isRequired,
  loreTitle: PropTypes.string.isRequired,
  onLoreTitleChange: PropTypes.func.isRequired,
  loreCategory: PropTypes.string.isRequired,
  onLoreCategoryChange: PropTypes.func.isRequired,
  loreTags: PropTypes.string.isRequired,
  onLoreTagsChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
}

function StepConfirm({ analysis, file, onBack, onComplete, onCancel, importMode, existingResource, importDestination, loreTitle, loreCategory, loreTags }) {
  const { t } = useTranslation('import')
  const { activeNovel } = useNovel()
  const [destination, setDestination] = useState(activeNovel ? 'existing' : 'new')
  const defaultTitle = file.name.replace(/\.[^.]+$/, '')
  const [novelTitle, setNovelTitle] = useState(defaultTitle)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

  const isUpdateMode = importMode === 'update'
  const isLoreMode = importDestination === 'lore'

  const { metadata, sections } = analysis

  const totalScenes = sections.reduce((sum, act) =>
    sum + act.chapters.reduce((s, ch) => s + ch.scenes.length, 0), 0
  )
  const totalChapters = sections.reduce((sum, act) => sum + act.chapters.length, 0)

  useEffect(() => {
    if (isUpdateMode) setDestination('existing')
  }, [isUpdateMode])

  const handleImport = useCallback(async () => {
    setImporting(true)
    setError(null)
    setProgress(null)
    try {
      if (isLoreMode) {
        const parsedTags = loreTags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
        const result = await confirmImport(
          analysis,
          file,
          {
            createNewNovel: false,
            existingNovelId: activeNovel?.id,
            importMode: 'lore',
            loreTitle: loreTitle.trim(),
            loreCategory: loreCategory.trim(),
            loreTags: parsedTags,
          },
          setProgress
        )
        onComplete(false, result.novelId)
      } else {
        const result = await confirmImport(
          analysis,
          file,
          {
            createNewNovel: destination === 'new',
            existingNovelId: destination === 'existing' ? activeNovel?.id : null,
            novelTitle: novelTitle.trim(),
            importMode,
            existingResource,
          },
          setProgress
        )
        onComplete(destination === 'new', result.novelId)
      }
    } catch (err) {
      setError(err.message || t('error_inesperado'))
    } finally {
      setImporting(false)
      setProgress(null)
    }
  }, [analysis, file, destination, novelTitle, activeNovel, importMode, existingResource, isLoreMode, loreTitle, loreCategory, loreTags, onComplete, t])

  const progressPhase = progress ? t(`progress_${progress.phase}`) : ''
  const progressPct = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="import-step">
      {isLoreMode ? (
        <>
          <div className="import-destination">
            <p className="import-destination__label">{t('lore_confirm_summary', { novelTitle: activeNovel?.title || '' })}</p>
            <div className="lore-confirm__details">
              <p className="lore-confirm__detail">{t('lore_confirm_entry', { title: loreTitle })}</p>
              {loreCategory && <p className="lore-confirm__detail">{t('lore_confirm_category', { category: loreCategory })}</p>}
              <p className="lore-confirm__detail">{t('lore_confirm_words', { count: metadata.wordCount.toLocaleString() })}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="import-destination">
            <p className="import-destination__label">{t(isUpdateMode ? 'destino_actualizar_pregunta' : 'destino_pregunta')}</p>

            {!isUpdateMode && (
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
            )}

            {!isUpdateMode && destination === 'new' && (
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
                {importMode === 'update' ? <ArrowLeft size={16} /> : <Plus size={16} />}
                <span>{importMode === 'update'
                  ? t('destino_actualizar', { title: activeNovel.title })
                  : t('destino_existente', { title: activeNovel.title })
                }</span>
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
        </>
      )}

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
          disabled={importing || (!isLoreMode && destination === 'new' && !novelTitle.trim())}
        >
          {importing ? (
            <><Loader2 size={14} className="spinner" /> {t('importando')}</>
          ) : isLoreMode ? (
            <><BookMarked size={14} /> {t('lore_confirm_button')}</>
          ) : (
            <><Upload size={14} /> {isUpdateMode ? t('actualizar') : t('importar')}</>
          )}
        </button>
      </div>
      {importing && progress && (
        <div className="import-progress">
          <div className="import-progress__info">
            <span className="import-progress__phase">{progressPhase}</span>
            <span className="import-progress__pct">{progressPct}%</span>
          </div>
          <div className="import-progress__bar">
            <div
              className="import-progress__fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="import-progress__detail">
            {progress.current} / {progress.total}
          </span>
        </div>
      )}
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
  importDestination: PropTypes.oneOf(['narrative', 'lore', null]),
  loreTitle: PropTypes.string,
  loreCategory: PropTypes.string,
  loreTags: PropTypes.string,
}

function StepComplete({ createdNewNovel, onClose, importDestination }) {
  const { t } = useTranslation('import')
  const isLoreMode = importDestination === 'lore'

  return (
    <div className="import-step import-step--complete">
      <CheckCircle2 size={48} className="import-complete__icon" />
      <h2 className="import-complete__title">{isLoreMode ? t('completado_lore_titulo') : t('completado_titulo')}</h2>
      <p className="import-complete__text">
        {isLoreMode ? t('completado_lore_text') : createdNewNovel ? t('completado_nueva') : t('completado_existente')}
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
  importDestination: PropTypes.oneOf(['narrative', 'lore', null]),
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
  const [reviewTokens, setReviewTokens] = useState(null)
  const [importDestination, setImportDestination] = useState(null)
  const [loreTitle, setLoreTitle] = useState('')
  const [loreCategory, setLoreCategory] = useState('')
  const [loreTags, setLoreTags] = useState('')

  const handleFileSelected = useCallback(async (selectedFile) => {
    setFile(selectedFile)
    setLoading(true)
    setError(null)
    setExistingResource(null)
    setImportMode(null)
    setReviewTokens(null)
    setImportDestination(null)
    setLoreTitle('')
    setLoreCategory('')
    setLoreTags('')
    try {
      const result = await analyzeFile(selectedFile)
      setAnalysis(result)
      const targetNovelId = novelId || activeNovel?.id
      if (targetNovelId && result.metadata?.fileName) {
        const existing = await findExistingImport(result.metadata.fileName, targetNovelId)
        if (existing) {
          setExistingResource(existing)
          if (existing.importedLoreId) {
            try {
              const loreEntry = await db.lore.get(existing.importedLoreId)
              if (loreEntry) {
                setImportDestination('lore')
                setLoreTitle(loreEntry.title || selectedFile.name.replace(/\.[^.]+$/, ''))
                setLoreCategory(loreEntry.category || '')
                setLoreTags(Array.isArray(loreEntry.tags) ? loreEntry.tags.join(', ') : '')
              }
            } catch (err) {
              console.error('[Import] Error loading lore entry:', err)
            }
          }
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

  const handleImportModeSelect = useCallback((mode) => {
    setImportDestination(mode)
    setLoreTitle(file?.name?.replace(/\.[^.]+$/, '') || '')
    if (mode === 'narrative' && analysis?.tokens?.length > 0) {
      setReviewTokens(analysis.tokens)
    }
  }, [analysis, file])

  const handleLoreConfigBack = useCallback(() => {
    setImportDestination(null)
    setLoreTitle('')
    setLoreCategory('')
    setLoreTags('')
    if (existingResource) {
      setExistingResource(null)
      setFile(null)
      setAnalysis(null)
      setStep(1)
    }
  }, [existingResource])

  const handleTokenReviewConfirm = useCallback((confirmedTokens) => {
    const { sections, hasStructure } = compileNarrativeStructure(confirmedTokens)
    setAnalysis(prev => ({ ...prev, tokens: confirmedTokens, sections, hasStructure }))
    setReviewTokens(null)
  }, [])

  const handleTokenReviewBack = useCallback(() => {
    setReviewTokens(null)
    setFile(null)
    setAnalysis(null)
    setImportDestination(null)
    setStep(1)
  }, [])

  const handleContinue = useCallback(() => setStep(3), [])
  const handleBack = useCallback(() => setStep(s => s - 1), [])

  const handleModeBack = useCallback(() => {
    if (importDestination === 'lore') {
      setImportDestination(null)
      setLoreTitle('')
      setLoreCategory('')
      setLoreTags('')
    } else {
      setImportDestination(null)
      setReviewTokens(null)
    }
  }, [importDestination])

  const handleReimportSelect = useCallback((mode) => {
    setImportMode(mode)
    if (mode === 'update') {
      const savedTokens = existingResource?.parsedTokens
      if (savedTokens?.length > 0) {
        setReviewTokens(savedTokens)
      } else if (analysis?.tokens?.length > 0) {
        setReviewTokens(analysis.tokens)
      }
    }
  }, [analysis, existingResource])

  const handleReimportBack = useCallback(() => {
    setFile(null)
    setAnalysis(null)
    setExistingResource(null)
    setImportMode(null)
    setImportDestination(null)
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
        {step < 4 && (
          <div className="import-steps">
            {steps.map(s => (
              <div
                key={s}
                className={`import-steps__dot ${s === step ? 'import-steps__dot--active' : ''} ${s < step ? 'import-steps__dot--done' : ''}`}
              >
                {s < step ? <CheckCircle2 size={12} /> : <span>{s}</span>}
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-ghost btn-icon" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>

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
        ) : step === 2 && !importDestination && !existingResource ? (
          <StepImportMode
            analysis={analysis}
            onSelect={handleImportModeSelect}
            onBack={handleReimportBack}
          />
        ) : step === 2 && importDestination === 'lore' ? (
          <StepLoreConfig
            analysis={analysis}
            loreTitle={loreTitle}
            onLoreTitleChange={setLoreTitle}
            loreCategory={loreCategory}
            onLoreCategoryChange={setLoreCategory}
            loreTags={loreTags}
            onLoreTagsChange={setLoreTags}
            onBack={handleLoreConfigBack}
            onContinue={handleContinue}
          />
        ) : step === 2 && reviewTokens ? (
          <TokenReview
            tokens={reviewTokens}
            onConfirm={handleTokenReviewConfirm}
            onBack={handleTokenReviewBack}
          />
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
            onBack={handleModeBack}
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
            importDestination={importDestination}
            loreTitle={loreTitle}
            loreCategory={loreCategory}
            loreTags={loreTags}
          />
        ) : (
          <StepComplete
            createdNewNovel={createdNewNovel}
            onClose={handleClose}
            importDestination={importDestination}
          />
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
