import { useEffect } from 'react';
import { CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUiStore, type Toast } from '@farm/store/useUiStore';
import { cn } from '@farm/lib/utils';

const DISMISS_MS = 5_000;
const DISMISS_WITH_ACTION_MS = 10_000;

const TONE = {
  success: { icon: CheckCircle, className: 'text-success-fg' },
  info: { icon: Info, className: 'text-info-fg' },
  error: { icon: XCircle, className: 'text-danger-fg' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { t } = useTranslation();
  const dismiss = useUiStore((s) => s.dismissToast);
  const { icon: Icon, className } = TONE[toast.tone];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.action ? DISMISS_WITH_ACTION_MS : DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id, toast.action]);

  return (
    <li
      role={toast.tone === 'error' ? 'alert' : undefined}
      className="pointer-events-auto flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink shadow-lg"
    >
      <Icon size={18} aria-hidden className={cn('shrink-0', className)} />
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            dismiss(toast.id);
          }}
          className="font-semibold text-brand-fg hover:underline cursor-pointer"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label={t('common.dismiss')}
        className="p-1 rounded text-ink-muted hover:text-ink cursor-pointer"
      >
        <X size={14} aria-hidden />
      </button>
    </li>
  );
}

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-96"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ol>
  );
}
