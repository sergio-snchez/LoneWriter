import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Lightbulb, Zap, X, Check, User, MapPin, Package, BookOpen, FileText } from 'lucide-react'
import './EntitySuggestionPanel.css'

const TABLE_ICONS = {
  characters: User,
  locations: MapPin,
  objects: Package,
  lore: BookOpen,
  resources: FileText
}

function EntitySuggestionChip({ suggestion, onActivate, onDismiss, t }) {
  const Icon = TABLE_ICONS[suggestion.table] || User;
  const isAnaphora = suggestion.isAnaphora;

  return (
    <div className={`entity-suggestion-chip ${isAnaphora ? 'entity-suggestion-chip--anaphora' : ''}`}>
      <div className="entity-suggestion-chip__icon">
        <Icon size={12} />
      </div>
      <div className="entity-suggestion-chip__info">
        <span className="entity-suggestion-chip__name">{suggestion.name}</span>
        <span className="entity-suggestion-chip__meta">
          {isAnaphora && <span className="anaphora-badge">{t('suggestions.anaphora_indicator', '🟣')}</span>}
          <span className="match-icons">{suggestion.displayIcons}</span>
          <span className="score">+{suggestion.score}</span>
        </span>
      </div>
      <div className="entity-suggestion-chip__actions">
        <button 
          className="chip-btn chip-btn--activate"
          onClick={() => onActivate(suggestion)}
          title={t('suggestions.activate')}
        >
          <Zap size={12} />
        </button>
        <button 
          className="chip-btn chip-btn--dismiss"
          onClick={() => onDismiss(suggestion)}
          title={t('suggestions.dismiss')}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

export default function EntitySuggestionPanel({ 
  suggestions = [], 
  onActivateEntity, 
  onDismissSuggestion,
  onApplyAll,
  isVisible,
  onClose
}) {
  const { t } = useTranslation('ai')

  if (!isVisible) return null;

  return (
    <div className="entity-suggestion-panel">
      <div className="entity-suggestion-panel__header">
        <div className="entity-suggestion-panel__title">
          <Lightbulb size={14} />
          <span>{t('suggestions.title')}</span>
          <span className="suggestion-count">{suggestions.length}</span>
        </div>
        <div className="entity-suggestion-panel__actions">
          {suggestions.length > 0 && (
            <button 
              className="btn btn-sm btn-primary"
              onClick={onApplyAll}
            >
              {t('suggestions.apply_all')}
            </button>
          )}
          <button 
            className="btn btn-ghost btn-icon"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="entity-suggestion-panel__content">
        {suggestions.length === 0 ? (
          <div className="entity-suggestion-panel__empty">
            <Lightbulb size={24} />
            <p>{t('suggestions.empty')}</p>
          </div>
        ) : (
          <div className="suggestion-list">
            {suggestions.map((suggestion, index) => (
              <EntitySuggestionChip
                key={`${suggestion.table}-${suggestion.id}-${index}`}
                suggestion={suggestion}
                onActivate={onActivateEntity}
                onDismiss={onDismissSuggestion}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      <div className="entity-suggestion-panel__footer">
        <p className="hint-text">
          {t('suggestions.hint')}
        </p>
      </div>
    </div>
  )
}