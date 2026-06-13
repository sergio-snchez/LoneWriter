/**
 * AssociationGroup — reusable toggle-button group for linking entities.
 * Extracted from CompendiumPanel.jsx for reusability across form components.
 */
import PropTypes from 'prop-types'

export default function AssociationGroup({ label, items, field, nameKey, accentColor, formData, setFormData }) {
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
      <div className="relation-chars-grid" style={{ '--accent-color': accentColor }}>
        {items.map(item => {
          const name = item[nameKey]
          const isChecked = assoc.includes(name)
          return (
            <button
              key={item.id}
              type="button"
              className={`tag ${isChecked ? 'tag--active' : ''}`}
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

AssociationGroup.propTypes = {
  label: PropTypes.string.isRequired,
  items: PropTypes.array,
  field: PropTypes.string.isRequired,
  nameKey: PropTypes.string.isRequired,
  accentColor: PropTypes.string.isRequired,
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
}
