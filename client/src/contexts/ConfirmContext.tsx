import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    setState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const close = (value: boolean) => {
    if (resolver) resolver(value);
    setResolver(null);
    setState(null);
  };

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), []);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state?.open && (
        <div className="fixed inset-0 z-[120] bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-slate-900 text-lg font-semibold">{state.title || "Confirm Action"}</h3>
              <p className="text-slate-600 text-sm mt-2">{state.message}</p>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium"
              >
                {state.cancelText || "Cancel"}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg text-white transition-colors font-medium ${
                  state.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-700 hover:bg-blue-800"
                }`}
              >
                {state.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within ConfirmProvider");
  return context;
}
