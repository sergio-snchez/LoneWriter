/**
 * CompendiumCards — generic card display for all entity types.
 * Extracted from Compendium.jsx for maintainability.
 */
import { useState, memo } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { ChevronRight, PenLine, Trash2, Zap, Package } from 'lucide-react'
import { Tooltip } from '../../components'
import { ENTITY_COLORS } from './CompendiumPanel'
import './CompendiumCards.css'

const CLASS_PREFIX = { character: 'char-card', location: 'loc-card', object: 'obj-card', lore: 'lore-card' }
const COLOR_KEY = { character: 'characters', location: 'locations', object: 'objects', lore: 'lore' }

/* ---- Generic card, driven by `type` ---- */
function CompendiumCardInner({ entity, type, onEdit, onDelete, onToggleIgnore }) {
  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)
  const pfx = CLASS_PREFIX[type]
  const isIgnored = entity.ignoredForOracle

  return (
    <div
      className={`${pfx} card ${expanded ? `${pfx}--expanded` : ''} ${isIgnored ? 'card--ignored' : ''}`}
      id={`${type}-card-${entity.id}`}
      onClick={() => setExpanded(e => !e)}
      style={{ '--entity-color': ENTITY_COLORS[COLOR_KEY[type]] }}
    >
      <div className={`${pfx}__top`}>
        {type === 'character' && (
          <div className={`${pfx}__avatar`}>
            <span>{entity.initials || (entity.name || '').substring(0, 2).toUpperCase()}</span>
          </div>
        )}
        {type === 'location' && <div className={`${pfx}__dot`} />}
        {type === 'object' && <Package size={16} className={`${pfx}__icon`} />}
        {type === 'lore' && <div className={`${pfx}__cat-dot`} />}

        <div className={`${pfx}__info`}>
          <span className={type === 'lore' ? 'lore-card__title' : `${pfx}__name`}>{entity.name || entity.title}</span>

          {!isIgnored && (
            <div className="ai-context-badge-wrapper">
              <span className="ai-context-badge">
                <Zap size={10} /> {t('tarjetas.contexto_ia')}
              </span>
            </div>
          )}

          {type === 'character' && entity.occupation && entity.occupation !== 0 && entity.occupation !== '0' && (
            <span className={`${pfx}__occupation`}>{entity.occupation}</span>
          )}
          {(type === 'location' || type === 'object') && entity.type && entity.type !== 0 && entity.type !== '0' && (
            <span className={`${pfx}__type`}>{entity.type}</span>
          )}
          {type === 'lore' && entity.category && entity.category !== 0 && entity.category !== '0' && (
            <span className="lore-card__cat">{entity.category}</span>
          )}

          <div className={`${pfx}__tags`}>
            {type === 'character' && entity.role && entity.role !== 0 && entity.role !== '0' && (
              <span className="badge badge-muted">{entity.role}</span>
            )}
            {type === 'character' && entity.age && (
              <span className="tag">
                {isNaN(entity.age) ? entity.age : t('tarjetas.años', { age: entity.age })}
              </span>
            )}
            {type === 'object' && entity.currentOwner && (
              <span className="badge badge-muted">{t('tarjetas.portador', { name: entity.currentOwner })}</span>
            )}
            {(type === 'location' || type === 'lore') && toArray(entity.tags).slice(0, 3).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
            {type === 'object' && toArray(entity.tags).slice(0, 2).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>

        <div className="compendium-card-actions">
          <Tooltip content={isIgnored ? t('tarjetas.excluido') : t('tarjetas.incluido')}>
            <button
              className={`btn btn-ghost btn-icon ${!isIgnored ? 'compendium-zap-active' : ''}`}
              onClick={e => { e.stopPropagation(); onToggleIgnore(entity) }}
            >
              <Zap size={14} className={`comp-zap-icon ${isIgnored ? 'comp-zap-icon--disabled' : ''}`} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.editar')}>
            <button className="btn btn-ghost btn-icon" onClick={e => { e.stopPropagation(); onEdit(entity) }}>
              <PenLine size={14} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.eliminar')}>
            <button className="btn btn-ghost btn-icon text-danger" onClick={e => { e.stopPropagation(); onDelete(entity.id) }}>
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>

        <ChevronRight size={14} className={`${pfx}__chevron ${expanded ? `${pfx}__chevron--open` : ''}`} />
      </div>

      {expanded && (
        <div className={`${pfx}__body`}>
          <p className={type === 'lore' ? 'lore-card__summary' : `${pfx}__desc`}>{entity.description || entity.summary}</p>

          {type === 'character' && (
            <>
              <TagList label={t('tarjetas.rasgos')} raw={entity.traits} />
              {entity.relations && entity.relations.length > 0 && (
                <>
                  <div className="char-card__section-label">{t('tarjetas.relaciones')}</div>
                  {entity.relations.map(r => (
                    <div key={r.name} className="char-relation">
                      <span className="char-relation__name">{r.name}</span>
                      <span className="char-relation__type">{r.type}</span>
                    </div>
                  ))}
                </>
              )}
              <AssocList label={t('tarjetas.objetos')} raw={entity.associatedObjects} />
              <AssocList label={t('tarjetas.lore')} raw={entity.associatedLore} />
              <AssocList label={t('tarjetas.localizaciones')} raw={entity.associatedLocations} />
            </>
          )}

          {type === 'location' && (
            <>
              <div className="loc-card__climate">
                <span className="char-card__section-label">{t('tarjetas.clima')}</span>
                {entity.climate && entity.climate !== 0 && entity.climate !== '0' && (
                  <span className="loc-card__climate-val">{entity.climate}</span>
                )}
              </div>
              <AssocList label={t('tarjetas.personajes')} raw={entity.associatedCharacters} />
              <AssocList label={t('tarjetas.objetos')} raw={entity.associatedObjects} />
              <AssocList label={t('tarjetas.lore')} raw={entity.associatedLore} />
              <div className="loc-card__all-tags">
                {toArray(entity.tags).map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </>
          )}

          {type === 'object' && (
            <>
              {entity.importance && entity.importance !== 'Secundario' && (
                <div className="obj-card__importance-badge">
                  <span className={`badge ${entity.importance === 'MacGuffin' ? 'badge-gold' : 'badge-blue'}`}>
                    {entity.importance === 'MacGuffin' ? t('tarjetas.macguffin') : t('tarjetas.relevante')}
                  </span>
                </div>
              )}
              <div className="obj-card__meta">
                <span className="char-card__section-label">{t('tarjetas.origen')}</span>
                <span className="obj-card__origin">{entity.origin}</span>
              </div>
              <div className="obj-card__tags obj-card__tags--expanded">
                {toArray(entity.tags).map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
              <AssocList label={t('tarjetas.personajes')} raw={entity.associatedCharacters} />
              <AssocList label={t('tarjetas.lore')} raw={entity.associatedLore} />
              <AssocList label={t('tarjetas.localizaciones')} raw={entity.associatedLocations} />
            </>
          )}

          {type === 'lore' && (
            <>
              <AssocList label={t('tarjetas.personajes')} raw={entity.associatedCharacters} />
              <AssocList label={t('tarjetas.localizaciones')} raw={entity.associatedLocations} />
              <AssocList label={t('tarjetas.objetos')} raw={entity.associatedObjects} />
              <div className="lore-card__all-tags lore-card__all-tags--expanded">
                {toArray(entity.tags).map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

CompendiumCardInner.propTypes = {
  entity: PropTypes.object.isRequired,
  type: PropTypes.oneOf(['character', 'location', 'object', 'lore']).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleIgnore: PropTypes.func.isRequired,
}

/* ---- Type-specific wrappers (backward-compatible API) ---- */
export const CharacterCard = memo(function CharacterCard({ char, ...rest }) {
  return <CompendiumCardInner entity={char} type="character" {...rest} />
})
CharacterCard.propTypes = {
  char: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleIgnore: PropTypes.func.isRequired,
}

export const LocationCard = memo(function LocationCard({ loc, ...rest }) {
  return <CompendiumCardInner entity={loc} type="location" {...rest} />
})
LocationCard.propTypes = {
  loc: PropTypes.object.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onToggleIgnore: PropTypes.func,
}

export const ObjectCard = memo(function ObjectCard({ obj, ...rest }) {
  return <CompendiumCardInner entity={obj} type="object" {...rest} />
})
ObjectCard.propTypes = {
  obj: PropTypes.object.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onToggleIgnore: PropTypes.func,
}

export const LoreCard = memo(function LoreCard({ entry, ...rest }) {
  return <CompendiumCardInner entity={entry} type="lore" {...rest} />
})
LoreCard.propTypes = {
  entry: PropTypes.object.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onToggleIgnore: PropTypes.func,
}

/* ---- Internal helpers ---- */
function toArray(val) {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function TagList({ label, raw }) {
  const tags = toArray(raw)
  if (!tags.length) return null
  return (
    <>
      <div className="char-card__section-label">{label}</div>
      <div className="char-card__traits">
        {tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
      </div>
    </>
  )
}

function AssocList({ label, raw }) {
  const items = toArray(raw)
  if (!items.length) return null
  return (
    <div>
      <span className="char-card__section-label">{label}</span>
      <div className="assoc-list">
        {items.map(name => <span key={name} className="tag">{name}</span>)}
      </div>
    </div>
  )
}
