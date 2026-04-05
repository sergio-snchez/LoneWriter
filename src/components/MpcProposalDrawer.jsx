import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, CheckCircle2, PenLine, Trash2, Users, MapPin, Package,
  BookOpen, ChevronDown, ChevronUp, Loader2, Sparkles, XCircle, Zap
} from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useNovel } from '../context/NovelContext';
import { Tooltip } from './Tooltip';
import './MpcProposalDrawer.css';

const CONFIDENCE_META = {
  high:   { labelKey: 'mpc.confianza_alta',   cls: 'mpc-badge--high' },
  medium: { labelKey: 'mpc.confianza_media',  cls: 'mpc-badge--medium' },
  low:    { labelKey: 'mpc.confianza_baja',   cls: 'mpc-badge--low' },
};

const TYPE_TRANSLATION_KEYS = {
  characters: 'mpc.tipo_personaje',
  locations: 'mpc.tipo_lugar',
  objects: 'mpc.tipo_objeto',
  lore: 'mpc.tipo_lore',
};

// ─── Tarjeta de propuesta individual ─────────────────────────────────────────
function ProposalCard({ proposal, onAccept, onEdit, onDismiss, onDismissPermanently, isAccepting }) {
  const { t } = useTranslation('compendium');
  const [expanded, setExpanded] = useState(false);
  
  const typeBase = {
    characters: { icon: Users, color: '#6b9fd4', bg: 'rgba(107,159,212,0.1)' },
    locations: { icon: MapPin, color: '#5cb98a', bg: 'rgba(92,185,138,0.1)' },
    objects: { icon: Package, color: '#d4a853', bg: 'rgba(212,168,83,0.1)' },
    lore: { icon: BookOpen, color: '#9b72cf', bg: 'rgba(155,114,207,0.1)' },
  };

  const meta = typeBase[proposal.type] || typeBase.characters;
  const confMeta = CONFIDENCE_META[proposal.confidence] || CONFIDENCE_META.medium;
  const Icon = meta.icon;

  const displayName = proposal.name || proposal.title || '—';

  return (
    <div className="mpc-card" style={{ borderLeft: `3px solid ${meta.color}` }}>
      {/* Header de la tarjeta */}
      <div className="mpc-card__header" onClick={() => setExpanded(e => !e)}>
        <div className="mpc-card__type-badge" style={{ background: meta.bg, color: meta.color }}>
          <Icon size={12} />
          <span>{t(TYPE_TRANSLATION_KEYS[proposal.type] || 'mpc.tipo_personaje').toUpperCase()}</span>
        </div>
        <span className={`mpc-confidence-badge ${confMeta.cls}`}>
          {t(confMeta.labelKey)}
        </span>
        <button className="mpc-card__expand-btn">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Nombre de la entidad */}
      <div className="mpc-card__name">{displayName}</div>

      {/* Descripción inferida */}
      {proposal.description && (
        <p className="mpc-card__desc">"{proposal.description}"</p>
      )}

      {/* Detalle expandible */}
      {expanded && proposal.reason && (
        <div className="mpc-card__reason">
          <span className="mpc-card__reason-label">{t('mpc.motivo_label')}</span>
          <span>{proposal.reason}</span>
        </div>
      )}

      {/* Acciones */}
      <div className="mpc-card__actions">
        <Tooltip content={t('mpc.aceptar_tooltip')}>
          <button
            className="btn btn-primary mpc-action-btn"
            onClick={(e) => { e.stopPropagation(); onAccept(proposal); }}
            disabled={isAccepting}
          >
            {isAccepting ? <Loader2 size={13} className="spin" /> : <CheckCircle2 size={13} />}
            {t('mpc.aceptar')}
          </button>
        </Tooltip>

        <Tooltip content={t('mpc.editar_tooltip')}>
          <button
            className="btn btn-ghost mpc-action-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(proposal); }}
          >
            <PenLine size={13} />
            {t('mpc.editar')}
          </button>
        </Tooltip>

        <Tooltip content={t('mpc.ignorar_vez')}>
          <button
            className="btn btn-ghost btn-icon mpc-dismiss-btn"
            onClick={(e) => { e.stopPropagation(); onDismiss(proposal.id); }}
          >
            <X size={13} />
          </button>
        </Tooltip>

        <Tooltip content={t('mpc.ignorar_siempre')}>
          <button
            className="btn btn-ghost btn-icon mpc-dismiss-forever-btn"
            onClick={(e) => { e.stopPropagation(); onDismissPermanently(proposal); }}
          >
            <XCircle size={13} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

// ─── Drawer principal ─────────────────────────────────────────────────────────
export default function MpcProposalDrawer({ isOpen, onClose, onEditProposal, onManualScan, activeScene }) {
  const { t } = useTranslation('compendium');
  const [scanMessage, setScanMessage] = useState(null);
  const {
    mpcProposals, mpcStatus,
    acceptMpcProposal, dismissMpcProposal,
    dismissMpcProposalPermanently, clearMpcProposals,
  } = useAI();
  const { addCompendiumEntry } = useNovel();

  const [acceptingId, setAcceptingId] = useState(null);

  const buildCompendiumData = (proposal) => {
    // Extremos el tipo de tabla (type) para separarlo de los datos a guardar
    const { id: _id, confidence: _c, reason: _r, type, ...data } = proposal;
    
    // Normalizar campos según el tipo
    if (type === 'lore') {
      if (!data.title && data.name) { data.title = data.name; delete data.name; }
    }
    
    // Restaurar el campo 'type' interno para bases de datos
    if (data.entityType !== undefined) {
      data.type = data.entityType;
      delete data.entityType;
    }
    
    // Asegurar campos mínimos con defaults
    if (type === 'characters') {
      data.initials = data.initials || (data.name || '').substring(0, 2).toUpperCase();
      data.color = data.color || '#6b9fd4';
    }
    return { type, data };
  };

  const handleAccept = async (proposal) => {
    setAcceptingId(proposal.id);
    try {
      const { type, data } = buildCompendiumData(proposal);
      await addCompendiumEntry(type, data);   // guarda en DB + recarga NovelContext
      acceptMpcProposal(proposal.id);         // quita de la bandeja
    } catch (err) {
      console.error('[MPC] Error al aceptar propuesta:', err);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleAcceptAll = async () => {
    for (const proposal of [...mpcProposals]) {
      await handleAccept(proposal);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay semitransparente */}
      <div className="mpc-drawer-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="mpc-drawer" role="dialog" aria-label={t('mpc.titulo')}>
        {/* Header */}
        <div className="mpc-drawer__header">
          <div className="mpc-drawer__title-row">
            <Sparkles size={18} className="mpc-sparkle-icon" />
            <span className="mpc-drawer__title">{t('mpc.titulo')}</span>
            {mpcStatus === 'analyzing' && (
              <Loader2 size={14} className="spin mpc-analyzing-indicator" />
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Subtítulo */}
        <div className="mpc-drawer__subtitle">
          {mpcProposals.length === 0
            ? t('mpc.sin_pendientes')
            : t(mpcProposals.length > 1 ? 'mpc.subtitulo_plural' : 'mpc.subtitulo', { count: mpcProposals.length })
          }
        </div>

        {/* Lista de propuestas */}
        <div className="mpc-drawer__body">
          {mpcProposals.length === 0 ? (
            <div className="mpc-empty">
              {mpcStatus === 'analyzing' ? (
                <Loader2 size={32} className="spin mpc-empty-icon" style={{ color: 'var(--accent)' }} />
              ) : (
                <Sparkles size={32} className="mpc-empty-icon" />
              )}
              {mpcStatus === 'analyzing' ? (
                <p>{t('ai:oraculo.consultando')}</p>
              ) : (
                <p>
                  {t('mpc.empty_desc_1')}
                  <br /><br />
                  <span style={{ color: 'var(--gold)', opacity: 0.7, fontStyle: 'italic' }}>
                    {t('mpc.empty_desc_2')}
                  </span>
                </p>
              )}
              
              {mpcStatus !== 'analyzing' && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (!activeScene?.content) {
                      const msg = t('mpc.scan_from_editor');
                      setScanMessage(msg);
                      setTimeout(() => { setScanMessage(''); }, 3000);
                      return;
                    }
                    window.dispatchEvent(new CustomEvent('mpc-manual-scan'));
                  }}
                  style={{ gap: '8px', borderRadius: '20px', marginTop: '10px' }}
                >
                  <Zap size={14} />
                  {t('mpc.escanear_ahora')}
                </button>
              )}
              {scanMessage ? (
                <p style={{ color: 'var(--gold)', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
                  {scanMessage}
                </p>
              ) : null}
            </div>
          ) : (
            mpcProposals.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onAccept={handleAccept}
                onEdit={onEditProposal}
                onDismiss={dismissMpcProposal}
                onDismissPermanently={dismissMpcProposalPermanently}
                isAccepting={acceptingId === proposal.id}
              />
            ))
          )}
        </div>

        {/* Footer con acciones globales */}
        {mpcProposals.length > 1 && (
          <div className="mpc-drawer__footer">
            <button className="btn btn-ghost mpc-footer-btn" onClick={clearMpcProposals}>
              <Trash2 size={13} />
              {t('mpc.ignorar_todas')}
            </button>
            <button className="btn btn-primary mpc-footer-btn" onClick={handleAcceptAll}>
              <CheckCircle2 size={13} />
              {t('mpc.aceptar_todas')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
