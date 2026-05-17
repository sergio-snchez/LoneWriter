import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, X, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import { ProposalCard } from '../../components/ProposalCard'

export function CompendiumMpcOverlay({ isOpen, isClosing, proposals, mpcStatus, acceptingMpcId, onClose, onAccept, onEdit, onDismiss, onDismissPermanently, onClearAll }) {
  const { t } = useTranslation('compendium')

  if (!isOpen) return null

  const handleAcceptAll = async () => {
    for (const proposal of [...proposals]) {
      await onAccept(proposal)
    }
  }

  return createPortal(
    <div
      className={`compendium-mpc-overlay${isClosing ? ' compendium-mpc-overlay--closing' : ''}`}
      onClick={onClose}
      style={{ background: 'transparent', backdropFilter: 'none', pointerEvents: 'none' }}
    >
      <div
        className={`compendium-mpc-overlay__panel${isClosing ? ' compendium-mpc-overlay__panel--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="compendium-mpc-overlay__header">
          <div className="compendium-mpc-overlay__title">
            <Sparkles size={18} className="compendium-mpc-overlay__icon" />
            <span>{t('mpc.titulo')}</span>
            {mpcStatus === 'analyzing' && <Loader2 size={14} className="spin" />}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="compendium-mpc-overlay__body">
          {proposals.length === 0 ? (
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
                    {t('mpc.empty_desc_1')}
                    <br /><br />
                    <span style={{ color: 'var(--gold)', opacity: 0.7, fontStyle: 'italic' }}>
                      {t('mpc.empty_desc_2')}
                    </span>
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="compendium-mpc-overlay__subtitle">
                {proposals.length === 1
                  ? t('mpc.subtitulo', { count: 1 })
                  : t('mpc.subtitulo_plural', { count: proposals.length })
                }
              </div>
              <div className="compendium-mpc-overlay__cards">
                {proposals.map(proposal => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onAccept={onAccept}
                    onEdit={onEdit}
                    onDismiss={onDismiss}
                    onDismissPermanently={onDismissPermanently}
                    isAccepting={acceptingMpcId === proposal.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {proposals.length > 1 && (
          <div className="compendium-mpc-overlay__footer">
            <button className="btn btn-ghost" onClick={onClearAll}>
              <Trash2 size={13} />
              {t('mpc.ignorar_todas')}
            </button>
            <button className="btn btn-primary" onClick={handleAcceptAll}>
              <CheckCircle2 size={13} />
              {t('mpc.aceptar_todas')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
