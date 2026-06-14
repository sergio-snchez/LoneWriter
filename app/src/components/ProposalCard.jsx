import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, CheckCircle2, PenLine, Users, MapPin, Package,
  BookOpen, ChevronDown, ChevronUp, Loader2, XCircle
} from 'lucide-react'
import PropTypes from 'prop-types'
import { Tooltip } from './'
import './MpcProposalDrawer.css'

const CONFIDENCE_META = {
  high:   { labelKey: 'mpc.confianza_alta',   cls: 'mpc-badge--high' },
  medium: { labelKey: 'mpc.confianza_media',  cls: 'mpc-badge--medium' },
  low:    { labelKey: 'mpc.confianza_baja',   cls: 'mpc-badge--low' },
}

const TYPE_TRANSLATION_KEYS = {
  characters: 'mpc.tipo_personaje',
  locations: 'mpc.tipo_lugar',
  objects: 'mpc.tipo_objeto',
  lore: 'mpc.tipo_lore',
}

export default function ProposalCard({ proposal, onAccept, onEdit, onDismiss, onDismissPermanently, isAccepting }) {
  ProposalCard.propTypes = {
    proposal: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      type: PropTypes.oneOf(['characters', 'locations', 'objects', 'lore']),
      name: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
      reason: PropTypes.string,
      confidence: PropTypes.oneOf(['high', 'medium', 'low']),
    }).isRequired,
    onAccept: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDismiss: PropTypes.func.isRequired,
    onDismissPermanently: PropTypes.func.isRequired,
    isAccepting: PropTypes.bool,
  };

  const { t } = useTranslation('compendium')
  const [expanded, setExpanded] = useState(false)

  const typeBase = {
    characters: { icon: Users, color: '#6b9fd4', bg: 'rgba(107,159,212,0.1)' },
    locations: { icon: MapPin, color: '#5cb98a', bg: 'rgba(92,185,138,0.1)' },
    objects: { icon: Package, color: '#d4a853', bg: 'rgba(212,168,83,0.1)' },
    lore: { icon: BookOpen, color: '#9b72cf', bg: 'rgba(155,114,207,0.1)' },
  }

  const meta = typeBase[proposal.type] || typeBase.characters
  const confMeta = CONFIDENCE_META[proposal.confidence] || CONFIDENCE_META.medium
  const Icon = meta.icon
  const displayName = proposal.name || proposal.title || '—'

  return (
    <div className="mpc-card" style={{ '--proposal-color': meta.color }}>
      <div className="mpc-card__header" onClick={() => setExpanded(e => !e)}>
        <div className="mpc-card__type-badge">
          <Icon size={12} />
          <span>{t(TYPE_TRANSLATION_KEYS[proposal.type] || 'mpc.tipo_personaje').toUpperCase()}</span>
        </div>
        <span className={`mpc-confidence-badge ${confMeta.cls}`}>{t(confMeta.labelKey)}</span>
        <button className="mpc-card__expand-btn">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="mpc-card__name">{displayName}</div>

      {proposal.description && (
        <p className="mpc-card__desc">"{proposal.description}"</p>
      )}

      {expanded && proposal.reason && (
        <div className="mpc-card__reason">
          <span className="mpc-card__reason-label">{t('mpc.motivo_label')}</span>
          <span>{proposal.reason}</span>
        </div>
      )}

      <div className="mpc-card__actions">
        <Tooltip content={t('mpc.aceptar_tooltip')}>
          <button className="btn btn-primary mpc-action-btn" onClick={(e) => { e.stopPropagation(); onAccept(proposal) }} disabled={isAccepting}>
            {isAccepting ? <Loader2 size={13} className="spin" /> : <CheckCircle2 size={13} />}
            {t('mpc.aceptar')}
          </button>
        </Tooltip>

        <Tooltip content={t('mpc.editar_tooltip')}>
          <button className="btn btn-ghost mpc-action-btn" onClick={(e) => { e.stopPropagation(); onEdit(proposal) }}>
            <PenLine size={13} />{t('mpc.editar')}
          </button>
        </Tooltip>

        <Tooltip content={t('mpc.ignorar_vez')}>
          <button className="btn btn-ghost btn-icon mpc-dismiss-btn" onClick={(e) => { e.stopPropagation(); onDismiss(proposal.id) }}>
            <X size={13} />
          </button>
        </Tooltip>

        <Tooltip content={t('mpc.ignorar_siempre')}>
          <button className="btn btn-ghost btn-icon mpc-dismiss-forever-btn" onClick={(e) => { e.stopPropagation(); onDismissPermanently(proposal) }}>
            <XCircle size={13} />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
