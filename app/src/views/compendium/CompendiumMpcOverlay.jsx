import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Sparkles, X, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import { ProposalCard } from '../../components'
import './CompendiumMpcOverlay.css'

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
    >
      <div
        className={`compendium-mpc-overlay__panel${isClosing ? ' compendium-mpc-overlay__panel--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
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
                  <Loader2 size={32} className="spin compendium-mpc-overlay__loading-icon" />
                  <p>{t('ai:oraculo.consultando')}</p>
                </>
              ) : (
                <>
                  <Sparkles size={32} className="compendium-mpc-overlay__empty-icon" />
                  <p>
                    {t('mpc.empty_desc_1')}
                    <br /><br />
                    <span className="compendium-mpc-overlay__empty-quote">
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
CompendiumMpcOverlay.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isClosing: PropTypes.bool,
  proposals: PropTypes.array.isRequired,
  mpcStatus: PropTypes.string,
  acceptingMpcId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClose: PropTypes.func.isRequired,
  onAccept: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  onDismissPermanently: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
};
