import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ConfirmOptions {
  message: string;
  title?: string;
  variant?: 'warning' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface AlertOptions {
  message: string;
  title?: string;
}

interface ConfirmContextType {
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (messageOrOptions: string | AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = (): ConfirmContextType => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
};

interface DialogState {
  type: 'confirm' | 'alert';
  options: ConfirmOptions | AlertOptions;
  resolve: (value: boolean) => void;
}

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const requestConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({ type: 'confirm', options, resolve });
    });
  }, []);

  const showAlert = useCallback((messageOrOptions: string | AlertOptions): Promise<void> => {
    const options: AlertOptions = typeof messageOrOptions === 'string'
      ? { message: messageOrOptions }
      : messageOrOptions;
    return new Promise(resolve => {
      setDialog({ type: 'alert', options, resolve: () => resolve() });
    });
  }, []);

  const handleClose = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const variantColors = {
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    danger: 'bg-red-500 hover:bg-red-600',
    info: 'bg-blue-500 hover:bg-blue-600',
  };

  const confirmOptions = dialog?.options as ConfirmOptions;
  const variant = confirmOptions?.variant || 'warning';

  return (
    <ConfirmContext.Provider value={{ requestConfirm, showAlert }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-theme-card w-full max-w-[400px] rounded-2xl border border-theme-divider shadow-2xl animate-scaleIn mx-4">
            <div className="p-6 space-y-4">
              {(dialog.options as any).title && (
                <h3 className="text-lg font-bold font-square text-theme-text tracking-wider uppercase">
                  {(dialog.options as any).title}
                </h3>
              )}
              <p className="text-theme-textMuted text-sm leading-relaxed">
                {dialog.options.message}
              </p>
            </div>
            <div className="flex border-t border-theme-divider">
              {dialog.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => handleClose(false)}
                    className="flex-1 py-3 text-theme-textMuted hover:bg-theme-bg transition-colors text-sm font-medium rounded-bl-2xl"
                  >
                    {confirmOptions?.cancelText || 'Cancelar'}
                  </button>
                  <button
                    onClick={() => handleClose(true)}
                    className={`flex-1 py-3 text-white ${variantColors[variant]} transition-colors text-sm font-bold rounded-br-2xl`}
                  >
                    {confirmOptions?.confirmText || 'Confirmar'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleClose(true)}
                  className="flex-1 py-3 text-theme-text hover:bg-theme-bg transition-colors text-sm font-bold rounded-b-2xl"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
