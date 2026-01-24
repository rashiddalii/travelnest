import { create } from "zustand";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearAll: () => {
    set({ toasts: [] });
  },
}));

// Convenience hook for using toasts
export function useToast() {
  const { addToast, removeToast, clearAll } = useToastStore();

  const toast = {
    success: (message: string, duration = 4000) =>
      addToast({ message, variant: "success", duration }),
    error: (message: string, duration = 5000) =>
      addToast({ message, variant: "error", duration }),
    warning: (message: string, duration = 4000) =>
      addToast({ message, variant: "warning", duration }),
    info: (message: string, duration = 4000) =>
      addToast({ message, variant: "info", duration }),
    dismiss: removeToast,
    dismissAll: clearAll,
  };

  return toast;
}
