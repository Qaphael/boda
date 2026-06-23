import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const AlertContext = createContext(null);

export function useAlert() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState(null);

  const showAlert = useCallback(({ title, message, type = 'info', onConfirm, confirmText = 'OK', showCancel = false, onCancel }) => {
    setAlertState({ title, message, type, onConfirm, confirmText, showCancel, onCancel });
  }, []);

  const hideAlert = useCallback(() => setAlertState(null), []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alertState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={hideAlert}></div>
          <div className="bg-surface w-full max-w-sm rounded shadow-2xl relative z-10 border border-outline-variant overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <h3 className="text-headline-sm flex items-center gap-2">
                <span className={`material-symbols-outlined ${alertState.type === 'error' ? 'text-error' : alertState.type === 'success' ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {alertState.type === 'error' ? 'error' : alertState.type === 'success' ? 'check_circle' : 'info'}
                </span>
                {alertState.title}
              </h3>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={hideAlert}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4">
              <p className="text-body-md text-on-surface-variant mb-4">{alertState.message}</p>
              <div className="flex items-center gap-3">
                {alertState.showCancel && (
                  <button
                    className="flex-1 px-4 py-2 border border-outline-variant rounded text-label-md hover:bg-surface-container-low transition-colors"
                    onClick={() => { alertState.onCancel?.(); hideAlert(); }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  className={`flex-1 px-4 py-2 rounded text-label-md hover:opacity-90 transition-opacity ${alertState.type === 'error' ? 'bg-error text-on-error' : 'bg-primary text-on-primary'}`}
                  onClick={() => { alertState.onConfirm?.(); hideAlert(); }}
                >
                  {alertState.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}
