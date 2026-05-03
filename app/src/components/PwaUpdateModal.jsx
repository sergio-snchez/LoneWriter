import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
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
        <div className="pwa-update-modal__footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={handleUpdate} style={{ width: '100%' }}>
            {t('actualizacion.boton_aceptar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaUpdateModal;