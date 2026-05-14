/**
 * CompendiumCards — card display components for each entity type.
 * Extracted from Compendium.jsx for maintainability.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, PenLine, Trash2, Zap, Package } from 'lucide-react'
import { Tooltip } from '../../components/Tooltip'
import { ENTITY_COLORS } from './CompendiumPanel'

/* ---- Character card ---- */
export function CharacterCard({ char, onEdit, onDelete, onToggleIgnore }) {
  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`char-card card ${expanded ? 'char-card--expanded' : ''} ${char.ignoredForOracle ? 'card--ignored' : ''}`}
      id={`char-card-${char.id}`}
      onClick={() => setExpanded(e => !e)}
      style={{ borderLeft: `3px solid ${ENTITY_COLORS.characters}` }}
    >
      <div className="char-card__top">
        <div className="char-card__avatar" style={{ background: ENTITY_COLORS.characters + '22', borderColor: ENTITY_COLORS.characters + '44' }}>
          <span style={{ color: ENTITY_COLORS.characters }}>
            {char.initials || (char.name || '').substring(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="char-card__info">
          <span className="char-card__name">{char.name}</span>
          {char.ignoredForOracle !== 1 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#d4a853', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={10} style={{ fill: 'currentColor' }} /> {t('tarjetas.contexto_ia')}
              </span>
            </div>
          )}
          {char.occupation && char.occupation !== 0 && char.occupation !== '0' && <span className="char-card__occupation">{char.occupation}</span>}
          <div className="char-card__tags">
            {char.role && char.role !== 0 && char.role !== '0' && <span className="badge badge-muted">{char.role}</span>}
            {char.age && (
              <span className="tag">
                {isNaN(char.age) ? char.age : t('tarjetas.años', { age: char.age })}
              </span>
            )}
          </div>
        </div>
        <div className="compendium-card-actions">
          <Tooltip content={char.ignoredForOracle === 1 ? t('tarjetas.excluido') : t('tarjetas.incluido')}>
            <button className={`btn btn-ghost btn-icon ${char.ignoredForOracle !== 1 ? 'compendium-zap-active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleIgnore(char) }}>
              <Zap size={14} style={{ fill: char.ignoredForOracle !== 1 ? 'currentColor' : 'none' }} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.editar')}>
            <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(char) }}><PenLine size={14} /></button>
          </Tooltip>
          <Tooltip content={t('tarjetas.eliminar')}>
            <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(char.id) }}><Trash2 size={14} /></button>
          </Tooltip>
        </div>
        <ChevronRight size={14} className={`char-card__chevron ${expanded ? 'char-card__chevron--open' : ''}`} />
      </div>

      {expanded && (
        <div className="char-card__body">
          <p className="char-card__desc">{char.description}</p>
          <TagList label={t('tarjetas.rasgos')} raw={char.traits} />
          {char.relations && char.relations.length > 0 && (
            <>
              <div className="char-card__section-label">{t('tarjetas.relaciones')}</div>
              {char.relations.map(r => (
                <div key={r.name} className="char-relation">
                  <span className="char-relation__name">{r.name}</span>
                  <span className="char-relation__type">{r.type}</span>
                </div>
              ))}
            </>
          )}
          <AssocList label={t('tarjetas.objetos')} raw={char.associatedObjects} />
          <AssocList label={t('tarjetas.lore')} raw={char.associatedLore} />
          <AssocList label={t('tarjetas.localizaciones')} raw={char.associatedLocations} />
        </div>
      )}
    </div>
  )
}

/* ---- Location card ---- */
export function LocationCard({ loc, onEdit, onDelete, onToggleIgnore }) {
  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`loc-card card ${expanded ? 'loc-card--expanded' : ''} ${loc.ignoredForOracle ? 'card--ignored' : ''}`}
      id={`loc-card-${loc.id}`}
      onClick={() => setExpanded(e => !e)}
      style={{ borderLeft: `3px solid ${ENTITY_COLORS.locations}` }}
    >
      <div className="loc-card__top">
        <div className="loc-card__dot" style={{ background: ENTITY_COLORS.locations }} />
        <div className="loc-card__info">
          <span className="loc-card__name">{loc.name}</span>
          {loc.ignoredForOracle !== 1 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#d4a853', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={10} style={{ fill: 'currentColor' }} /> {t('tarjetas.contexto_ia')}
              </span>
            </div>
          )}
          {loc.type && loc.type !== 0 && loc.type !== '0' && <span className="loc-card__type">{loc.type}</span>}
          <div className="loc-card__tags">
            {loc.tags?.slice(0, 3).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>
        <div className="compendium-card-actions">
          <Tooltip content={loc.ignoredForOracle === 1 ? t('tarjetas.excluido') : t('tarjetas.incluido')}>
            <button className={`btn btn-ghost btn-icon ${loc.ignoredForOracle !== 1 ? 'compendium-zap-active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleIgnore(loc) }}>
              <Zap size={14} style={{ fill: loc.ignoredForOracle !== 1 ? 'currentColor' : 'none' }} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.editar')}>
            <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(loc) }}><PenLine size={14} /></button>
          </Tooltip>
          <Tooltip content={t('tarjetas.eliminar')}>
            <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(loc.id) }}><Trash2 size={14} /></button>
          </Tooltip>
        </div>
        <ChevronRight size={14} className={`loc-card__chevron ${expanded ? 'loc-card__chevron--open' : ''}`} />
      </div>
      {expanded && (
        <div className="loc-card__body">
          <p className="loc-card__desc">{loc.description}</p>
          <div className="loc-card__climate">
            <span className="char-card__section-label">{t('tarjetas.clima')}</span>
            {loc.climate && loc.climate !== 0 && loc.climate !== '0' && <span className="loc-card__climate-val">{loc.climate}</span>}
          </div>
          <AssocList label={t('tarjetas.personajes')} raw={loc.associatedCharacters} />
          <AssocList label={t('tarjetas.objetos')} raw={loc.associatedObjects} />
          <AssocList label={t('tarjetas.lore')} raw={loc.associatedLore} />
          <div className="loc-card__all-tags">
            {toArray(loc.tags).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- Object card ---- */
export function ObjectCard({ obj, onEdit, onDelete, onToggleIgnore }) {
  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`obj-card card ${obj.ignoredForOracle ? 'card--ignored' : ''}`}
      id={`obj-card-${obj.id}`}
      onClick={() => setExpanded(e => !e)}
      style={{ borderLeft: `3px solid ${ENTITY_COLORS.objects}` }}
    >
      <div className="obj-card__top">
        <Package size={16} className="obj-card__icon" style={{ color: ENTITY_COLORS.objects }} />
        <div className="obj-card__info">
          <span className="obj-card__name">{obj.name}</span>
          {obj.ignoredForOracle !== 1 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#d4a853', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={10} style={{ fill: 'currentColor' }} /> {t('tarjetas.contexto_ia')}
              </span>
            </div>
          )}
          {obj.type && obj.type !== 0 && obj.type !== '0' && <span className="obj-card__type">{obj.type}</span>}
          <div className="obj-card__tags">
            {obj.currentOwner && <span className="badge badge-muted">{t('tarjetas.portador', { name: obj.currentOwner })}</span>}
            {obj.tags?.slice(0, 2).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>
        <div className="compendium-card-actions">
          <Tooltip content={obj.ignoredForOracle === 1 ? t('tarjetas.excluido') : t('tarjetas.incluido')}>
            <button className={`btn btn-ghost btn-icon ${obj.ignoredForOracle !== 1 ? 'compendium-zap-active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleIgnore(obj) }}>
              <Zap size={14} style={{ fill: obj.ignoredForOracle !== 1 ? 'currentColor' : 'none' }} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.editar')}>
            <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(obj) }}><PenLine size={14} /></button>
          </Tooltip>
          <Tooltip content={t('tarjetas.eliminar')}>
            <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(obj.id) }}><Trash2 size={14} /></button>
          </Tooltip>
        </div>
        <ChevronRight size={14} className={`obj-card__chevron ${expanded ? 'obj-card__chevron--open' : ''}`} />
      </div>
      {expanded && (
        <div className="obj-card__body">
          <p className="obj-card__desc">{obj.description}</p>
          <div className="obj-card__tags" style={{ marginBottom: 12 }}>
            {toArray(obj.tags).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
          {obj.importance && obj.importance !== 'Secundario' && (
            <div style={{ marginBottom: 8 }}>
              <span className={`badge ${obj.importance === 'MacGuffin' ? 'badge-gold' : 'badge-blue'}`}>
                {obj.importance === 'MacGuffin' ? t('tarjetas.macguffin') : t('tarjetas.relevante')}
              </span>
            </div>
          )}
          <div className="obj-card__meta">
            <span className="char-card__section-label">{t('tarjetas.origen')}</span>
            <span className="obj-card__origin">{obj.origin}</span>
          </div>
          <AssocList label={t('tarjetas.personajes')} raw={obj.associatedCharacters} />
          <AssocList label={t('tarjetas.lore')} raw={obj.associatedLore} />
          <AssocList label={t('tarjetas.localizaciones')} raw={obj.associatedLocations} />
        </div>
      )}
    </div>
  )
}

/* ---- Lore entry card ---- */
export function LoreCard({ entry, onEdit, onDelete, onToggleIgnore }) {
  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`lore-card card ${entry.ignoredForOracle ? 'card--ignored' : ''}`}
      id={`lore-card-${entry.id}`}
      onClick={() => setExpanded(e => !e)}
      style={{ borderLeft: `3px solid ${ENTITY_COLORS.lore}` }}
    >
      <div className="lore-card__top">
        <div className="lore-card__cat-dot" style={{ background: ENTITY_COLORS.lore }} />
        <div className="lore-card__info">
          <span className="lore-card__title">{entry.title}</span>
          {entry.ignoredForOracle !== 1 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#d4a853', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={10} style={{ fill: 'currentColor' }} /> {t('tarjetas.contexto_ia')}
              </span>
            </div>
          )}
          {entry.category && entry.category !== 0 && entry.category !== '0' && <span className="lore-card__cat">{entry.category}</span>}
          <div className="lore-card__tags">
            {entry.tags?.slice(0, 3).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>
        <div className="compendium-card-actions">
          <Tooltip content={entry.ignoredForOracle === 1 ? t('tarjetas.excluido') : t('tarjetas.incluido')}>
            <button className={`btn btn-ghost btn-icon ${entry.ignoredForOracle !== 1 ? 'compendium-zap-active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleIgnore(entry) }}>
              <Zap size={14} style={{ fill: entry.ignoredForOracle !== 1 ? 'currentColor' : 'none' }} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.editar')}>
            <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(entry) }}><PenLine size={14} /></button>
          </Tooltip>
          <Tooltip content={t('tarjetas.eliminar')}>
            <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}><Trash2 size={14} /></button>
          </Tooltip>
        </div>
        <ChevronRight size={14} className={`lore-card__chevron ${expanded ? 'lore-card__chevron--open' : ''}`} />
      </div>
      {expanded && (
        <div className="lore-card__body">
          <p className="lore-card__summary">{entry.summary}</p>
          <AssocList label={t('tarjetas.personajes')} raw={entry.associatedCharacters} />
          <AssocList label={t('tarjetas.localizaciones')} raw={entry.associatedLocations} />
          <AssocList label={t('tarjetas.objetos')} raw={entry.associatedObjects} />
          <div className="lore-card__all-tags" style={{ marginTop: 8 }}>
            {toArray(entry.tags).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>
      )}
    </div>
  )
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: 4 }}>
        {items.map(name => <span key={name} className="tag">{name}</span>)}
      </div>
    </div>
  )
}
