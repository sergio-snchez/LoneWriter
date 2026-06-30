import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'
import { getAllCustomStopwords, addCustomStopword, deleteCustomStopword } from '../i18n/stopwords'
import './StopwordsModal.css'

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
    if (result && !result.existing) {
      setCustomWords(prev => [...prev, result])
    }
    setNewWord('')
  }

  const handleDelete = async (id) => {
    await deleteCustomStopword(id)
    setCustomWords(prev => prev.filter(w => w.id !== id))
  }

  return (
    <div className="stopwords-modal__container">
      <h3 className="stopwords-modal__title">{t('stopwords_modal_titulo')}</h3>
      <p className="stopwords-modal__desc">{t('stopwords_modal_texto')}</p>

      <div className="stopwords-modal__input-row">
        <input
          type="text"
          value={newWord}
          onChange={e => setNewWord(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder={t('stopwords_add_placeholder')}
          className="stopwords-modal__input"
        />
        <button onClick={handleAdd} className="btn btn-primary stopwords-modal__add-btn">
          <Plus size={14} />
          {t('stopwords_add')}
        </button>
      </div>

      <div className="stopwords-modal__list">
        {customWords.length === 0 ? (
          <span className="stopwords-modal__empty">{t('stopwords_empty')}</span>
        ) : customWords.map(w => (
          <span key={w.id} className="stopwords-modal__tag">
            {w.word}
            <button onClick={() => handleDelete(w.id)} className="stopwords-modal__tag-btn"><X size={12} /></button>
          </span>
        ))}
      </div>

      <div className="stopwords-modal__footer">
        <button className="btn btn-ghost" onClick={onClose}>{tc('botones.cerrar')}</button>
      </div>
    </div>
  )
}
