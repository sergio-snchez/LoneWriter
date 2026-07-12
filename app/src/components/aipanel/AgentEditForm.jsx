import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { useModal } from '../../context'

function escapeHtml(str) {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}

export default function AgentEditForm({ agent, colors, onSave, onCancel, isNew, canDelete, onDelete }) {
  const { t } = useTranslation('ai')
  const { openModal } = useModal()
  const [form, setForm] = useState({ ...agent })
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = () => {
    const newErrors = {}
    if (!form.name || !form.name.trim()) {
      newErrors.name = t('debate.error_nombre_requerido')
    } else if (form.name.length > 100) {
      newErrors.name = t('debate.error_nombre_max')
    }
    if (!form.systemPrompt || !form.systemPrompt.trim()) {
      newErrors.systemPrompt = t('debate.error_prompt_requerido')
    } else if (form.systemPrompt.length > 4000) {
      newErrors.systemPrompt = t('debate.error_prompt_max')
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    onSave({
      ...form,
      name: escapeHtml(form.name.trim()),
      systemPrompt: escapeHtml(form.systemPrompt.trim()),
    })
  }

  return (
    <div className="agent-edit-form">
      <div className="agent-edit-form__row">
        <div className="debate-agent-card__avatar" style={{ '--agent-color': form.color }}>
          {(form.initials || form.name?.slice(0, 2) || '??').toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <input className="agent-edit-form__input" value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('debate.nombre_placeholder')} />
          {errors.name && <span className="agent-edit-form__error">{errors.name}</span>}
        </div>
      </div>
      <input className="agent-edit-form__input" value={form.desc} onChange={e => set('desc', e.target.value)} placeholder={t('debate.desc_placeholder')} />
      <div className="agent-edit-form__colors">
        {colors.map(c => (
          <button key={c} className={`agent-color-dot ${form.color === c ? 'agent-color-dot--active' : ''}`} style={{ '--swatch-color': c }} onClick={() => set('color', c)} />
        ))}
      </div>
      <label className="agent-edit-form__label">{t('debate.prompt_label')}</label>
      <textarea className={`agent-edit-form__prompt${errors.systemPrompt ? ' agent-edit-form__prompt--error' : ''}`} value={form.systemPrompt} onChange={e => set('systemPrompt', e.target.value)} rows={7} placeholder={t('debate.prompt_placeholder')} />
      {errors.systemPrompt && <span className="agent-edit-form__error">{errors.systemPrompt}</span>}
      <p className="agent-edit-form__hint">{t('debate.prompt_hint')}</p>
      <div className="agent-edit-form__footer">
        {!isNew && canDelete && (
          <button className="btn btn-ghost btn-danger-ghost" onClick={() => {
            openModal('confirm', {
              title: t('debate.eliminar_titulo'),
              message: t('debate.eliminar_mensaje', { name: agent.name }),
              isDanger: true,
              confirmLabel: t('debate.eliminar_boton'),
              onConfirm: onDelete
            })
          }}>{t('debate.eliminar')}</button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onCancel}>{t('debate.cancelar')}</button>
        <button className="btn btn-primary" onClick={handleSave}>
          {isNew ? t('debate.crear') : t('debate.guardar')}
        </button>
      </div>
    </div>
  )
}

AgentEditForm.propTypes = {
  agent: PropTypes.shape({
    name: PropTypes.string,
    desc: PropTypes.string,
    color: PropTypes.string,
    systemPrompt: PropTypes.string,
    initials: PropTypes.string,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isNew: PropTypes.bool,
  canDelete: PropTypes.bool,
  onDelete: PropTypes.func,
};
