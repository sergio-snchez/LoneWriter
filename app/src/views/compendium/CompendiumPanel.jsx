/**
 * CompendiumPanel — lateral form panel for creating/editing compendium entities.
 * Extracted from Compendium.jsx for maintainability.
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users, MapPin, Package, BookOpen,
  Plus, Trash2, X, Sparkles
} from 'lucide-react'
import { useNovel } from '../../context/NovelContext'
import { useAI } from '../../context/AIContext'
import { useModal } from '../../context/ModalContext'
import { Tooltip } from '../../components/Tooltip'
import { AIService } from '../../services/aiService'
import { retrieveRelevantFragments } from '../../services/ragService'

/* ---- Shared constants (also used by CompendiumCards) ---- */
export const ENTITY_COLORS = {
  characters: '#5cb98a',
  locations: '#6b9fd4',
  objects: '#d4a853',
  lore: '#d45353'
}

export const CATEGORIES = [
  { id: 'characters', icon: Users },
  { id: 'locations', icon: MapPin },
  { id: 'objects', icon: Package },
  { id: 'lore', icon: BookOpen },
]

export function CompendiumPanel({ isOpen, type, item, characters, locations, objects, lore, onClose, onSave, activeNovel }) {
  const { t } = useTranslation('compendium')
  const { acts } = useNovel()
  const { provider, apiKey, currentModel, localBaseUrl, logAIUsage } = useAI()
  const { openModal } = useModal()
  const [formData, setFormData] = useState(item || {})
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(type)

  useEffect(() => {
    setSelectedCategory(type)
  }, [type])

  useEffect(() => {
    const initial = { ...item }
    if (initial.traits) initial._rawTraits = initial.traits.join(', ')
    if (initial.tags) initial._rawTags = initial.tags.join(', ')
    initial._originalCategory = type
    setFormData(initial)
    setIsAiLoading(false)
  }, [item, type])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRelationChange = (idx, field, value) => {
    setFormData(prev => {
      const nextRels = [...(prev.relations || [])]
      nextRels[idx] = { ...nextRels[idx], [field]: value }
      return { ...prev, relations: nextRels }
    })
  }

  const addRelation = () => {
    setFormData(prev => ({
      ...prev,
      relations: [...(prev.relations || []), { name: '', type: '', reverseType: '' }]
    }))
  }

  const removeRelation = (idx) => {
    setFormData(prev => {
      const nextRels = [...(prev.relations || [])]
      nextRels.splice(idx, 1)
      return { ...prev, relations: nextRels }
    })
  }

  const handleSubmit = () => {
    const data = { ...formData }
    const cat = selectedCategory

    if (cat !== type) {
      delete data.id
      delete data.relations
      delete data.scopes
    }

    if (cat === 'characters') {
      data.name = data.name || 'Nuevo personaje'
      data.initials = data.initials || (data.name || '').substring(0, 2).toUpperCase()
    } else if (cat === 'locations') {
      data.name = data.name || 'Nueva localización'
    } else if (cat === 'objects') {
      data.name = data.name || 'Nuevo objeto'
    } else if (cat === 'lore') {
      if (data.name && !data.title) {
        data.title = data.name
        delete data.name
      }
      data.title = data.title || 'Nueva entrada de lore'
    }

    if (data._rawTraits !== undefined) {
      data.traits = data._rawTraits.split(',').map(s => s.trim()).filter(Boolean)
    }
    if (data._rawTags !== undefined) {
      data.tags = data._rawTags.split(',').map(s => s.trim()).filter(Boolean)
    }

    delete data._rawTraits
    delete data._rawTags

    onSave(data, selectedCategory)
    onClose()
  }

  const handleAIAutoFill = async () => {
    if (!formData.name && type !== 'lore' && !formData.title) {
      openModal('alert', { message: t('formulario.completar_ia_error') })
      return
    }

    setIsAiLoading(true)
    try {
      const MAX_CHARS = 15000
      const nameToMatch = formData.name || formData.title || ''
      let fullText = ''

      if (activeNovel?.id && nameToMatch.trim().length >= 2) {
        try {
          const ragTimeout = new Promise(resolve => setTimeout(() => resolve([]), 10000))
          const ragPromise = retrieveRelevantFragments(nameToMatch, activeNovel.id, 8)
          const ragFragments = await Promise.race([ragPromise, ragTimeout])
          if (ragFragments && ragFragments.length > 0) {
            fullText = ragFragments.join('\n\n---\n')
          }
        } catch (ragErr) {
          console.warn('[Compendium] RAG falló, usando método tradicional:', ragErr.message)
        }
      }

      if (!fullText) {
        let allScenes = []
        for (const act of (acts || [])) {
          for (const ch of (act.chapters || [])) {
            for (const sc of (ch.scenes || [])) {
              if (sc.content) allScenes.push(sc)
            }
          }
        }
        const relevantScenes = allScenes.filter(sc =>
          sc.content && sc.content.toLowerCase().includes(nameToMatch.toLowerCase())
        )
        const contextScenes = relevantScenes.length > 5 ? relevantScenes : allScenes.slice(-15)
        for (const sc of contextScenes) {
          fullText += sc.content.replace(/<[^>]*>/g, ' ') + '\n'
          if (fullText.length > MAX_CHARS) break
        }
      }

      if (!fullText.trim()) {
        openModal('alert', { message: t('formulario.completar_ia_fallo', { error: 'No se encontró contexto relevante en la novela' }) })
        setIsAiLoading(false)
        return
      }

      const config = { provider, apiKey, model: currentModel, localBaseUrl }
      const res = await AIService.autoCompleteCompendiumEntry(
        fullText, type, formData.name || formData.title, formData, config
      )

      logAIUsage(res.usage)
      const aiData = res.data
      const startingId = formData.id

      setFormData(prev => {
        const currentName = prev.name || prev.title
        const currentId = prev.id
        if (currentName !== nameToMatch || currentId !== startingId) {
          openModal('alert', {
            title: t('panel.editar'),
            message: t('formulario.completar_ia_entidad_cambiada')
          })
          return prev
        }
        const next = { ...prev }
        Object.keys(aiData).forEach(k => {
          if (aiData[k] !== undefined && aiData[k] !== null && aiData[k] !== '') {
            next[k] = aiData[k]
          }
        })
        if (next.traits && Array.isArray(next.traits)) next._rawTraits = next.traits.join(', ')
        if (next.tags && Array.isArray(next.tags)) next._rawTags = next.tags.join(', ')
        return next
      })
    } catch (err) {
      console.error(err)
      openModal('alert', { message: t('formulario.completar_ia_fallo', { error: err.message }) })
    } finally {
      setIsAiLoading(false)
    }
  }

  const titleText = item ? t('panel.editar') : t('panel.añadir')

  return (
    <div className={`compendium-view__panel ${isOpen ? 'compendium-view__panel--open' : ''}`}>
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
              <Sparkles size={14} className={isAiLoading ? 'ai-spin' : ''} />
            </button>
          </Tooltip>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      <div className="compendium-panel__body">
        {item && (
          <div className="compendium-form-group">
            <label>{t('formulario.seleccionar_categoria')}</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {CATEGORIES.map(cat => {
                const IconComp = cat.icon
                return (
                  <Tooltip key={cat.id} content={t(`tabs.${cat.id}`)}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', borderRadius: '8px',
                        border: selectedCategory === cat.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: selectedCategory === cat.id ? 'var(--accent-dim)' : 'transparent',
                        color: selectedCategory === cat.id ? 'var(--accent)' : 'var(--text-muted)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <IconComp size={18} />
                    </button>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        )}

        {selectedCategory === 'characters' && (
          <>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.nombre')}</label>
              <input name="name" value={formData.name || ''} onChange={handleChange} autoFocus placeholder={t('formulario.personajes.nombre_placeholder')} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.personajes.rol')}</label>
              <input name="role" value={formData.role || ''} onChange={handleChange} placeholder={t('formulario.personajes.rol_placeholder')} />
            </div>
            <div className="compendium-form-group" style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label>{t('formulario.personajes.estado_vital')}</label>
                <select name="isAlive" value={formData.isAlive || 'Vivo'} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
                  <option value="Vivo">{t('formulario.personajes.estado_vivo')}</option>
                  <option value="Muerto">{t('formulario.personajes.estado_muerto')}</option>
                </select>
              </div>
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
                      <select value={rel.name} onChange={e => handleRelationChange(i, 'name', e.target.value)}>
                        <option value="" disabled>{t('formulario.personajes.seleccionar')}</option>
                        {(characters || []).map(c => c.name !== formData.name && (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <div className="relation-row__fields">
                        <input name="type" placeholder={t('formulario.personajes.relacion_para_mi')} value={rel.type} onChange={e => handleRelationChange(i, 'type', e.target.value)} />
                        <input name="reverseType" placeholder={t('formulario.personajes.relacion_para_el')} value={rel.reverseType} onChange={e => handleRelationChange(i, 'reverseType', e.target.value)} style={{ fontSize: '12px', opacity: 0.85 }} />
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
            <AssociationGroup label={t('formulario.personajes.lugares_vinculados')} items={locations} field="associatedLocations" nameKey="name" accentColor={ENTITY_COLORS.locations} formData={formData} setFormData={setFormData} />
            <AssociationGroup label={t('formulario.personajes.objetos_vinculados')} items={objects} field="associatedObjects" nameKey="name" accentColor={ENTITY_COLORS.objects} formData={formData} setFormData={setFormData} />
            <AssociationGroup label={t('formulario.personajes.lore_vinculado')} items={lore} field="associatedLore" nameKey="title" accentColor={ENTITY_COLORS.lore} formData={formData} setFormData={setFormData} />
          </>
        )}

        {selectedCategory === 'locations' && (
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
            <AssociationGroup label={t('formulario.localizaciones.personajes_asociados')} items={characters} field="associatedCharacters" nameKey="name" accentColor={ENTITY_COLORS.characters} formData={formData} setFormData={setFormData} />
            <AssociationGroup label={t('formulario.localizaciones.objetos_asociados')} items={objects} field="associatedObjects" nameKey="name" accentColor={ENTITY_COLORS.objects} formData={formData} setFormData={setFormData} />
            <AssociationGroup label={t('formulario.localizaciones.lore_vinculado')} items={lore} field="associatedLore" nameKey="title" accentColor={ENTITY_COLORS.lore} formData={formData} setFormData={setFormData} />
          </>
        )}

        {selectedCategory === 'objects' && (
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
              <select name="currentOwner" value={formData.currentOwner || 'Desconocido'} onChange={handleChange} style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-base)', color: 'var(--text-primary)', width: '100%' }}>
                <option value="Desconocido">{t('formulario.objetos.portador_desconocido')}</option>
                {(characters || []).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.objetos.descripcion')}</label>
              <textarea name="description" value={formData.description || ''} onChange={handleChange} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.objetos.etiquetas')}</label>
              <input name="_rawTags" value={formData._rawTags || ''} onChange={handleChange} />
            </div>
            <AssociationGroup label={t('formulario.objetos.personajes_vinculados')} items={characters} field="associatedCharacters" nameKey="name" accentColor={ENTITY_COLORS.characters} formData={formData} setFormData={setFormData} />
            <AssociationGroup label={t('formulario.objetos.lugares_vinculados')} items={locations} field="associatedLocations" nameKey="name" accentColor={ENTITY_COLORS.locations} formData={formData} setFormData={setFormData} />
            <AssociationGroup label={t('formulario.objetos.lore_vinculado')} items={lore} field="associatedLore" nameKey="title" accentColor={ENTITY_COLORS.lore} formData={formData} setFormData={setFormData} />
          </>
        )}

        {selectedCategory === 'lore' && (
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
              <textarea name="summary" value={formData.summary || ''} onChange={handleChange} style={{ minHeight: '120px' }} />
            </div>
            <div className="compendium-form-group">
              <label>{t('formulario.lore.etiquetas')}</label>
              <input name="_rawTags" value={formData._rawTags || ''} onChange={handleChange} />
            </div>
            <AssociationGroup label={t('formulario.lore.personajes_vinculados')} items={characters} field="associatedCharacters" nameKey="name" accentColor={ENTITY_COLORS.characters} formData={formData} setFormData={setFormData} />
            <AssociationGroup label={t('formulario.lore.objetos_vinculados')} items={objects} field="associatedObjects" nameKey="name" accentColor={ENTITY_COLORS.objects} formData={formData} setFormData={setFormData} />
            <AssociationGroup label={t('formulario.lore.lugares_vinculados')} items={locations} field="associatedLocations" nameKey="name" accentColor={ENTITY_COLORS.locations} formData={formData} setFormData={setFormData} />
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

/* ---- Reusable association toggle group ---- */
function AssociationGroup({ label, items, field, nameKey, accentColor, formData, setFormData }) {
  if (!items || items.length === 0) return null
  const rawVal = formData[field]
  const assoc = Array.isArray(rawVal)
    ? rawVal
    : typeof rawVal === 'string'
      ? rawVal.split(',').map(s => s.trim()).filter(Boolean)
      : []

  return (
    <div className="compendium-form-group">
      <label>{label}</label>
      <div className="relation-chars-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {items.map(item => {
          const name = item[nameKey]
          const isChecked = assoc.includes(name)
          return (
            <button
              key={item.id}
              type="button"
              className={`tag ${isChecked ? 'tag--active' : ''}`}
              style={{
                cursor: 'pointer', opacity: isChecked ? 1 : 0.5,
                border: isChecked ? `1px solid ${accentColor}` : '1px solid var(--border)',
                background: isChecked ? 'var(--accent-dim)' : 'transparent',
                color: isChecked ? 'var(--accent)' : 'var(--text-primary)'
              }}
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  [field]: isChecked ? assoc.filter(n => n !== name) : [...assoc, name]
                }))
              }}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
