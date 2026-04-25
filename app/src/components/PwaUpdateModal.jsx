import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import './PwaUpdateModal.css';

const PwaUpdateModal = ({ isOpen, onUpdate, onDismiss }) => {
  if (!isOpen) return null;

  const handleUpdate = () => {
    if (onUpdate) onUpdate();
  };

  const handleDismiss = () => {
    if (onDismiss) onDismiss();
  };

  return (
    <div className="pwa-update-overlay" onClick={handleDismiss}>
      <div className="pwa-update-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pwa-update-modal__header">
          <RefreshCw size={24} className="pwa-update-modal__icon" />
          <h2 className="pwa-update-modal__title">Nueva versión disponible</h2>
          <button className="pwa-update-modal__close" onClick={handleDismiss}>
            <X size={18} />
          </button>
        </div>
        <div className="pwa-update-modal__body">
          <p>Detectada nueva versión de LoneWriter. Pulsa aceptar para actualizar.</p>
        </div>
        <div className="pwa-update-modal__footer">
          <button className="btn btn-ghost" onClick={handleDismiss}>
            Más tarde
          </button>
          <button className="btn btn-primary" onClick={handleUpdate}>
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaUpdateModal;