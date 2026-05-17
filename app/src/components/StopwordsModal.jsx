import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'
import { getAllCustomStopwords, addCustomStopword, deleteCustomStopword } from '../i18n/stopwords'

export default function StopwordsModal({ onClose }) {
  const { t } = useTranslation('resources')
  const { t: tc } = useTranslation('common')
  const [customWords, setCustomWords] = useState([])
  const [newWord, setNewWord] = useState('')

  useEffect(() => {
    getAllCustomStopwords().then(words => setCustomWords(words)).catch(() => {})
  }, [])

  const handleAdd = async () => {
    const trimmed = newWord.trim().toLowerCase()
    if (!trimmed) return
    const result = await addCustomStopword(trimmed)
    if (result) {
      setCustomWords(prev => [...prev, result])
    }
    setNewWord('')
  }

  const handleDelete = async (id) => {
    await deleteCustomStopword(id)
    setCustomWords(prev => prev.filter(w => w.id !== id))
  }

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{t('stopwords_modal_titulo')}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{t('stopwords_modal_texto')}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={newWord}
          onChange={e => setNewWord(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder={t('stopwords_add_placeholder')}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
        />
        <button onClick={handleAdd} className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={14} />
          {t('stopwords_add')}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 220, overflowY: 'auto', padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
        {customWords.length === 0 ? (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: 4 }}>{t('stopwords_empty')}</span>
        ) : customWords.map(w => (
          <span key={w.id} style={{ background: 'rgba(100,180,100,0.15)', color: 'var(--success)', padding: '4px 8px', borderRadius: 4, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            {w.word}
            <button onClick={() => handleDelete(w.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', display: 'flex', lineHeight: 1 }}><X size={12} /></button>
          </span>
        ))}
      </div>

      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <button className="btn btn-ghost" onClick={onClose}>{tc('botones.cerrar')}</button>
      </div>
    </div>
  )
}
