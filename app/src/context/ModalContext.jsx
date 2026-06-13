import { createContext, useContext, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import './ModalContext.css';

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

  const timeoutRef = useRef(null);
  
  const openModal = (type, data = null) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsClosing(false);
    setModal({ type, data });
    setModalInput('');
  };

  const closeModal = () => {
    setIsClosing(true);
    timeoutRef.current = setTimeout(() => {
      setModal({ type: null, data: null });
      setModalInput('');
      setIsClosing(false);
      timeoutRef.current = null;
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
            {modal.type === 'custom' ? modal.data.render(closeModal) : (
              <>
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
                  <input autoFocus className="modal-input" placeholder={modal.data?.placeholder || t('modales.placeholder')} value={modalInput} onChange={e => setModalInput(e.target.value)} onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const canSubmit = modal.data?.allowEmpty ? true : !!modalInput.trim();
                      if (canSubmit) { modal.data?.onConfirm?.(modalInput.trim()) || modal.onConfirm?.(modalInput.trim()); closeModal() }
                    }
                    if (e.key === 'Escape') closeModal()
                  }} />
                )}

                <ModalActions type={modal.type} data={modal.data} modalInput={modalInput} closeModal={closeModal} t={t} />
              </>
            )}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

/* ---- Sub-component: modal action buttons ---- */
function ModalActions({ type, data, modalInput, closeModal, t }) {
  return (
    <div className="modal-actions">
      {type !== 'alert' && (
        <button className="btn btn-ghost" onClick={closeModal}>{t('botones.cancelar')}</button>
      )}
      {type === 'alert' ? (
        <button className="btn btn-primary" onClick={closeModal}>{t('botones.aceptar')}</button>
      ) : type === 'confirm' ? (
        <button className={`btn ${data.isDanger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { data.onConfirm(); closeModal() }}>{data.confirmLabel || t('botones.confirmar')}</button>
      ) : type !== 'custom' ? (
        <button className="btn btn-primary" onClick={() => { const canSubmit = data?.allowEmpty ? true : !!modalInput.trim(); if (canSubmit) { data.onConfirm(modalInput.trim()); closeModal() } }} disabled={!data?.allowEmpty && !modalInput.trim()}>{data?.confirmLabel || t('botones.aceptar')}</button>
      ) : null}
    </div>
  );
}

ModalActions.propTypes = {
  type: PropTypes.string,
  data: PropTypes.object,
  modalInput: PropTypes.string,
  closeModal: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

ModalProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
