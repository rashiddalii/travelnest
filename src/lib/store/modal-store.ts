import { create } from "zustand";

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
}

interface ModalState {
  isOpen: boolean;
  options: ConfirmModalOptions | null;
  resolve: ((value: boolean) => void) | null;
  openConfirm: (options: ConfirmModalOptions) => Promise<boolean>;
  closeConfirm: (confirmed: boolean) => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,
  openConfirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options,
        resolve,
      });
    });
  },
  closeConfirm: (confirmed) => {
    const { resolve } = get();
    if (resolve) {
      resolve(confirmed);
    }
    set({
      isOpen: false,
      options: null,
      resolve: null,
    });
  },
}));
