import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';
import './PwaUpdateModal.css';

const PwaUpdateModal = ({ isOpen, onUpdate }) => {
  const { t } = useTranslation('app');
  
  if (!isOpen) return null;

  const handleUpdate = () => {
    if (onUpdate) onUpdate();
  };

  return (
    <div className="pwa-update-overlay">
      <div className="pwa-update-modal">
        <div className="pwa-update-modal__header">
          <RefreshCw size={20} className="pwa-update-modal__icon" />
          <h2 className="pwa-update-modal__title">{t('actualizacion.titulo')}</h2>
        </div>
        <div className="pwa-update-modal__body">
          <p>{t('actualizacion.mensaje')}</p>
        </div>
        <div className="pwa-update-modal__footer pwa-update-modal__footer--centered">
          <button className="btn btn-primary pwa-update-modal__action-btn" onClick={handleUpdate}>
            {t('actualizacion.boton_aceptar')}
          </button>
        </div>
      </div>
    </div>
  );
};

PwaUpdateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func,
};

export default PwaUpdateModal;