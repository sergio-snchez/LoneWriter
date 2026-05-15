import { useTranslation } from 'react-i18next'
import { Languages, Zap, Info, Palette } from 'lucide-react'
import LanguageSelector from './LanguageSelector'

export function SettingsUITab({ theme, setTheme, editorFont, setEditorFont, meshEnabled, setMeshEnabled }) {
  const { t } = useTranslation('settings')

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Languages size={14} />{t('general.idioma')}
        </span>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{t('general.idioma_hint')}</p>
        <LanguageSelector />
      </div>

      <div className="settings-section">
        <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={14} />{t('general.fondo_dinamico')}
        </span>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 6px 0', lineHeight: '1.4' }}>{t('general.fondo_dinamico_hint')}</p>
        <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{t('general.fondo_dinamico')}</span>
          <input type="checkbox" className="form-toggle" checked={meshEnabled} onChange={(e) => setMeshEnabled(e.target.checked)} style={{ height: '18px', width: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={14} />{t('general.tema')}
        </span>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>{t('general.tema_hint')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { id: 'nordic', label: t('general.tema_nordic'), gradient: 'linear-gradient(135deg, #232938 50%, #2D3347 50%)', border: '1px solid rgba(126,184,218,0.3)' },
            { id: 'dark', label: t('general.tema_oscuro'), gradient: 'linear-gradient(135deg, #2B2E3A 50%, #23252E 50%)', border: '1px solid rgba(255,255,255,0.2)' },
            { id: 'sepia', label: t('general.tema_sepia'), gradient: 'linear-gradient(135deg, #EBE2CF 50%, #F4ECD8 50%)', border: '1px solid rgba(166,124,82,0.3)' },
            { id: 'light', label: t('general.tema_claro'), gradient: 'linear-gradient(135deg, #F5F0E6 50%, #FCF8F2 50%)', border: '1px solid rgba(60,54,51,0.2)' },
          ].map(tm => (
            <button key={tm.id} onClick={() => setTheme(tm.id)} style={{
              padding: '10px', borderRadius: 'var(--radius-md)',
              border: theme === tm.id ? '2px solid var(--accent)' : '2px solid var(--border)',
              background: theme === tm.id ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              transition: 'all var(--trans-fast)'
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: tm.gradient, border: tm.border }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tm.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={14} />{t('general.fuente')}
        </span>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>{t('general.fuente_hint')}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'sans', label: t('general.fuente_sans'), font: "'Inter', sans-serif" },
            { id: 'serif', label: t('general.fuente_serif'), font: "'Playfair Display', serif" },
            { id: 'mono', label: t('general.fuente_mono'), font: "'JetBrains Mono', monospace" },
            { id: 'lora', label: t('general.fuente_lora'), font: "'Special Elite', 'Courier New', monospace" },
          ].map(f => (
            <button key={f.id} onClick={() => setEditorFont(f.id)} style={{
              flex: 1, padding: '10px', borderRadius: 'var(--radius-md)',
              border: editorFont === f.id ? '2px solid var(--accent)' : '2px solid var(--border)',
              background: editorFont === f.id ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              transition: 'all var(--trans-fast)'
            }}>
              <span style={{ fontSize: '14px', fontFamily: f.font, color: 'var(--text-primary)' }}>Aa</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{f.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
