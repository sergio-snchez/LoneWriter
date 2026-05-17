import { useTranslation } from 'react-i18next'
import { Filter } from 'lucide-react'

function getAvailableFilters(activeSection, characters, locations, objects, lore) {
  const list = new Set()
  const ensureArr = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s=>s.trim()).filter(Boolean) : [])

  if (activeSection === 'characters') {
    characters.forEach(c => { if (c.role) list.add(c.role); ensureArr(c.tags).forEach(t => list.add(t)); ensureArr(c.traits).forEach(t => list.add(t)) })
  } else if (activeSection === 'locations') {
    locations.forEach(l => { if (l.type) list.add(l.type); ensureArr(l.tags).forEach(t => list.add(t)) })
  } else if (activeSection === 'objects') {
    objects.forEach(o => { if (o.type) list.add(o.type); ensureArr(o.tags).forEach(t => list.add(t)) })
  } else if (activeSection === 'lore') {
    lore.forEach(e => { if (e.category) list.add(e.category); ensureArr(e.tags).forEach(t => list.add(t)) })
  }
  return Array.from(list).sort()
}

function matchesFilters(item, activeFilters, activeSection) {
  if (activeFilters.length === 0) return true
  const ensureArr = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s=>s.trim()).filter(Boolean) : [])
  let itemTags = []

  if (activeSection === 'characters') itemTags = [item.role, ...ensureArr(item.tags), ...ensureArr(item.traits)]
  else if (activeSection === 'locations') itemTags = [item.type, ...ensureArr(item.tags)]
  else if (activeSection === 'objects') itemTags = [item.type, ...ensureArr(item.tags)]
  else if (activeSection === 'lore') itemTags = [item.category, ...ensureArr(item.tags)]

  return activeFilters.some(f => itemTags.includes(f))
}

export function CompendiumFilters({ isFilterOpen, activeFilters, activeSection, characters, locations, objects, lore, onToggle, onSetActiveFilters }) {
  const { t } = useTranslation('compendium')

  const toggleFilter = (f) => {
    onSetActiveFilters(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )
  }

  const available = getAvailableFilters(activeSection, characters, locations, objects, lore)

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`btn ${isFilterOpen || activeFilters.length > 0 ? 'btn-primary' : 'btn-ghost'}`}
        id="compendium-filter-btn"
        onClick={onToggle}
      >
        <Filter size={13} />
        {activeFilters.length > 0 ? t('toolbar.filtrar_con_cuenta', { count: activeFilters.length }) : t('toolbar.filtrar')}
      </button>
      {isFilterOpen && (
        <div className="compendium-filter-popup">
          <div className="compendium-filter-popup__header">
            <span className="compendium-filter-popup__title">{t('toolbar.filtrar_titulo')}</span>
            {activeFilters.length > 0 && (
              <button className="btn btn-ghost" onClick={() => onSetActiveFilters([])} style={{padding: '2px 6px', fontSize: 11}}>{t('toolbar.limpiar')}</button>
            )}
          </div>
          <div className="compendium-filter-popup__body">
            {available.length === 0 ? (
              <div style={{color: 'var(--text-muted)', fontSize: 12}}>{t('toolbar.sin_etiquetas')}</div>
            ) : (
              available.map(f => (
                <label key={f} className="compendium-filter-option">
                  <input type="checkbox" checked={activeFilters.includes(f)} onChange={() => toggleFilter(f)} />
                  {f}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { getAvailableFilters, matchesFilters }
