/**
 * CompendiumPanel — lateral form panel for creating/editing compendium entities.
 * Extracted from Compendium.jsx for maintainability.
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import {
  Users, MapPin, Package, BookOpen,
  Plus, Trash2, X, Sparkles
} from 'lucide-react'
import { useNovel, useAI, useModal } from '../../context'
import { Tooltip } from '../../components'
import { AIService, retrieveRelevantFragments } from '../../services'
import AssociationGroup from './AssociationGroup'
import './CompendiumPanel.css'

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

export default function CompendiumPanel({ isOpen, type, item, entities, onClose, onSave }) {
  CompendiumPanel.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    type: PropTypes.oneOf(['characters', 'locations', 'objects', 'lore']).isRequired,
    item: PropTypes.object,
    entities: PropTypes.shape({
      characters: PropTypes.array,
      locations: PropTypes.array,
      objects: PropTypes.array,
      lore: PropTypes.array,
    }),
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
  };

  const { t } = useTranslation('compendium')
  const { acts, activeNovel } = useNovel()
  const { provider, apiKey, currentModel, localBaseUrl, logAIUsage } = useAI()
  const { characters, locations, objects, lore } = entities || {};
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
          // Prevent numeric zero or string "0" from polluting text fields
          const val = aiData[k]
          if (val !== undefined && val !== null && val !== '' && val !== 0 && val !== '0') {
            next[k] = val
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
        <div className="comp-panel-header-actions">
          {isAiLoading && (
            <span className="ai-loading-indicator">
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
            <div className="category-tab-group">
              {CATEGORIES.map(cat => {
                const IconComp = cat.icon
                return (
                  <Tooltip key={cat.id} content={t(`tabs.${cat.id}`)}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`category-tab ${selectedCategory === cat.id ? 'category-tab--active' : ''}`}
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
          <CharacterForm
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            characters={characters}
            locations={locations}
            objects={objects}
            lore={lore}
            addRelation={addRelation}
            handleRelationChange={handleRelationChange}
            removeRelation={removeRelation}
            t={t}
          />
        )}
        {selectedCategory === 'locations' && (
          <LocationForm
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            characters={characters}
            objects={objects}
            lore={lore}
            t={t}
          />
        )}
        {selectedCategory === 'objects' && (
          <ObjectForm
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            characters={characters}
            locations={locations}
            lore={lore}
            t={t}
          />
        )}
        {selectedCategory === 'lore' && (
          <LoreForm
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            characters={characters}
            objects={objects}
            locations={locations}
            t={t}
          />
        )}
      </div>

      <div className="compendium-panel__footer">
        <button className="btn btn-ghost" onClick={onClose}>{t('panel.cancelar')}</button>
        <button className="btn btn-primary" onClick={handleSubmit}>{t('panel.guardar')}</button>
      </div>
    </div>
  )
}

/* ---- Sub-components: category form sections ---- */

function CharacterForm({ formData, setFormData, handleChange, characters, locations, objects, lore, addRelation, handleRelationChange, removeRelation, t }) {
  return (
    <>
      <div className="compendium-form-group">
        <label>{t('formulario.personajes.nombre')}</label>
        <input name="name" value={formData.name || ''} onChange={handleChange} autoFocus placeholder={t('formulario.personajes.nombre_placeholder')} />
      </div>
      <div className="compendium-form-group">
        <label>{t('formulario.personajes.rol')}</label>
        <input name="role" value={formData.role || ''} onChange={handleChange} placeholder={t('formulario.personajes.rol_placeholder')} />
      </div>
      <div className="form-group-row">
        <div className="form-group-inner">
          <label>{t('formulario.personajes.estado_vital')}</label>
          <select name="isAlive" value={formData.isAlive || 'Vivo'} onChange={handleChange}>
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
        <input type="text" name="age" value={formData.age || ''} onChange={handleChange} placeholder={t('formulario.personajes.edad_placeholder')} />
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
          <p className="empty-hint">{t('formulario.personajes.sin_personajes')}</p>
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
                  <input name="reverseType" placeholder={t('formulario.personajes.relacion_para_el')} value={rel.reverseType} onChange={e => handleRelationChange(i, 'reverseType', e.target.value)} className="relation-input-reverse" />
                </div>
                <Tooltip content={t('formulario.personajes.eliminar_relacion')}>
                  <button className="btn btn-ghost btn-icon text-danger" onClick={() => removeRelation(i)}>
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              </div>
            ))}
            <button className="btn btn-ghost add-relation-btn" onClick={addRelation}>
              <Plus size={13} /> {t('formulario.personajes.añadir_vinculo')}
            </button>
          </>
        )}
      </div>
      <AssociationGroup label={t('formulario.personajes.lugares_vinculados')} items={locations} field="associatedLocations" nameKey="name" accentColor={ENTITY_COLORS.locations} formData={formData} setFormData={setFormData} />
      <AssociationGroup label={t('formulario.personajes.objetos_vinculados')} items={objects} field="associatedObjects" nameKey="name" accentColor={ENTITY_COLORS.objects} formData={formData} setFormData={setFormData} />
      <AssociationGroup label={t('formulario.personajes.lore_vinculado')} items={lore} field="associatedLore" nameKey="title" accentColor={ENTITY_COLORS.lore} formData={formData} setFormData={setFormData} />
    </>
  )
}

function LocationForm({ formData, setFormData, handleChange, characters, objects, lore, t }) {
  return (
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
  )
}

function ObjectForm({ formData, setFormData, handleChange, characters, locations, lore, t }) {
  return (
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
        <select name="currentOwner" value={formData.currentOwner || 'Desconocido'} onChange={handleChange}>
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
  )
}

function LoreForm({ formData, setFormData, handleChange, characters, objects, locations, t }) {
  return (
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
        <textarea name="summary" value={formData.summary || ''} onChange={handleChange} className="lore-textarea" />
      </div>
      <div className="compendium-form-group">
        <label>{t('formulario.lore.etiquetas')}</label>
        <input name="_rawTags" value={formData._rawTags || ''} onChange={handleChange} />
      </div>
      <AssociationGroup label={t('formulario.lore.personajes_vinculados')} items={characters} field="associatedCharacters" nameKey="name" accentColor={ENTITY_COLORS.characters} formData={formData} setFormData={setFormData} />
      <AssociationGroup label={t('formulario.lore.objetos_vinculados')} items={objects} field="associatedObjects" nameKey="name" accentColor={ENTITY_COLORS.objects} formData={formData} setFormData={setFormData} />
      <AssociationGroup label={t('formulario.lore.lugares_vinculados')} items={locations} field="associatedLocations" nameKey="name" accentColor={ENTITY_COLORS.locations} formData={formData} setFormData={setFormData} />
    </>
  )
}
