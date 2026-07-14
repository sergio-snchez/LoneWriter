import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Trash2, ChevronDown, Eye, Search, CheckSquare, Square, Tag } from 'lucide-react'
import PropTypes from 'prop-types'
import './TokenReview.css'

const TYPE_OPTIONS = ['H1', 'H2', 'H3', 'NORMAL']

function ConfidenceBadge({ confidence }) {
  const pct = Math.round(confidence * 100)
  const color = confidence >= 0.9 ? '#4caf50' : confidence >= 0.7 ? '#ff9800' : '#ef5350'
  return (
    <span
      className="token-review__confidence"
      style={{ '--conf-color': color }}
      title={`${pct}%`}
    >
      {pct}%
    </span>
  )
}

ConfidenceBadge.propTypes = {
  confidence: PropTypes.number.isRequired,
}

function HighlightedText({ text, search }) {
  if (!search) return <>{text}</>
  const idx = text.toLowerCase().indexOf(search.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="token-review__highlight">{text.slice(idx, idx + search.length)}</mark>
      {text.slice(idx + search.length)}
    </>
  )
}

HighlightedText.propTypes = {
  text: PropTypes.string.isRequired,
  search: PropTypes.string.isRequired,
}

function TokenRow({ token, index, onChangeType, onDelete, search, selected, onSelect }) {
  const { t } = useTranslation('import')
  const [showTypeMenu, setShowTypeMenu] = useState(false)

  const handleTypeChange = useCallback((newType) => {
    onChangeType(index, newType)
    setShowTypeMenu(false)
  }, [index, onChangeType])

  const isHeading = token.type !== 'NORMAL'
  const displayText = token.text.length > 80
    ? token.text.slice(0, 80) + '...'
    : token.text

  return (
    <div className={`token-review__row ${isHeading ? 'token-review__row--heading' : ''} ${selected ? 'token-review__row--selected' : ''}`}>
      <button
        className="token-review__select-btn"
        onClick={() => onSelect(index)}
        title={selected ? t('token_deselect') : t('token_select')}
      >
        {selected ? <CheckSquare size={14} /> : <Square size={14} />}
      </button>
      <div className="token-review__type-col">
        <div className="token-review__type-selector">
          <button
            className={`token-review__type-badge token-review__type-badge--${token.type.toLowerCase()}`}
            onClick={() => setShowTypeMenu(v => !v)}
            title={t('token_action_change')}
          >
            {t(`token_type_${token.type}`)}
            <ChevronDown size={10} />
          </button>
          {showTypeMenu && (
            <div className="token-review__type-menu">
              {TYPE_OPTIONS.map(type => (
                <button
                  key={type}
                  className={`token-review__type-option ${type === token.type ? 'token-review__type-option--active' : ''}`}
                  onClick={() => handleTypeChange(type)}
                >
                  {t(`token_type_${type}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="token-review__text-col" title={token.text}>
        {displayText
          ? <HighlightedText text={displayText} search={search} />
          : <span className="token-review__text--empty">{t('token_review_empty')}</span>}
      </div>
      <div className="token-review__actions-col">
        <ConfidenceBadge confidence={token.confidence} />
        <button
          className="token-review__delete"
          onClick={() => onDelete(index)}
          title={t('token_action_delete')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

TokenRow.propTypes = {
  token: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChangeType: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  search: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
}

export default function TokenReview({ tokens: initialTokens, onConfirm, onBack }) {
  const { t } = useTranslation('import')
  const [tokens, setTokens] = useState(initialTokens)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(null)
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [bulkTypeMenu, setBulkTypeMenu] = useState(false)

  const filteredTokens = useMemo(() => {
    let result = tokens
    if (typeFilter) {
      result = result.filter(tk => tk.type === typeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(tk => tk.text.toLowerCase().includes(q))
    }
    return result
  }, [tokens, search, typeFilter])

  const typeCounts = useMemo(() => {
    const counts = { H1: 0, H2: 0, H3: 0, NORMAL: 0 }
    for (const tk of tokens) {
      counts[tk.type] = (counts[tk.type] || 0) + 1
    }
    return counts
  }, [tokens])

  const handleChangeType = useCallback((index, newType) => {
    setTokens(prev => prev.map((tk, i) =>
      i === index ? { ...tk, type: newType } : tk
    ))
  }, [])

  const handleDelete = useCallback((index) => {
    setTokens(prev => prev.filter((_, i) => i !== index))
    setSelectedIndices(prev => {
      const next = new Set()
      for (const i of prev) {
        if (i < index) next.add(i)
        else if (i > index) next.add(i - 1)
      }
      return next
    })
  }, [])

  const handleSelect = useCallback((index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedIndices.size === filteredTokens.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(filteredTokens.map(tk => tokens.indexOf(tk))))
    }
  }, [filteredTokens, tokens, selectedIndices.size])

  const handleBulkTypeChange = useCallback((newType) => {
    setTokens(prev => prev.map((tk, i) =>
      selectedIndices.has(i) ? { ...tk, type: newType } : tk
    ))
    setSelectedIndices(new Set())
    setBulkTypeMenu(false)
  }, [selectedIndices])

  const handleBulkDelete = useCallback(() => {
    setTokens(prev => prev.filter((_, i) => !selectedIndices.has(i)))
    setSelectedIndices(new Set())
  }, [selectedIndices])

  const headingCount = tokens.filter(t => t.type !== 'NORMAL').length
  const allTypes = ['H1', 'H2', 'H3', 'NORMAL']
  const hasSelection = selectedIndices.size > 0

  return (
    <div className="import-step token-review">
      <div className="token-review__header">
        <Eye size={18} className="token-review__header-icon" />
        <div>
          <h3 className="token-review__title">{t('token_review_titulo')}</h3>
          <p className="token-review__desc">{t('token_review_desc')}</p>
        </div>
      </div>

      <div className="token-review__filter-row">
        <button
          className={`token-review__filter-btn ${typeFilter === null ? 'token-review__filter-btn--active' : ''}`}
          onClick={() => setTypeFilter(null)}
        >
          {t('token_filter_all')} <span className="token-review__filter-count">{tokens.length}</span>
        </button>
        {allTypes.map(type => (
          <button
            key={type}
            className={`token-review__filter-btn token-review__filter-btn--${type.toLowerCase()} ${typeFilter === type ? 'token-review__filter-btn--active' : ''}`}
            onClick={() => setTypeFilter(typeFilter === type ? null : type)}
          >
            {t(`token_type_${type}`)} <span className="token-review__filter-count">{typeCounts[type]}</span>
          </button>
        ))}
      </div>

      <div className="token-review__search-row">
        <div className="token-review__search-box">
          <Search size={14} className="token-review__search-icon" />
          <input
            type="text"
            className="token-review__search-input"
            placeholder={t('token_review_search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="token-review__search-clear"
              onClick={() => setSearch('')}
            >
              ×
            </button>
          )}
        </div>
        {search && (
          <span className="token-review__search-count">
            {filteredTokens.length}/{tokens.length}
          </span>
        )}
      </div>

      {hasSelection && (
        <div className="token-review__bulk-bar">
          <span className="token-review__bulk-count">
            {selectedIndices.size} {t('token_review_tokens')} seleccionados
          </span>
          <div className="token-review__bulk-actions">
            <div className="token-review__bulk-type-wrap">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setBulkTypeMenu(v => !v)}
              >
                <Tag size={13} /> {t('token_bulk_change', { count: selectedIndices.size })}
              </button>
              {bulkTypeMenu && (
                <div className="token-review__type-menu token-review__type-menu--bulk">
                  {TYPE_OPTIONS.map(type => (
                    <button
                      key={type}
                      className="token-review__type-option"
                      onClick={() => handleBulkTypeChange(type)}
                    >
                      {t(`token_type_${type}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm token-review__bulk-delete" onClick={handleBulkDelete}>
              <Trash2 size={13} /> {t('token_bulk_delete', { count: selectedIndices.size })}
            </button>
          </div>
        </div>
      )}

      <div className="token-review__stats">
        <button
          className="token-review__select-all"
          onClick={handleSelectAll}
          title={selectedIndices.size === filteredTokens.length ? 'Deselect all' : 'Select all'}
        >
          {selectedIndices.size === filteredTokens.length ? <CheckSquare size={14} /> : <Square size={14} />}
        </button>
        <span>{tokens.length} {t('token_review_tokens')}</span>
        <span>·</span>
        <span>{headingCount} {t('token_review_headings')}</span>
      </div>

      <div className="token-review__list">
        {filteredTokens.length === 0 ? (
          <div className="token-review__empty-search">
            {t('token_review_no_results')}
          </div>
        ) : (
          filteredTokens.map((token) => {
            const realIndex = tokens.indexOf(token)
            return (
              <TokenRow
                key={realIndex}
                token={token}
                index={realIndex}
                onChangeType={handleChangeType}
                onDelete={handleDelete}
                search={search}
                selected={selectedIndices.has(realIndex)}
                onSelect={handleSelect}
              />
            )
          })
        )}
      </div>

      <div className="import-actions">
        <button className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={14} /> {t('atras')}
        </button>
        <button className="btn btn-primary" onClick={() => onConfirm(tokens)}>
          {t('token_review_confirmar')}
        </button>
      </div>
    </div>
  )
}

TokenReview.propTypes = {
  tokens: PropTypes.array.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
}
