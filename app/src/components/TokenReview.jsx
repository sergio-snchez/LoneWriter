import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Trash2, ChevronDown, Eye, Search } from 'lucide-react'
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

function TokenRow({ token, index, onChangeType, onDelete, search }) {
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
    <div className={`token-review__row ${isHeading ? 'token-review__row--heading' : ''}`}>
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
}

export default function TokenReview({ tokens: initialTokens, onConfirm, onBack }) {
  const { t } = useTranslation('import')
  const [tokens, setTokens] = useState(initialTokens)
  const [search, setSearch] = useState('')

  const filteredTokens = useMemo(() => {
    if (!search.trim()) return tokens
    const q = search.toLowerCase()
    return tokens.filter(tk => tk.text.toLowerCase().includes(q))
  }, [tokens, search])

  const handleChangeType = useCallback((index, newType) => {
    setTokens(prev => prev.map((tk, i) =>
      i === index ? { ...tk, type: newType } : tk
    ))
  }, [])

  const handleDelete = useCallback((index) => {
    setTokens(prev => prev.filter((_, i) => i !== index))
  }, [])

  const headingCount = tokens.filter(t => t.type !== 'NORMAL').length

  return (
    <div className="import-step token-review">
      <div className="token-review__header">
        <Eye size={18} className="token-review__header-icon" />
        <div>
          <h3 className="token-review__title">{t('token_review_titulo')}</h3>
          <p className="token-review__desc">{t('token_review_desc')}</p>
        </div>
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

      <div className="token-review__stats">
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
