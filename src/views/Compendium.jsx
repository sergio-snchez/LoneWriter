import { useState, useEffect } from 'react'
import {
  Users, MapPin, Package, BookOpen, Star, ExternalLink,
  Search, Filter, ChevronRight, Plus, Tag, PenLine, Trash2, X
} from 'lucide-react'
import { useNovel } from '../context/NovelContext'
import { useModal } from '../context/ModalContext'
import './Compendium.css'

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
              {(formData.relations || []).map((rel, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <select 
                    value={rel.name} 
                    onChange={e => handleRelationChange(i, 'name', e.target.value)}
                    style={{ flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                  >
                    <option value="" disabled>Seleccionar personaje...</option>
                    {(characters || []).map(c => c.name !== formData.name && (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input 
                      placeholder="Para mí es... (ej: Sobrino)" 
                      value={rel.type} 
                      onChange={e => handleRelationChange(i, 'type', e.target.value)}
                      style={{ width: '100%' }}
                    />
                    <input 
                      placeholder="Para él soy... (ej: Tía)" 
                      value={rel.reverseType} 
                      onChange={e => handleRelationChange(i, 'reverseType', e.target.value)}
                      style={{ width: '100%', fontSize: '11px', opacity: 0.8 }}
                    />
                  </div>
                  <button className="btn btn-ghost text-danger" onClick={() => removeRelation(i)} style={{ padding: '0 8px', alignSelf: 'flex-start', marginTop: '4px' }} title="Eliminar relación">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button className="btn btn-ghost" onClick={addRelation} style={{ alignSelf: 'flex-start', fontSize: 13, marginTop: '4px' }}>
                <Plus size={13} style={{marginRight: 4}}/> Añadir vínculo explícito
              </button>
            </div>
            <div className="compendium-form-group">
              <label>Color representativo</label>
              <input type="color" name="color" value={formData.color || '#6b9fd4'} onChange={handleChange} />
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
            <div className="compendium-form-group">
              <label>Color en el mapa</label>
              <input type="color" name="color" value={formData.color || '#5cb98a'} onChange={handleChange} />
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
          <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onEdit(char); }} title="Editar"><PenLine size={14} /> Editar</button>
          <button className="btn btn-ghost text-danger" onClick={(e) => { e.stopPropagation(); onDelete(char.id); }} title="Eliminar"><Trash2 size={14} /> Eliminar</button>
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
        </div>
        <div className="loc-card__tags">
          {loc.tags?.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
        </div>
        <div className="compendium-card-actions">
          <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onEdit(loc); }} title="Editar"><PenLine size={14} /> Editar</button>
          <button className="btn btn-ghost text-danger" onClick={(e) => { e.stopPropagation(); onDelete(loc.id); }} title="Eliminar"><Trash2 size={14} /> Eliminar</button>
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
        </div>
        <div className="obj-card__owner">
          <span className="char-card__section-label">Portador</span>
          <span className="obj-card__owner-name">{obj.currentOwner}</span>
        </div>
        <div className="compendium-card-actions">
          <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onEdit(obj); }} title="Editar"><PenLine size={14} /> Editar</button>
          <button className="btn btn-ghost text-danger" onClick={(e) => { e.stopPropagation(); onDelete(obj.id); }} title="Eliminar"><Trash2 size={14} /> Eliminar</button>
        </div>
        <ChevronRight size={14} className={`obj-card__chevron ${expanded ? 'obj-card__chevron--open' : ''}`} />
      </div>
      {expanded && (
        <div className="obj-card__body">
          <p className="obj-card__desc">{obj.description}</p>
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
        </div>
        <div className="lore-card__tags">
          {entry.tags?.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
        </div>
        <div className="compendium-card-actions">
          <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onEdit(entry); }} title="Editar"><PenLine size={14} /> Editar</button>
          <button className="btn btn-ghost text-danger" onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }} title="Eliminar"><Trash2 size={14} /> Eliminar</button>
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
              placeholder={`Buscar en ${SECTIONS.find(s=>s.id===activeSection)?.label.toLowerCase()}...`}
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
            .filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()))
            .filter(matchesFilters)
            .map(c => <CharacterCard key={c.id} char={c} onEdit={handleEdit} onDelete={handleDelete} />)}

          {activeSection === 'locations' && locations
            .filter(l => !query || l.name.toLowerCase().includes(query.toLowerCase()))
            .filter(matchesFilters)
            .map(l => <LocationCard key={l.id} loc={l} onEdit={handleEdit} onDelete={handleDelete} />)}

          {activeSection === 'objects' && objects
            .filter(o => !query || o.name.toLowerCase().includes(query.toLowerCase()))
            .filter(matchesFilters)
            .map(o => <ObjectCard key={o.id} obj={o} onEdit={handleEdit} onDelete={handleDelete} />)}

          {activeSection === 'lore' && lore
            .filter(e => !query || e.title.toLowerCase().includes(query.toLowerCase()))
            .filter(matchesFilters)
            .map(e => <LoreCard key={e.id} entry={e} onEdit={handleEdit} onDelete={handleDelete} />)}
            
          {/* Empty state visual fallback */}
          {((activeSection === 'characters' && characters.length === 0) ||
            (activeSection === 'locations' && locations.length === 0) ||
            (activeSection === 'objects' && objects.length === 0) ||
            (activeSection === 'lore' && lore.length === 0)) && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay entradas en esta categoría. Haz clic en "Añadir entrada".
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
