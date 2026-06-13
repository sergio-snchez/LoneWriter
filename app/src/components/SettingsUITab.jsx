import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Languages, Zap, Info, Palette } from 'lucide-react'
import LanguageSelector from './LanguageSelector'

export function SettingsUITab({ theme, setTheme, editorFont, setEditorFont, meshEnabled, setMeshEnabled }) {
  SettingsUITab.propTypes = {
    theme: PropTypes.string.isRequired,
    setTheme: PropTypes.func.isRequired,
    editorFont: PropTypes.string.isRequired,
    setEditorFont: PropTypes.func.isRequired,
    meshEnabled: PropTypes.bool.isRequired,
    setMeshEnabled: PropTypes.func.isRequired,
  };

  const { t } = useTranslation('settings')

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <span className="settings-section__title settings-section__title-row">
          <Languages size={14} />{t('general.idioma')}
        </span>
        <p className="settings-section__hint">{t('general.idioma_hint')}</p>
        <LanguageSelector />
      </div>

      <div className="settings-section">
        <span className="settings-section__title settings-section__title-row">
          <Zap size={14} />{t('general.fondo_dinamico')}
        </span>
        <p className="settings-section__hint settings-section__hint--with-margin">{t('general.fondo_dinamico_hint')}</p>
        <div className="mesh-toggle-row">
          <span className="mesh-toggle-label">{t('general.fondo_dinamico')}</span>
          <input type="checkbox" className="form-toggle" checked={meshEnabled} onChange={(e) => setMeshEnabled(e.target.checked)} />
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-section__title settings-section__title-row">
          <Info size={14} />{t('general.tema')}
        </span>
        <p className="settings-section__hint settings-section__hint--with-bottom">{t('general.tema_hint')}</p>
        <div className="theme-grid">
          {[
            { id: 'nordic', label: t('general.tema_nordic'), gradient: 'linear-gradient(135deg, #232938 50%, #2D3347 50%)', border: '1px solid rgba(126,184,218,0.3)' },
            { id: 'dark', label: t('general.tema_oscuro'), gradient: 'linear-gradient(135deg, #2B2E3A 50%, #23252E 50%)', border: '1px solid rgba(255,255,255,0.2)' },
            { id: 'sepia', label: t('general.tema_sepia'), gradient: 'linear-gradient(135deg, #EBE2CF 50%, #F4ECD8 50%)', border: '1px solid rgba(166,124,82,0.3)' },
            { id: 'light', label: t('general.tema_claro'), gradient: 'linear-gradient(135deg, #F5F0E6 50%, #FCF8F2 50%)', border: '1px solid rgba(60,54,51,0.2)' },
          ].map(tm => (
            <button key={tm.id} onClick={() => setTheme(tm.id)} className={`theme-option ${theme === tm.id ? 'theme-option--active' : ''}`}>
              <div className="theme-option__swatch" style={{ background: tm.gradient, border: tm.border }} />
              <span className="theme-option__label">{tm.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-section__title settings-section__title-row">
          <Palette size={14} />{t('general.fuente')}
        </span>
        <p className="settings-section__hint settings-section__hint--with-bottom">{t('general.fuente_hint')}</p>
        <div className="font-grid">
          {[
            { id: 'sans', label: t('general.fuente_sans'), font: "'Inter', sans-serif" },
            { id: 'serif', label: t('general.fuente_serif'), font: "'Playfair Display', serif" },
            { id: 'mono', label: t('general.fuente_mono'), font: "'JetBrains Mono', monospace" },
            { id: 'lora', label: t('general.fuente_lora'), font: "'Special Elite', 'Courier New', monospace" },
          ].map(f => (
            <button key={f.id} onClick={() => setEditorFont(f.id)} className={`font-option ${editorFont === f.id ? 'font-option--active' : ''}`}>
              <span className="font-option__preview" style={{ fontFamily: f.font }}>Aa</span>
              <span className="font-option__label">{f.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
