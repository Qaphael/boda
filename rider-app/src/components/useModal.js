import { useState, useCallback, useRef } from 'react';
import AppModal from './AppModal';

export function useModal() {
  const [modal, setModal] = useState(null);
  const onCloseRef = useRef(null);

  const showModal = useCallback(({ icon, title, message, actions, onClose }) => {
    onCloseRef.current = onClose;
    setModal({ icon, title, message, actions: actions || [{ label: 'OK' }] });
  }, []);

  const hideModal = useCallback(() => {
    const cb = onCloseRef.current;
    setModal(null);
    cb?.();
  }, []);

  function ModalComponent() {
    return (
      <AppModal
        visible={!!modal}
        onClose={hideModal}
        icon={modal?.icon}
        title={modal?.title}
        message={modal?.message}
        actions={modal?.actions}
      />
    );
  }

  return { showModal, ModalComponent };
}
