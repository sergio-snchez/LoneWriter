import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users, MapPin, Package, BookOpen, Star, ExternalLink,
  Search, Filter, ChevronRight, Plus, Tag, PenLine, Trash2, 
  X, Zap, Sparkles, Loader2, CheckCircle2
} from 'lucide-react'
import { useNovel } from '../context/NovelContext'
import { useAI } from '../context/AIContext'
import { useModal } from '../context/ModalContext'
import { extractKeywords, TABLE_CONFIG } from '../services/compendiumSearch'
import { Tooltip } from '../components/Tooltip'

import { AIService } from '../services/aiService'
import { ProposalCard } from '../components/MpcProposalDrawer'
import { retrieveRelevantFragments } from '../services/ragService'
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
        <Tooltip key={color} content={color}>
          <button
            type="button"
            className={`color-swatch ${value === color ? 'color-swatch--active' : ''}`}
            style={{ background: color }}
            onClick={() => onChange(color)}
          />
        </Tooltip>
      ))}
    </div>
  );
}

/* ---- Panel de Formulario Lateral ---- */
function CompendiumPanel({ type, item, characters, onClose, onSave, activeNovel }) {
  const { t } = useTranslation('compendium')
  const { acts } = useNovel()
  const { provider, apiKey, currentModel, localBaseUrl, logAIUsage } = useAI()
  const [formData, setFormData] = useState(item || {});
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  let titleText = item ? t('panel.editar') : t('panel.añadir');

  const handleAIAutoFill = async () => {
    if (!formData.name && type !== 'lore' && !formData.title) {
      alert(t('formulario.completar_ia_error'));
      return;
    }
    
    setIsAiLoading(true);
    try {
      const MAX_CHARS = 15000;
      const nameToMatch = formData.name || formData.title || "";
      
      let fullText = "";
      
      // Usar RAG para obtener fragmentos relevantes
      if (activeNovel?.id && nameToMatch.trim().length >= 2) {
        try {
          const ragTimeout = new Promise(resolve => setTimeout(() => resolve([]), 10000));
          const ragPromise = retrieveRelevantFragments(nameToMatch, activeNovel.id, 8);
          const ragFragments = await Promise.race([ragPromise, ragTimeout]);
          
          if (ragFragments && ragFragments.length > 0) {
            fullText = ragFragments.join('\n\n---\n');
            console.log('[Compendium] RAG encontró', ragFragments.length, 'fragmentos relevantes');
          }
        } catch (ragErr) {
          console.warn('[Compendium] RAG falló, usando método tradicional:', ragErr.message);
        }
      }
      
      // Fallback: método tradicional si RAG no funcionó
      if (!fullText) {
        let allScenes = [];
        for (const act of (acts || [])) {
          for (const ch of (act.chapters || [])) {
            for (const sc of (ch.scenes || [])) {
              if (sc.content) allScenes.push(sc);
            }
          }
        }
        
        const relevantScenes = allScenes.filter(sc => 
          sc.content && sc.content.toLowerCase().includes(nameToMatch.toLowerCase())
        );
        
        const contextScenes = relevantScenes.length > 5 ? relevantScenes : allScenes.slice(-15);
        
        for (const sc of contextScenes) {
          fullText += sc.content.replace(/<[^>]*>/g, ' ') + "\n";
          if (fullText.length > MAX_CHARS) break;
        }
      }
      
      if (!fullText.trim()) {
        alert(t('formulario.completar_ia_fallo', { error: 'No se encontró contexto relevante en la novela' }));
        setIsAiLoading(false);
        return;
      }
      
      const config = { provider, apiKey, model: currentModel, localBaseUrl };
      console.log('[Compendium] Generando', type, 'con IA:', formData.name || formData.title);
      const res = await AIService.autoCompleteCompendiumEntry(
        fullText,
        type,
        formData.name || formData.title,
        formData,
        config
      );
      
      logAIUsage(res.usage);
      const aiData = res.data;

      setFormData(prev => {
        const next = { ...prev };
        Object.keys(aiData).forEach(k => {
          if (aiData[k] !== undefined && aiData[k] !== null && aiData[k] !== "") {
            next[k] = aiData[k];
          }
        });
        if (next.traits && Array.isArray(next.traits)) next._rawTraits = next.traits.join(', ');
        if (next.tags && Array.isArray(next.tags)) next._rawTags = next.tags.join(', ');
        return next;
      });
      
    } catch (err) {
      console.error(err);
      alert(t('formulario.completar_ia_fallo', { error: err.message }));
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="compendium-view__panel">
      <div className="compendium-panel__header">
        <span className="compendium-panel__title">{titleText}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isAiLoading && (
            <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
              {t('formulario.completar_ia_cargando')}
            </span>
          )}
          <Tooltip content={t('formulario.completar_ia_tooltip')}>
            <button 
              className="btn btn-primary btn-icon" 
              onClick={handleAIAutoFill} 
              disabled={isAiLoading || (!formData.name && !formData.title)}
            >
              <Sparkles size={14} className={isAiLoading ? "ai-spin" : ""} />
            </button>
          </Tooltip>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
      </div>
      
      <div className="compendium-panel__body">
        {type === 'characters' && (
          <>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.nombre')}</label>
              <input name="name" value={formData.name || ''} onChange={handleChange} autoFocus placeholder={t('formulario.personajes.nombre_placeholder')} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.rol')}</label>
              <input name="role" value={formData.role || ''} onChange={handleChange} placeholder={t('formulario.personajes.rol_placeholder')} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.ocupacion')}</label>
              <input name="occupation" value={formData.occupation || ''} onChange={handleChange} placeholder={t('formulario.personajes.ocupacion_placeholder')} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.edad')}</label>
              <input type="number" name="age" value={formData.age || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.descripcion')}</label>
              <textarea name="description" value={formData.description || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.rasgos')}</label>
              <input name="_rawTraits" value={formData._rawTraits || ''} onChange={handleChange} placeholder={t('formulario.personajes.rasgos_placeholder')} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.relaciones')}</label>
              {characters && characters.filter(c => c.name !== formData.name).length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  {t('formulario.personajes.sin_personajes')}
                </p>
              ) : (
                <>
                  {(formData.relations || []).map((rel, i) => (
                    <div key={i} className="relation-row">
                      <select
                        value={rel.name}
                        onChange={e => handleRelationChange(i, 'name', e.target.value)}
                      >
                        <option value="" disabled>{t('formulario.personajes.seleccionar')}</option>
                        {(characters || []).map(c => c.name !== formData.name && (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <div className="relation-row__fields">
                        <input
                          name="type"
                          placeholder={t('formulario.personajes.relacion_para_mi')}
                          value={rel.type}
                          onChange={e => handleRelationChange(i, 'type', e.target.value)}
                        />
                        <input
                          name="reverseType"
                          placeholder={t('formulario.personajes.relacion_para_el')}
                          value={rel.reverseType}
                          onChange={e => handleRelationChange(i, 'reverseType', e.target.value)}
                          style={{ fontSize: '12px', opacity: 0.85 }}
                        />
                      </div>
                      <Tooltip content={t('formulario.personajes.eliminar_relacion')}>
                        <button className="btn btn-ghost btn-icon text-danger" onClick={() => removeRelation(i)}>
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  ))}
                  <button className="btn btn-ghost" onClick={addRelation} style={{ alignSelf: 'flex-start', fontSize: 12, marginTop: '4px' }}>
                    <Plus size={13} /> {t('formulario.personajes.añadir_vinculo')}
                  </button>
                </>
              )}
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.color')}</label>
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
              <label>{t('formulario.localizaciones.nombre')}</label>
              <input name="name" value={formData.name || ''} onChange={handleChange} autoFocus />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.localizaciones.tipo')}</label>
              <input name="type" value={formData.type || ''} onChange={handleChange} placeholder={t('formulario.localizaciones.tipo_placeholder')} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.localizaciones.clima')}</label>
              <input name="climate" value={formData.climate || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.localizaciones.descripcion')}</label>
              <textarea name="description" value={formData.description || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.localizaciones.etiquetas')}</label>
              <input name="_rawTags" value={formData._rawTags || ''} onChange={handleChange} placeholder={t('formulario.localizaciones.etiquetas_placeholder')} />
            </div>
            {characters && characters.length > 0 && (
              <div className="compendium-form-group">
                <label>{t('formulario.localizaciones.personajes_asociados')}</label>
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
              <label>{t('formulario.localizaciones.color')}</label>
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
              <label>{t('formulario.objetos.nombre')}</label>
              <input name="name" value={formData.name || ''} onChange={handleChange} autoFocus />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.objetos.tipo')}</label>
              <input name="type" value={formData.type || ''} onChange={handleChange} placeholder={t('formulario.objetos.tipo_placeholder')} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.objetos.importancia')}</label>
              <select name="importance" value={formData.importance || 'Secundario'} onChange={handleChange}>
                <option value="Secundario">{t('formulario.objetos.importancia_secundario')}</option>
                <option value="Relevante">{t('formulario.objetos.importancia_relevante')}</option>
                <option value="MacGuffin">{t('formulario.objetos.importancia_macguffin')}</option>
              </select>
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.objetos.portador')}</label>
              <select 
                name="currentOwner" 
                value={formData.currentOwner || 'Desconocido'} 
                onChange={handleChange}
                style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-base)', color: 'var(--text-primary)', width: '100%' }}
              >
                <option value="Desconocido">{t('formulario.objetos.portador_desconocido')}</option>
                {(characters || []).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.objetos.origen')}</label>
              <input name="origin" value={formData.origin || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.objetos.descripcion')}</label>
              <textarea name="description" value={formData.description || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.objetos.etiquetas')}</label>
              <input name="_rawTags" value={formData._rawTags || ''} onChange={handleChange} />
            </div>
          </>
        )}

        {type === 'lore' && (
          <>
            <div className="compendium-form-group">
              <label>{t('formulario.lore.titulo')}</label>
              <input name="title" value={formData.title || ''} onChange={handleChange} autoFocus />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.lore.categoria')}</label>
              <input name="category" value={formData.category || ''} onChange={handleChange} placeholder={t('formulario.lore.categoria_placeholder')} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.lore.resumen')}</label>
              <textarea name="summary" value={formData.summary || ''} onChange={handleChange} style={{minHeight: '120px'}} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.lore.etiquetas')}</label>
              <input name="_rawTags" value={formData._rawTags || ''} onChange={handleChange} />
            </div>
          </>
        )}
      </div>

      <div className="compendium-panel__footer">
        <button className="btn btn-ghost" onClick={onClose}>{t('panel.cancelar')}</button>
        <button className="btn btn-primary" onClick={handleSubmit}>{t('panel.guardar')}</button>
      </div>
    </div>
  )
}

/* ---- Character card ---- */
function CharacterCard({ char, onEdit, onDelete, onToggleIgnore }) {
  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`char-card card ${expanded ? 'char-card--expanded' : ''} ${char.ignoredForOracle ? 'card--ignored' : ''}`}
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
          {char.ignoredForOracle !== 1 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#d4a853', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={10} style={{ fill: 'currentColor' }} /> {t('tarjetas.contexto_ia')}
              </span>
            </div>
          )}
          <span className="char-card__occupation">{char.occupation}</span>
          <div className="char-card__tags">
            <span className="badge badge-muted">{char.role}</span>
            {char.age && <span className="tag">{t('tarjetas.años', { age: char.age })}</span>}
          </div>
        </div>
        <div className="compendium-card-actions">
          <Tooltip content={char.ignoredForOracle === 1 ? t('tarjetas.excluido') : t('tarjetas.incluido')}>
            <button 
              className={`btn btn-ghost btn-icon ${char.ignoredForOracle !== 1 ? 'compendium-zap-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleIgnore(char); }}
            >
              <Zap size={14} style={{ fill: char.ignoredForOracle !== 1 ? 'currentColor' : 'none' }} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.editar')}>
            <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(char); }}><PenLine size={14} /></button>
          </Tooltip>
          <Tooltip content={t('tarjetas.eliminar')}>
            <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(char.id); }}><Trash2 size={14} /></button>
          </Tooltip>
        </div>
        <ChevronRight size={14} className={`char-card__chevron ${expanded ? 'char-card__chevron--open' : ''}`} />
      </div>

      {expanded && (
        <div className="char-card__body">
          <p className="char-card__desc">{char.description}</p>
          {char.traits && char.traits.length > 0 && (
            <>
              <div className="char-card__section-label">{t('tarjetas.rasgos')}</div>
              <div className="char-card__traits">
                {char.traits.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            </>
          )}
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
        </div>
      )}
    </div>
  )
}

/* ---- Location card ---- */
function LocationCard({ loc, onEdit, onDelete, onToggleIgnore }) {
  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`loc-card card ${expanded ? 'loc-card--expanded' : ''} ${loc.ignoredForOracle ? 'card--ignored' : ''}`}
      id={`loc-card-${loc.id}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="loc-card__top">
        <div className="loc-card__dot" style={{ background: loc.color || '#5cb98a' }} />
        <div className="loc-card__info">
          <span className="loc-card__name">{loc.name}</span>
          {loc.ignoredForOracle !== 1 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#d4a853', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={10} style={{ fill: 'currentColor' }} /> {t('tarjetas.contexto_ia')}
              </span>
            </div>
          )}
          <span className="loc-card__type">{loc.type}</span>
          <div className="loc-card__tags">
            {loc.tags?.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
        <div className="compendium-card-actions">
          <Tooltip content={loc.ignoredForOracle === 1 ? t('tarjetas.excluido') : t('tarjetas.incluido')}>
            <button 
              className={`btn btn-ghost btn-icon ${loc.ignoredForOracle !== 1 ? 'compendium-zap-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleIgnore(loc); }}
            >
              <Zap size={14} style={{ fill: loc.ignoredForOracle !== 1 ? 'currentColor' : 'none' }} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.editar')}>
            <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(loc); }}><PenLine size={14} /></button>
          </Tooltip>
          <Tooltip content={t('tarjetas.eliminar')}>
            <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(loc.id); }}><Trash2 size={14} /></button>
          </Tooltip>
        </div>
        <ChevronRight size={14} className={`loc-card__chevron ${expanded ? 'loc-card__chevron--open' : ''}`} />
      </div>
      {expanded && (
        <div className="loc-card__body">
          <p className="loc-card__desc">{loc.description}</p>
          <div className="loc-card__climate">
            <span className="char-card__section-label">{t('tarjetas.clima')}</span>
            <span className="loc-card__climate-val">{loc.climate}</span>
          </div>
          {loc.associatedCharacters && loc.associatedCharacters.length > 0 && (
            <div>
              <span className="char-card__section-label">{t('tarjetas.personajes_asociados')}</span>
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
function ObjectCard({ obj, onEdit, onDelete, onToggleIgnore }) {
  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`obj-card card ${obj.ignoredForOracle ? 'card--ignored' : ''}`}
      id={`obj-card-${obj.id}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="obj-card__top">
        <Package size={16} className="obj-card__icon" />
        <div className="obj-card__info">
          <span className="obj-card__name">{obj.name}</span>
          {obj.ignoredForOracle !== 1 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#d4a853', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={10} style={{ fill: 'currentColor' }} /> {t('tarjetas.contexto_ia')}
              </span>
            </div>
          )}
          <span className="obj-card__type">{obj.type}</span>
          <div className="obj-card__tags">
            {obj.currentOwner && <span className="badge badge-muted">{t('tarjetas.portador', { name: obj.currentOwner })}</span>}
            {obj.tags?.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
        <div className="compendium-card-actions">
          <Tooltip content={obj.ignoredForOracle === 1 ? t('tarjetas.excluido') : t('tarjetas.incluido')}>
            <button 
              className={`btn btn-ghost btn-icon ${obj.ignoredForOracle !== 1 ? 'compendium-zap-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleIgnore(obj); }}
            >
              <Zap size={14} style={{ fill: obj.ignoredForOracle !== 1 ? 'currentColor' : 'none' }} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.editar')}>
            <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(obj); }}><PenLine size={14} /></button>
          </Tooltip>
          <Tooltip content={t('tarjetas.eliminar')}>
            <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(obj.id); }}><Trash2 size={14} /></button>
          </Tooltip>
        </div>
        <ChevronRight size={14} className={`obj-card__chevron ${expanded ? 'obj-card__chevron--open' : ''}`} />
      </div>
      {expanded && (
        <div className="obj-card__body">
          <p className="obj-card__desc">{obj.description}</p>
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
          <div className="obj-card__tags">
            {obj.tags?.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- Lore entry card ---- */
function LoreCard({ entry, onEdit, onDelete, onToggleIgnore }) {
  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`lore-card card ${entry.ignoredForOracle ? 'card--ignored' : ''}`}
      id={`lore-card-${entry.id}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="lore-card__top">
        <div className="lore-card__cat-dot" />
        <div className="lore-card__info">
          <span className="lore-card__title">{entry.title}</span>
          {entry.ignoredForOracle !== 1 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#d4a853', fontSize: '10px', fontWeight: 600, background: 'rgba(212, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={10} style={{ fill: 'currentColor' }} /> {t('tarjetas.contexto_ia')}
              </span>
            </div>
          )}
          <span className="lore-card__cat">{entry.category}</span>
          <div className="lore-card__tags">
            {entry.tags?.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
        <div className="compendium-card-actions">
          <Tooltip content={entry.ignoredForOracle === 1 ? t('tarjetas.excluido') : t('tarjetas.incluido')}>
            <button 
              className={`btn btn-ghost btn-icon ${entry.ignoredForOracle !== 1 ? 'compendium-zap-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleIgnore(entry); }}
            >
              <Zap size={14} style={{ fill: entry.ignoredForOracle !== 1 ? 'currentColor' : 'none' }} />
            </button>
          </Tooltip>
          <Tooltip content={t('tarjetas.editar')}>
            <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(entry); }}><PenLine size={14} /></button>
          </Tooltip>
          <Tooltip content={t('tarjetas.eliminar')}>
            <button className="btn btn-ghost btn-icon text-danger" onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}><Trash2 size={14} /></button>
          </Tooltip>
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
  const { t } = useTranslation('compendium')
  const { characters, locations, objects, lore, addCompendiumEntry, updateCompendiumEntry, deleteCompendiumEntry, activeNovel } = useNovel()
  const { 
    mpcProposals, dismissMpcProposal, isMpcEnabled, setIsMpcEnabled,
    mpcStatus,
    acceptMpcProposal, dismissMpcProposalPermanently, clearMpcProposals
  } = useAI()
  const { openModal } = useModal()
  const [activeSection, setActiveSection] = useState('characters')
  const [query, setQuery] = useState('')

  // Edit Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null means "Add new"

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [isMpcOverlayOpen, setIsMpcOverlayOpen] = useState(false);
  const [acceptingMpcId, setAcceptingMpcId] = useState(null);

  // Limpiar filtros al cambiar de sección
  useEffect(() => {
    setActiveFilters([]);
    setIsFilterOpen(false);
  }, [activeSection]);

  // Listener for mpc-edit-proposal event (dispatched from App.jsx drawer)
  useEffect(() => {
    const handler = (e) => {
      const { proposal } = e.detail || {};
      if (!proposal) return;
      setActiveSection(proposal.type);
      const data = { ...proposal };
      delete data.id; delete data.confidence; delete data.reason; delete data.type;
      if (proposal.type === 'characters') {
        data.initials = data.initials || (data.name || '').substring(0, 2).toUpperCase();
        data.color = data.color || '#6b9fd4';
      }
      if (proposal.type === 'lore' && data.name && !data.title) {
        data.title = data.name;
        delete data.name;
      }
      setEditingItem(data);
      setIsPanelOpen(true);
      dismissMpcProposal(proposal.id);
    };
    window.addEventListener('mpc-edit-proposal', handler);
    return () => window.removeEventListener('mpc-edit-proposal', handler);
  }, [dismissMpcProposal]);

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
    { id: 'characters', label: t('tabs.personajes'), icon: Users, count: characters.length },
    { id: 'locations',  label: t('tabs.localizaciones'), icon: MapPin, count: locations.length },
    { id: 'objects',    label: t('tabs.objetos'), icon: Package, count: objects.length },
    { id: 'lore',       label: t('tabs.lore'), icon: BookOpen, count: lore.length },
  ]

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsPanelOpen(true);
  };

  const handleDelete = async (id) => {
    let sourceArray = [];
    if (activeSection === 'characters') sourceArray = characters;
    else if (activeSection === 'locations') sourceArray = locations;
    else if (activeSection === 'objects') sourceArray = objects;
    else if (activeSection === 'lore') sourceArray = lore;
    
    const item = sourceArray.find(i => i.id === id);
    const itemName = item?.name || item?.title || 'esta entrada';
    
    openModal('confirm', {
      title: t('eliminar.titulo'),
      message: t('eliminar.mensaje', { name: itemName }),
      isDanger: true,
      confirmLabel: t('eliminar.boton'),
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

  const getTableForSection = (section) => {
    const map = {
      characters: 'characters',
      locations: 'locations',
      objects: 'objects',
      lore: 'lore'
    };
    return map[section] || section;
  };

  const handleToggleIgnore = async (item) => {
    const table = getTableForSection(activeSection);
    const newValue = item.ignoredForOracle === 1 ? 0 : 1;
    await updateCompendiumEntry(table, item.id, { ignoredForOracle: newValue });
  };

  // ---- MPC Accordion Functions ----
  const buildMpcCompendiumData = (proposal) => {
    const { id: _id, confidence: _c, reason: _r, type, ...data } = proposal;
    if (type === 'lore') {
      if (!data.title && data.name) { data.title = data.name; delete data.name; }
    }
    if (data.entityType !== undefined) {
      data.type = data.entityType;
      delete data.entityType;
    }
    if (type === 'characters') {
      data.initials = data.initials || (data.name || '').substring(0, 2).toUpperCase();
      data.color = data.color || '#6b9fd4';
    }
    return { type, data };
  };

  const handleMpcAccept = async (proposal) => {
    setAcceptingMpcId(proposal.id);
    try {
      const { type, data } = buildMpcCompendiumData(proposal);
      await addCompendiumEntry(type, data);
      acceptMpcProposal(proposal.id);
    } catch (err) {
      console.error('[MPC] Error al aceptar propuesta:', err);
    } finally {
      setAcceptingMpcId(null);
    }
  };

  const handleMpcEdit = (proposal) => {
    setActiveSection(proposal.type);
    const data = { ...proposal };
    delete data.id; delete data.confidence; delete data.reason; delete data.type;
    if (proposal.type === 'characters') {
      data.initials = data.initials || (data.name || '').substring(0, 2).toUpperCase();
      data.color = data.color || '#6b9fd4';
    }
    if (proposal.type === 'lore' && data.name && !data.title) {
      data.title = data.name;
      delete data.name;
    }
    setEditingItem(data);
    setIsPanelOpen(true);
    dismissMpcProposal(proposal.id);
  };

  const handleMpcDismiss = (id) => {
    dismissMpcProposal(id);
  };

  const handleMpcDismissPermanently = (proposal) => {
    dismissMpcProposalPermanently(proposal);
  };

  const handleSavePanel = async (data) => {
    const isUpdate = !!editingItem;
    
    if (activeSection === 'characters') {
      let newRels = (data.relations || []).filter(r => r.name);
      data.relations = newRels;

      const oldName = isUpdate ? editingItem.name : data.name;
      const c1Name = data.name;

      const allCharNames = new Set();
      if (isUpdate) {
        (editingItem.relations || []).forEach(r => { if (r.name) allCharNames.add(r.name); });
      }
      newRels.forEach(r => { if (r.name) allCharNames.add(r.name); });

      const promises = [];

      for (const otherName of allCharNames) {
        const otherChar = characters.find(c => c.name === otherName);
        if (!otherChar) continue;

        const existingRels = [...(otherChar.relations || [])];
        const relToMeIdx = existingRels.findIndex(r => r.name === oldName);
        const stillRelated = newRels.some(r => r.name === otherName);

        if (stillRelated) {
          const myRel = newRels.find(r => r.name === otherName);
          const reverseRel = {
            name: c1Name,
            type: myRel.reverseType || '',
            reverseType: myRel.type || ''
          };
          if (relToMeIdx >= 0) {
            existingRels[relToMeIdx] = reverseRel;
          } else {
            existingRels.push(reverseRel);
          }
        } else {
          if (relToMeIdx >= 0) {
            existingRels.splice(relToMeIdx, 1);
          }
        }

        promises.push(updateCompendiumEntry('characters', otherChar.id, { relations: existingRels }));
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
          <h1 className="section-title">{t('titulo')}</h1>
          <p className="section-subtitle">{t('subtitulo')}</p>
        </div>

        {/* MPC Master Switch */}
        <div className="mpc-control">
          <span className="mpc-control__label">
            <Zap size={10} style={{ fill: isMpcEnabled ? 'currentColor' : 'none' }} />
            {t('mpc.interruptor_label')}
          </span>
          <label className="mpc-switch">
            <input 
              type="checkbox" 
              checked={isMpcEnabled} 
              onChange={(e) => setIsMpcEnabled(e.target.checked)} 
            />
            <span className="mpc-slider"></span>
          </label>
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

        {/* MPC Badge - abre overlay flotante */}
        <div className="compendium-mpc-badge">
          <div
            className={`compendium-mpc-badge__button ${
              mpcStatus === 'analyzing' ? 'compendium-mpc-badge--analyzing' : ''
            } ${
              mpcProposals.length > 0 ? 'compendium-mpc-badge--active' : ''
            }`}
            onClick={() => setIsMpcOverlayOpen(true)}
          >
            {mpcProposals.length > 0 || mpcStatus === 'analyzing' ? (
              <span className="compendium-mpc-badge__count">
                {mpcProposals.length > 0 ? mpcProposals.length : <Loader2 size={12} className="spin" />}
              </span>
            ) : (
              <Sparkles size={14} className="compendium-mpc-badge__icon" />
            )}
            <span>
              {mpcStatus === 'analyzing' ? t('ai:oraculo.consultando') : t('compendium:mpc.titulo')}
            </span>
          </div>
        </div>

        {/* Summary mini-stats */}
        <div className="compendium-summary">
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{characters.length}</span>
            <span className="compendium-summary__label">{t('resumen.personajes')}</span>
          </div>
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{locations.length}</span>
            <span className="compendium-summary__label">{t('resumen.lugares')}</span>
          </div>
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{objects.length}</span>
            <span className="compendium-summary__label">{t('resumen.objetos')}</span>
          </div>
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{lore.length}</span>
            <span className="compendium-summary__label">{t('resumen.entradas_lore')}</span>
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
              placeholder={t('toolbar.buscar', { section: SECTIONS.find(s=>s.id===activeSection)?.label.toLowerCase() })}
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
              {activeFilters.length > 0 ? t('toolbar.filtrar_con_cuenta', { count: activeFilters.length }) : t('toolbar.filtrar')}
            </button>
            {isFilterOpen && (
              <div className="compendium-filter-popup">
                <div className="compendium-filter-popup__header">
                  <span className="compendium-filter-popup__title">{t('toolbar.filtrar_titulo')}</span>
                  {activeFilters.length > 0 && (
                    <button className="btn btn-ghost" onClick={() => setActiveFilters([])} style={{padding: '2px 6px', fontSize: 11}}>{t('toolbar.limpiar')}</button>
                  )}
                </div>
                <div className="compendium-filter-popup__body">
                  {getAvailableFilters().length === 0 ? (
                    <div style={{color: 'var(--text-muted)', fontSize: 12}}>{t('toolbar.sin_etiquetas')}</div>
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
            {t('toolbar.añadir')}
          </button>
        </div>

        {/* Cards */}
        <div className="compendium-cards">
          {activeSection === 'characters' && characters
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(c => <CharacterCard key={c.id} char={c} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}

          {activeSection === 'locations' && locations
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(l => <LocationCard key={l.id} loc={l} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}

          {activeSection === 'objects' && objects
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(o => <ObjectCard key={o.id} obj={o} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}

          {activeSection === 'lore' && lore
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(e => <LoreCard key={e.id} entry={e} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}
            
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
                  {activeSection === 'characters' && t('vacio.personajes')}
                  {activeSection === 'locations' && t('vacio.localizaciones')}
                  {activeSection === 'objects' && t('vacio.objetos')}
                  {activeSection === 'lore' && t('vacio.lore')}
                </p>
                <p className="compendium-empty-state__sub">{t('vacio.subtitulo')}</p>
                <button className="btn btn-primary" onClick={handleAdd}>
                  <Plus size={14} />
                  {t('vacio.boton')}
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
          activeNovel={activeNovel}
          onClose={() => setIsPanelOpen(false)} 
          onSave={handleSavePanel} 
        />
      )}

      {/* MPC Overlay Flotante */}
      {isMpcOverlayOpen && (
        <div className="compendium-mpc-overlay" onClick={() => setIsMpcOverlayOpen(false)}>
          <div className="compendium-mpc-overlay__panel" onClick={(e) => e.stopPropagation()}>
            <div className="compendium-mpc-overlay__header">
              <div className="compendium-mpc-overlay__title">
                <Sparkles size={18} className="compendium-mpc-overlay__icon" />
                <span>{t('compendium:mpc.titulo')}</span>
                {mpcStatus === 'analyzing' && (
                  <Loader2 size={14} className="spin" />
                )}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsMpcOverlayOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="compendium-mpc-overlay__body">
              {mpcProposals.length === 0 ? (
                <div className="compendium-mpc-overlay__empty">
                  {mpcStatus === 'analyzing' ? (
                    <>
                      <Loader2 size={32} className="spin" style={{ color: 'var(--accent)' }} />
                      <p>{t('ai:oraculo.consultando')}</p>
                    </>
                  ) : (
                    <>
                      <Sparkles size={32} style={{ opacity: 0.3, color: '#9b72cf' }} />
                      <p>
                        {t('compendium:mpc.empty_desc_1')}
                        <br /><br />
                        <span style={{ color: 'var(--gold)', opacity: 0.7, fontStyle: 'italic' }}>
                          {t('compendium:mpc.empty_desc_2')}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="compendium-mpc-overlay__subtitle">
                    {mpcProposals.length === 1 
                      ? t('compendium:mpc.subtitulo', { count: 1 })
                      : t('compendium:mpc.subtitulo_plural', { count: mpcProposals.length })
                    }
                  </div>
                  <div className="compendium-mpc-overlay__cards">
                    {mpcProposals.map(proposal => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        onAccept={handleMpcAccept}
                        onEdit={handleMpcEdit}
                        onDismiss={handleMpcDismiss}
                        onDismissPermanently={handleMpcDismissPermanently}
                        isAccepting={acceptingMpcId === proposal.id}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {mpcProposals.length > 1 && (
              <div className="compendium-mpc-overlay__footer">
                <button className="btn btn-ghost" onClick={clearMpcProposals}>
                  <Trash2 size={13} />
                  {t('compendium:mpc.ignorar_todas')}
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={async () => {
                    for (const proposal of [...mpcProposals]) {
                      await handleMpcAccept(proposal);
                    }
                  }}
                >
                  <CheckCircle2 size={13} />
                  {t('compendium:mpc.aceptar_todas')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  )
}
