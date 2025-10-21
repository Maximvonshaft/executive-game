import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { motionTokens, radiusScale, spacingScale } from '../theme/tokens';

type ToastTone = 'default' | 'positive' | 'caution' | 'critical';

export type Toast = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastContextValue = {
  present: (toast: Omit<Toast, 'id'> & { id?: string }) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { background: string; border: string }> = {
  default: { background: 'var(--color-surfaceMuted)', border: '1px solid var(--color-border)' },
  positive: { background: 'rgba(52, 211, 153, 0.12)', border: '1px solid var(--color-positive)' },
  caution: { background: 'rgba(250, 204, 21, 0.12)', border: '1px solid var(--color-caution)' },
  critical: { background: 'rgba(248, 113, 113, 0.12)', border: '1px solid var(--color-critical)' }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const present = useCallback((toast: Omit<Toast, 'id'> & { id?: string }) => {
    const id = toast.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tone = toast.tone ?? 'default';
    setToasts((current) => [...current.filter((item) => item.id !== id), { ...toast, id, tone }]);
    const timeout = toast.duration ?? 4000;
    if (timeout > 0) {
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, timeout);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ present, dismiss }), [present, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: `calc(env(safe-area-inset-bottom) + ${spacingScale.lg}px)`,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: `${spacingScale.sm}px`,
          width: 'min(480px, calc(100vw - 32px))'
        }}
      >
        {toasts.map((toast) => {
          const tone = toneStyles[toast.tone ?? 'default'];
          return (
            <div
              key={toast.id}
              role="alert"
              style={{
                background: tone.background,
                border: tone.border,
                borderRadius: `${radiusScale.md}px`,
                padding: `${spacingScale.md}px ${spacingScale.lg}px`,
                boxShadow: '0 12px 20px rgba(0, 0, 0, 0.25)',
                backdropFilter: 'blur(12px)',
                transition: `transform ${motionTokens.durationShort} ${motionTokens.easingStandard}`
              }}
            >
              <strong style={{ display: 'block', marginBottom: 4 }}>{toast.title}</strong>
              {toast.description ? (
                <span style={{ color: 'var(--color-textMuted)', fontSize: 14 }}>{toast.description}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast 必须在 ToastProvider 中使用');
  }
  return context;
}
