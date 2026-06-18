import { useState, useCallback } from 'react';
import AppModal from './AppModal';

export function useModal() {
  const [modal, setModal] = useState(null);

  const showModal = useCallback(({ icon, title, message, actions, onClose }) => {
    setModal({ icon, title, message, actions: actions || [{ label: 'OK' }], onClose });
  }, []);

  const hideModal = useCallback(() => {
    const onClose = modal?.onClose;
    setModal(null);
    onClose?.();
  }, [modal]);

  const ModalComponent = useCallback(() => (
    <AppModal
      visible={!!modal}
      onClose={hideModal}
      icon={modal?.icon}
      title={modal?.title}
      message={modal?.message}
      actions={modal?.actions}
    />
  ), [modal, hideModal]);

  return { showModal, ModalComponent };
}
