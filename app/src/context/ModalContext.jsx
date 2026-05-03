import { createContext, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const { t } = useTranslation('common');
  const [modal, setModal] = useState({ type: null, data: null });
  const [modalInput, setModalInput] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const openModal = (type, data = null) => {
    setIsClosing(false);
    setModal({ type, data });
    setModalInput('');
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setModal({ type: null, data: null });
      setModalInput('');
      setIsClosing(false);
    }, 220);
  };

  const value = {
    modal,
    modalInput,
    setModalInput,
    openModal,
    closeModal
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {modal.type && (
        <div className={`modal-overlay${isClosing ? ' modal-overlay--closing' : ''}`} onClick={closeModal}>
          <div className={`modal-content${isClosing ? ' modal-content--closing' : ''}`} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">
              {modal.type === 'project' && t('modales.titulo_nueva_novela')}
              {modal.type === 'prompt' && (modal.data.title || t('modales.titulo_entrada_requerida'))}
              {modal.type === 'confirm' && (modal.data.title || t('modales.titulo_confirmar'))}
              {modal.type === 'alert' && (modal.data.title || t('modales.titulo_confirmar'))}
            </h2>
            
            <p className="modal-text">
              {modal.type === 'project' && t('modales.texto_nueva_novela')}
              {modal.type === 'prompt' && modal.data.message}
              {modal.type === 'confirm' && modal.data.message}
              {modal.type === 'alert' && modal.data.message}
            </p>

            {(modal.type === 'project' || modal.type === 'prompt') && (
              <input 
                autoFocus
                className="modal-input"
                placeholder={modal.data?.placeholder || t('modales.placeholder')}
                value={modalInput}
                onChange={e => setModalInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const canSubmit = modal.data?.allowEmpty ? true : !!modalInput.trim();
                    if (canSubmit) {
                      modal.data?.onConfirm?.(modalInput.trim()) || modal.onConfirm?.(modalInput.trim());
                      closeModal();
                    }
                  }
                  if (e.key === 'Escape') closeModal();
                }}
              />
            )}

            <div className="modal-actions">
              {modal.type !== 'alert' && (
                <button className="btn btn-ghost" onClick={closeModal}>{t('botones.cancelar')}</button>
              )}
              
              {modal.type === 'alert' ? (
                <button className="btn btn-primary" onClick={closeModal}>
                  {t('botones.aceptar')}
                </button>
              ) : modal.type === 'confirm' ? (
                <button 
                  className={`btn ${modal.data.isDanger ? 'btn-danger' : 'btn-primary'}`} 
                  onClick={() => {
                    modal.data.onConfirm();
                    closeModal();
                  }}
                >
                  {modal.data.confirmLabel || t('botones.confirmar')}
                </button>
              ) : (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    const canSubmit = modal.data?.allowEmpty ? true : !!modalInput.trim();
                    if (canSubmit) {
                      modal.data.onConfirm(modalInput.trim());
                      closeModal();
                    }
                  }}
                  disabled={!modal.data?.allowEmpty && !modalInput.trim()}
                >
                  {modal.data?.confirmLabel || t('botones.aceptar')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
