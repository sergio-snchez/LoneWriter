import { useState, useEffect, useMemo } from 'react'
import {
  Users, MapPin, Package, BookOpen, Star, ExternalLink,
  Search, Filter, ChevronRight, Plus, Tag, PenLine, Trash2, X
} from 'lucide-react'
import { useNovel } from '../context/NovelContext'
import { useModal } from '../context/ModalContext'
import { extractKeywords, TABLE_CONFIG } from '../services/compendiumSearch'
import './Compendium.css'

/* ---- Curated Color Palette ---- */
const COLOR_PALETTE = [
  '#6b9fd4', '#5cb98a', '#d4a853', '#e07070',
  '#9b72cf', '#5bb4c4', '#d4845a', '#d4688a',
  '#b0b0b0', '#c4b090', '#a07850', '#7ab87a',
  '#7a72d4', '#d4a07a', '#8899aa', '#e8c47a',
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {COLOR_PALETTE.map(color => (
        <button
          key={color}
          type="button"
          className={`color-swatch ${value === color ? 'color-swatch--active' : ''}`}
          style={{ background: color }}
          onClick={() => onChange(color)}
          title={color}
        />
      ))}
    </div>
  );
}

/* ---- Panel de Formulario Lateral ---- */
function CompendiumPanel({ type, item, characters, onClose, onSave }) {
  const [formData, setFormData] = useState(item || {});

  useEffect(() => {
    const initial = { ...item };
    if (initial.traits) initial._rawTraits = initial.traits.join(', ');
    if (initial.tags) initial._rawTags = initial.tags.join(', ');
    setFormData(initial);
  }, [item, type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRelationChange = (idx, field, value) => {
    setFormData(prev => {
      const nextRels = [...(prev.relations || [])];
      nextRels[idx] = { ...nextRels[idx], [field]: value };
      return { ...prev, relations: nextRels };
    });
  };

  const addRelation = () => {
    setFormData(prev => ({
      ...prev,
      relations: [...(prev.relations || []), { name: '', type: '', reverseType: '' }]
    }));
  };

  const removeRelation = (idx) => {
    setFormData(prev => {
      const nextRels = [...(prev.relations || [])];
      nextRels.splice(idx, 1);
      return { ...prev, relations: nextRels };
    });
  };

  const handleSubmit = () => {
    const data = { ...formData };
    
    // Fallbacks si no hay color o iniciales
    if (type === 'characters') {
      data.name = data.name || 'Nuevo personaje';
      data.initials = data.initials || data.name.substring(0,2).toUpperCase();
      data.color = data.color || '#6b9fd4';
    } else if (type === 'locations') {
      data.name = data.name || 'Nueva localización';
      data.color = data.color || '#6b9fd4';
    } else if (type === 'objects') {
      data.name = data.name || 'Nuevo objeto';
    } else if (type === 'lore') {
      data.title = data.title || 'Nueva entrada de lore';
    }
    
    // Parse raw strings back to arrays
    if (data._rawTraits !== undefined) {
      data.traits = data._rawTraits.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (data._rawTags !== undefined) {
      data.tags = data._rawTags.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Cleanup generic raw states
    delete data._rawTraits;
    delete data._rawTags;
    
    onSave(data);
  };

  let titleText = item ? `Editar entrada` : `Añadir entrada`;

  return (
    <div className="compendium-view__panel">
      <div className="compendium-panel__header">
        <span className="compendium-panel__title">{titleText}</span>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
      </div>
      
      <div className="compendium-panel__body">
        {type === 'characters' && (
          <>
            <div className="compendium-form-group">
              <label>Nombre</label>
              <input name="name" value={formData.name || ''} onChange={handleChange} autoFocus placeholder="Lyra Ashveil" />
            </div>
            <div className="compendium-form-group">
              <label>Rol principal</label>
              <input name="role" value={formData.role || ''} onChange={handleChange} placeholder="Protagonista, Antagonista..." />
            </div>
            <div className="compendium-form-group">
              <label>Ocupación</label>
              <input name="occupation" value={formData.occupation || ''} onChange={handleChange} placeholder="Cartógrafa, Guardia..." />
            </div>
            <div className="compendium-form-group">
              <label>Edad (Opcional)</label>
              <input type="number" name="age" value={formData.age || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>Descripción detallada</label>
              <textarea name="description" value={formData.description || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>Rasgos (separados por coma)</label>
              <input name="_rawTraits" value={formData._rawTraits || ''} onChange={handleChange} placeholder="Valiente, Cínica, Leal..." />
            </div>
            <div className="compendium-form-group">
              <label>Relaciones</label>
              {characters && characters.filter(c => c.name !== formData.name).length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  Añade más personajes al compendio para crear vínculos.
                </p>
              ) : (
                <>
                  {(formData.relations || []).map((rel, i) => (
                    <div key={i} className="relation-row">
                      <select
                        value={rel.name}
                        onChange={e => handleRelationChange(i, 'name', e.target.value)}
                      >
                        <option value="" disabled>Seleccionar personaje...</option>
                        {(characters || []).map(c => c.name !== formData.name && (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <div className="relation-row__fields">
                        <input
                          placeholder="Para mí es... (ej: Sobrino)"
                          value={rel.type}
                          onChange={e => handleRelationChange(i, 'type', e.target.value)}
                        />
                        <input
                          placeholder="Para él/ella soy... (ej: Tía)"
                          value={rel.reverseType}
                          onChange={e => handleRelationChange(i, 'reverseType', e.target.value)}
                          style={{ fontSize: '12px', opacity: 0.85 }}
                        />
                      </div>
                      <button className="btn btn-ghost btn-icon text-danger" onClick={() => removeRelation(i)} title="Eliminar relación">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button className="btn btn-ghost" onClick={addRelation} style={{ alignSelf: 'flex-start', fontSize: 12, marginTop: '4px' }}>
                    <Plus size={13} /> Añadir vínculo
                  </button>
                </>
              )}
            </div>
            <div className="compendium-form-group">
              <label>Color representativo</label>
              <ColorPicker
                value={formData.color || '#6b9fd4'}
                onChange={(c) => setFormData(prev => ({ ...prev, color: c }))}
              />
            </div>
          </>
        )}

        {type === 'locations' && (
          <>
            <div className="compendium-form-group">
              <label>Nombre del lugar</label>
              <input name="name" value={formData.name || ''} onChange={handleChange} autoFocus />
            </div>
            <div className="compendium-form-group">
              <label>Tipo</label>
              <input name="type" value={formData.type || ''} onChange={handleChange} placeholder="Ciudad, Ruinas, Mar..." />
            </div>
            <div className="compendium-form-group">
              <label>Clima / Ambiente</label>
              <input name="climate" value={formData.climate || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>Descripción</label>
              <textarea name="description" value={formData.description || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>Etiquetas / Tags (separados por coma)</label>
              <input name="_rawTags" value={formData._rawTags || ''} onChange={handleChange} placeholder="Magia, Peligro, Imperial" />
            </div>
            {characters && characters.length > 0 && (
              <div className="compendium-form-group">
                <label>Personajes asociados al lugar</label>
                <div className="relation-chars-grid">
                  {characters.map(c => {
                    const assoc = formData.associatedCharacters || [];
                    const isChecked = assoc.includes(c.name);
                    return (
                      <label key={c.id} className="relation-char-check">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFormData(prev => ({
                              ...prev,
                              associatedCharacters: isChecked
                                ? (prev.associatedCharacters || []).filter(n => n !== c.name)
                                : [...(prev.associatedCharacters || []), c.name]
                            }));
                          }}
                        />
                        <span style={{ color: c.color || 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="compendium-form-group">
              <label>Color en el mapa</label>
              <ColorPicker
                value={formData.color || '#5cb98a'}
                onChange={(c) => setFormData(prev => ({ ...prev, color: c }))}
              />
            </div>
          </>
        )}

        {type === 'objects' && (
          <>
            <div className="compendium-form-group">
              <label>Nombre del artefacto</label>
              <input name="name" value={formData.name || ''} onChange={handleChange} autoFocus />
            </div>
            <div className="compendium-form-group">
              <label>Tipo</label>
              <input name="type" value={formData.type || ''} onChange={handleChange} placeholder="Arma, Documento, Joya..." />
            </div>
            <div className="compendium-form-group">
              <label>Importancia narrativa</label>
              <select name="importance" value={formData.importance || 'Secundario'} onChange={handleChange}>
                <option value="Secundario">Secundario</option>
                <option value="Relevante">Relevante</option>
                <option value="MacGuffin">MacGuffin (elemento clave)</option>
              </select>
            </div>
            <div className="compendium-form-group">
              <label>Portador actual</label>
              <select 
                name="currentOwner" 
                value={formData.currentOwner || 'Desconocido'} 
                onChange={handleChange}
                style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-base)', color: 'var(--text-primary)', width: '100%' }}
              >
                <option value="Desconocido">Desconocido</option>
                {(characters || []).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="compendium-form-group">
              <label>Origen histórico</label>
              <input name="origin" value={formData.origin || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>Descripción</label>
              <textarea name="description" value={formData.description || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>Etiquetas (separadas por coma)</label>
              <input name="_rawTags" value={formData._rawTags || ''} onChange={handleChange} />
            </div>
          </>
        )}

        {type === 'lore' && (
          <>
            <div className="compendium-form-group">
              <label>Título del lore</label>
              <input name="title" value={formData.title || ''} onChange={handleChange} autoFocus />
            </div>
            <div className="compendium-form-group">
              <label>Categoría lógica</label>
              <input name="category" value={formData.category || ''} onChange={handleChange} placeholder="Sociedad, Magia, Religión..." />
            </div>
            <div className="compendium-form-group">
              <label>Resumen / Contenido</label>
              <textarea name="summary" value={formData.summary || ''} onChange={handleChange} style={{minHeight: '120px'}} />
            </div>
            <div className="compendium-form-group">
              <label>Etiquetas (separadas por coma)</label>
              <input name="_rawTags" value={formData._rawTags || ''} onChange={handleChange} />
            </div>
          </>
        )}
      </div>

      <div className="compendium-panel__footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Guardar entrada</button>
      </div>
    </div>
  )
}

/* ---- Character card ---- */
function CharacterCard({ char, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`char-card card ${expanded ? 'char-card--expanded' : ''}`}
      id={`char-card-${char.id}`}
      onClick={() => setExpanded(e => !e)}
      style={{ borderLeft: `3px solid ${char.color || '#6b9fd4'}` }}
    >
      <div className="char-card__top">
        <div className="char-card__avatar" style={{ background: char.color + '22', borderColor: char.color + '44' }}>
          <span style={{ color: char.color }}>{char.initials}</span>
        </div>
        <div className="char-card__info">
          <span className="char-card__name">{char.name}</span>
          <span className="char-card__occupation">{char.occupation}</span>
          <div className="char-card__tags">
            <span className="badge badge-muted">{char.role}</span>
            {char.age && <span className="tag">{char.age} años</span>}
          </div>
        </div>
        <div className="compendium-card-actions">
          <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(char); }} title="Editar"><PenLine size={14} /></button>
          <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(char.id); }} title="Eliminar"><Trash2 size={14} /></button>
        </div>
        <ChevronRight size={14} className={`char-card__chevron ${expanded ? 'char-card__chevron--open' : ''}`} />
      </div>

      {expanded && (
        <div className="char-card__body">
          <p className="char-card__desc">{char.description}</p>
          {char.traits && char.traits.length > 0 && (
            <>
              <div className="char-card__section-label">Rasgos</div>
              <div className="char-card__traits">
                {char.traits.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            </>
          )}
          {char.relations && char.relations.length > 0 && (
            <>
              <div className="char-card__section-label">Relaciones</div>
              {char.relations.map(r => (
                <div key={r.name} className="char-relation">
                  <span className="char-relation__name">{r.name}</span>
                  <span className="char-relation__type">{r.type}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ---- Location card ---- */
function LocationCard({ loc, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`loc-card card ${expanded ? 'loc-card--expanded' : ''}`}
      id={`loc-card-${loc.id}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="loc-card__top">
        <div className="loc-card__dot" style={{ background: loc.color || '#5cb98a' }} />
        <div className="loc-card__info">
          <span className="loc-card__name">{loc.name}</span>
          <span className="loc-card__type">{loc.type}</span>
          <div className="loc-card__tags">
            {loc.tags?.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
        <div className="compendium-card-actions">
          <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(loc); }} title="Editar"><PenLine size={14} /></button>
          <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(loc.id); }} title="Eliminar"><Trash2 size={14} /></button>
        </div>
        <ChevronRight size={14} className={`loc-card__chevron ${expanded ? 'loc-card__chevron--open' : ''}`} />
      </div>
      {expanded && (
        <div className="loc-card__body">
          <p className="loc-card__desc">{loc.description}</p>
          <div className="loc-card__climate">
            <span className="char-card__section-label">Clima</span>
            <span className="loc-card__climate-val">{loc.climate}</span>
          </div>
          {loc.associatedCharacters && loc.associatedCharacters.length > 0 && (
            <div>
              <span className="char-card__section-label">Personajes asociados</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: 4 }}>
                {loc.associatedCharacters.map(name => (
                  <span key={name} className="tag">{name}</span>
                ))}
              </div>
            </div>
          )}
          <div className="loc-card__all-tags">
            {loc.tags?.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- Object card ---- */
function ObjectCard({ obj, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className="obj-card card"
      id={`obj-card-${obj.id}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="obj-card__top">
        <Package size={16} className="obj-card__icon" />
        <div className="obj-card__info">
          <span className="obj-card__name">{obj.name}</span>
          <span className="obj-card__type">{obj.type}</span>
          <div className="obj-card__tags">
            {obj.currentOwner && <span className="badge badge-muted">Portador: {obj.currentOwner}</span>}
            {obj.tags?.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
        <div className="compendium-card-actions">
          <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(obj); }} title="Editar"><PenLine size={14} /></button>
          <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(obj.id); }} title="Eliminar"><Trash2 size={14} /></button>
        </div>
        <ChevronRight size={14} className={`obj-card__chevron ${expanded ? 'obj-card__chevron--open' : ''}`} />
      </div>
      {expanded && (
        <div className="obj-card__body">
          <p className="obj-card__desc">{obj.description}</p>
          {obj.importance && obj.importance !== 'Secundario' && (
            <div style={{ marginBottom: 8 }}>
              <span className={`badge ${obj.importance === 'MacGuffin' ? 'badge-gold' : 'badge-blue'}`}>
                {obj.importance === 'MacGuffin' ? '⚡ MacGuffin' : '★ Relevante'}
              </span>
            </div>
          )}
          <div className="obj-card__meta">
            <span className="char-card__section-label">Origen</span>
            <span className="obj-card__origin">{obj.origin}</span>
          </div>
          <div className="obj-card__tags">
            {obj.tags?.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- Lore entry card ---- */
function LoreCard({ entry, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className="lore-card card"
      id={`lore-card-${entry.id}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="lore-card__top">
        <div className="lore-card__cat-dot" />
        <div className="lore-card__info">
          <span className="lore-card__title">{entry.title}</span>
          <span className="lore-card__cat">{entry.category}</span>
          <div className="lore-card__tags">
            {entry.tags?.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
        <div className="compendium-card-actions">
          <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(entry); }} title="Editar"><PenLine size={14} /></button>
          <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }} title="Eliminar"><Trash2 size={14} /></button>
        </div>
        <ChevronRight size={14} className={`lore-card__chevron ${expanded ? 'lore-card__chevron--open' : ''}`} />
      </div>
      {expanded && (
        <div className="lore-card__body">
          <p className="lore-card__summary">{entry.summary}</p>
          <div className="lore-card__all-tags">
            {entry.tags?.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- Main Compendium view ---- */
export default function CompendiumView() {
  const { characters, locations, objects, lore, addCompendiumEntry, updateCompendiumEntry, deleteCompendiumEntry } = useNovel()
  const { openModal } = useModal()
  const [activeSection, setActiveSection] = useState('characters')
  const [query, setQuery] = useState('')

  // Edit Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null means "Add new"

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  // Limpiar filtros al cambiar de sección
  useEffect(() => {
    setActiveFilters([]);
    setIsFilterOpen(false);
  }, [activeSection]);

  const getAvailableFilters = () => {
    const list = new Set();
    if (activeSection === 'characters') {
      characters.forEach(c => {
        if (c.role) list.add(c.role);
        if (c.tags) c.tags.forEach(t => list.add(t));
        if (c.traits) c.traits.forEach(t => list.add(t));
      });
    } else if (activeSection === 'locations') {
      locations.forEach(l => {
        if (l.type) list.add(l.type);
        if (l.tags) l.tags.forEach(t => list.add(t));
      });
    } else if (activeSection === 'objects') {
      objects.forEach(o => {
        if (o.type) list.add(o.type);
        if (o.tags) o.tags.forEach(t => list.add(t));
      });
    } else if (activeSection === 'lore') {
      lore.forEach(e => {
        if (e.category) list.add(e.category);
        if (e.tags) e.tags.forEach(t => list.add(t));
      });
    }
    return Array.from(list).sort();
  };

  const toggleFilter = (f) => {
    setActiveFilters(prev => 
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const matchesFilters = (item) => {
    if (activeFilters.length === 0) return true;
    let itemTags = [];
    if (activeSection === 'characters') {
      itemTags = [item.role, ...(item.tags || []), ...(item.traits || [])];
    } else if (activeSection === 'locations') {
      itemTags = [item.type, ...(item.tags || [])];
    } else if (activeSection === 'objects') {
      itemTags = [item.type, ...(item.tags || [])];
    } else if (activeSection === 'lore') {
      itemTags = [item.category, ...(item.tags || [])];
    }
    return activeFilters.some(f => itemTags.includes(f));
  };

  const SECTIONS = [
    { id: 'characters', label: 'Personajes', icon: Users, count: characters.length },
    { id: 'locations',  label: 'Localizaciones', icon: MapPin, count: locations.length },
    { id: 'objects',    label: 'Objetos y artefactos', icon: Package, count: objects.length },
    { id: 'lore',       label: 'Lore e historia', icon: BookOpen, count: lore.length },
  ]

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsPanelOpen(true);
  };

  const handleDelete = async (id) => {
    const item = [...characters, ...locations, ...objects, ...lore].find(i => i.id === id);
    const itemName = item?.name || item?.title || 'esta entrada';
    
    openModal('confirm', {
      title: 'Eliminar entrada',
      message: `¿Seguro que quieres eliminar "${itemName}" permanentemente del compendio?`,
      isDanger: true,
      confirmLabel: 'Eliminar Permanentemente',
      onConfirm: async () => {
        await deleteCompendiumEntry(activeSection, id);
        if (editingItem && editingItem.id === id) {
          setIsPanelOpen(false);
        }
      }
    });
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsPanelOpen(true);
  };

  const handleSavePanel = async (data) => {
    const isUpdate = !!editingItem;
    
    if (activeSection === 'characters') {
      const oldRels = isUpdate ? (editingItem.relations || []) : [];
      let newRels = data.relations || [];
      // Filtrar inválidos
      newRels = newRels.filter(r => r.name);
      data.relations = newRels;

      // Bidirectional sync logic
      const oldName = isUpdate ? editingItem.name : data.name;
      const c1Name = data.name;
      const c2Updates = {};
      const getC2Data = (c2Name) => {
         const found = characters.find(c => c.name === c2Name);
         if (!found) return null;
         if (!c2Updates[found.id]) c2Updates[found.id] = { ...found, relations: [...(found.relations || [])] };
         return c2Updates[found.id];
      };

      const removedRels = oldRels.filter(or => !newRels.some(nr => nr.name === or.name));
      
      for (const removed of removedRels) {
        const c2Data = getC2Data(removed.name);
        if (c2Data) {
          c2Data.relations = c2Data.relations.filter(r => r.name !== oldName);
        }
      }
      for (const added of newRels) {
        const c2Data = getC2Data(added.name);
        if (c2Data) {
          const existIdx = c2Data.relations.findIndex(r => r.name === oldName);
          const reverseRel = { 
            name: c1Name, 
            type: added.reverseType || '', 
            reverseType: added.type || '' 
          };
          
          if (existIdx >= 0) {
            c2Data.relations[existIdx] = reverseRel;
          } else {
            c2Data.relations.push(reverseRel);
          }
        }
      }

      // Execute all logically calculated state updates
      const promises = [];
      for (const id in c2Updates) {
        promises.push(updateCompendiumEntry('characters', id, c2Updates[id]));
      }
      if (isUpdate) promises.push(updateCompendiumEntry(activeSection, editingItem.id, data));
      else promises.push(addCompendiumEntry(activeSection, data));

      await Promise.all(promises);
      setIsPanelOpen(false);
      return;
    } // -- Fin logica bidireccional

    if (isUpdate) {
      await updateCompendiumEntry(activeSection, editingItem.id, data);
    } else {
      await addCompendiumEntry(activeSection, data);
    }
    setIsPanelOpen(false);
  };

  const matchesQuery = (item) => {
    if (!query) return true;
    const config = TABLE_CONFIG[activeSection];
    if (!config) return true;
    const keywords = extractKeywords(query);
    if (keywords.length === 0) {
      const lowerQuery = query.toLowerCase();
      const nameField = config.nameField;
      if (item[nameField]?.toLowerCase().includes(lowerQuery)) return true;
      return false;
    }
    let totalMatches = 0;
    for (const field of config.searchableFields) {
      const value = item[field];
      if (Array.isArray(value)) {
        for (const v of value) {
          if (typeof v === 'string') {
            for (const kw of keywords) {
              if (v.toLowerCase().includes(kw)) totalMatches++;
            }
          } else if (typeof v === 'object' && v !== null) {
            for (const val of Object.values(v)) {
              if (typeof val === 'string') {
                for (const kw of keywords) {
                  if (val.toLowerCase().includes(kw)) totalMatches++;
                }
              }
            }
          }
        }
      } else if (typeof value === 'string') {
        for (const kw of keywords) {
          if (value.toLowerCase().includes(kw)) totalMatches++;
        }
      }
    }
    return totalMatches > 0;
  };

  return (
    <div className="compendium-view">
      {/* Left column – section tabs */}
      <div className="compendium-view__tabs">
        <div className="compendium-view__tabs-header">
          <h1 className="section-title">Compendio</h1>
          <p className="section-subtitle">Referencia de la novela</p>
        </div>
        <div className="compendium-tabs">
          {SECTIONS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              id={`compendium-tab-${id}`}
              className={`compendium-tab ${activeSection === id ? 'compendium-tab--active' : ''}`}
              onClick={() => {
                setActiveSection(id);
                setIsPanelOpen(false); // Close panel when changing sections
              }}
            >
              <span className="compendium-tab__icon"><Icon size={16} /></span>
              <span className="compendium-tab__label">{label}</span>
              <span className="compendium-tab__count">{count}</span>
            </button>
          ))}
        </div>

        {/* Summary mini-stats */}
        <div className="compendium-summary">
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{characters.length}</span>
            <span className="compendium-summary__label">Personajes</span>
          </div>
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{locations.length}</span>
            <span className="compendium-summary__label">Lugares</span>
          </div>
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{objects.length}</span>
            <span className="compendium-summary__label">Objetos</span>
          </div>
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{lore.length}</span>
            <span className="compendium-summary__label">Entradas lore</span>
          </div>
        </div>
      </div>

      {/* Center column – content */}
      <div className="compendium-view__content">
        {/* Toolbar */}
        <div className="compendium-toolbar">
          <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder={`Buscar en ${SECTIONS.find(s=>s.id===activeSection)?.label.toLowerCase()} (nombre, descripción, tags)...`}
              value={query}
              onChange={e => setQuery(e.target.value)}
              id="compendium-search-input"
            />
          </div>
          <div style={{ position: 'relative' }}>
            <button 
              className={`btn ${isFilterOpen || activeFilters.length > 0 ? 'btn-primary' : 'btn-ghost'}`} 
              id="compendium-filter-btn"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter size={13} />
              Filtrar {activeFilters.length > 0 && `(${activeFilters.length})`}
            </button>
            {isFilterOpen && (
              <div className="compendium-filter-popup">
                <div className="compendium-filter-popup__header">
                  <span className="compendium-filter-popup__title">Filtrar por etiquetas</span>
                  {activeFilters.length > 0 && (
                    <button className="btn btn-ghost" onClick={() => setActiveFilters([])} style={{padding: '2px 6px', fontSize: 11}}>Limpiar</button>
                  )}
                </div>
                <div className="compendium-filter-popup__body">
                  {getAvailableFilters().length === 0 ? (
                    <div style={{color: 'var(--text-muted)', fontSize: 12}}>No hay etiquetas disponibles</div>
                  ) : (
                    getAvailableFilters().map(f => (
                      <label key={f} className="compendium-filter-option">
                        <input 
                          type="checkbox" 
                          checked={activeFilters.includes(f)} 
                          onChange={() => toggleFilter(f)} 
                        />
                        {f}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-primary" id="compendium-add-btn" onClick={handleAdd}>
            <Plus size={13} />
            Añadir entrada
          </button>
        </div>

        {/* Cards */}
        <div className="compendium-cards">
          {activeSection === 'characters' && characters
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(c => <CharacterCard key={c.id} char={c} onEdit={handleEdit} onDelete={handleDelete} />)}

          {activeSection === 'locations' && locations
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(l => <LocationCard key={l.id} loc={l} onEdit={handleEdit} onDelete={handleDelete} />)}

          {activeSection === 'objects' && objects
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(o => <ObjectCard key={o.id} obj={o} onEdit={handleEdit} onDelete={handleDelete} />)}

          {activeSection === 'lore' && lore
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(e => <LoreCard key={e.id} entry={e} onEdit={handleEdit} onDelete={handleDelete} />)}
            
          {/* Empty state visual fallback */}
          {((activeSection === 'characters' && characters.length === 0) ||
            (activeSection === 'locations' && locations.length === 0) ||
            (activeSection === 'objects' && objects.length === 0) ||
            (activeSection === 'lore' && lore.length === 0)) && (
              <div className="compendium-empty-state">
                <div className="compendium-empty-state__icon">
                  {activeSection === 'characters' && <Users size={36} />}
                  {activeSection === 'locations' && <MapPin size={36} />}
                  {activeSection === 'objects' && <Package size={36} />}
                  {activeSection === 'lore' && <BookOpen size={36} />}
                </div>
                <p className="compendium-empty-state__title">
                  {activeSection === 'characters' && 'Sin personajes todavía'}
                  {activeSection === 'locations' && 'Sin localizaciones todavía'}
                  {activeSection === 'objects' && 'Sin objetos todavía'}
                  {activeSection === 'lore' && 'Sin entradas de lore todavía'}
                </p>
                <p className="compendium-empty-state__sub">Da vida a tu mundo añadiendo la primera entrada.</p>
                <button className="btn btn-primary" onClick={handleAdd}>
                  <Plus size={14} />
                  Añadir primera entrada
                </button>
              </div>
          )}
        </div>
      </div>
      
      {/* Right Slide Panel for Edit/Create */}
      {isPanelOpen && (
        <CompendiumPanel 
          type={activeSection} 
          item={editingItem} 
          characters={characters}
          onClose={() => setIsPanelOpen(false)} 
          onSave={handleSavePanel} 
        />
      )}
    </div>
  )
}
