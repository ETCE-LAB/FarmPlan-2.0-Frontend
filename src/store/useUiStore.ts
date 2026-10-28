import { create } from 'zustand';
import { createId } from '@farm/lib/utils';

export type ToastTone = 'success' | 'info' | 'error';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'default' | 'danger';
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

interface UiState {
  toasts: Toast[];
  confirmRequest: ConfirmRequest | null;
  sidebarOpen: boolean;
  dismissToast: (id: string) => void;
  resolveConfirm: (confirmed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  toasts: [],
  confirmRequest: null,
  sidebarOpen: false,
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  resolveConfirm: (confirmed) => {
    get().confirmRequest?.resolve(confirmed);
    set({ confirmRequest: null });
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));

export function showToast(toast: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone }) {
  const id = createId('toast');
  useUiStore.setState((state) => ({ toasts: [...state.toasts, { tone: 'success', ...toast, id }] }));
  return id;
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  useUiStore.getState().confirmRequest?.resolve(false);
  return new Promise((resolve) => useUiStore.setState({ confirmRequest: { ...options, resolve } }));
}
