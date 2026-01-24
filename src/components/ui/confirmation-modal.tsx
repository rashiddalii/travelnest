"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";
import { useModalStore } from "@/lib/store/modal-store";

const variantStyles = {
  danger: {
    icon: <Trash2 className="w-6 h-6" />,
    iconBg: "bg-red-100 dark:bg-red-900/50",
    iconColor: "text-red-600 dark:text-red-400",
    confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

export function ConfirmationModal() {
  const { isOpen, options, closeConfirm } = useModalStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const variant = options?.variant || "danger";
  const styles = variantStyles[variant];

  // Focus trap and escape key
  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button when modal opens
      setTimeout(() => confirmBtnRef.current?.focus(), 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeConfirm(false);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, closeConfirm]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeConfirm(false);
    }
  };

  if (!options) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className="flex items-start gap-4 p-6 pb-4">
              <div className={`shrink-0 p-3 rounded-full ${styles.iconBg}`}>
                <span className={styles.iconColor}>{styles.icon}</span>
              </div>
              <div className="flex-1 pt-1">
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  {options.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {options.message}
                </p>
              </div>
              <button
                onClick={() => closeConfirm(false)}
                className="shrink-0 p-2 -mt-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 pt-4 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => closeConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                {options.cancelLabel || "Cancel"}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => closeConfirm(true)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors cursor-pointer ${styles.confirmBtn}`}
              >
                {options.confirmLabel || "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
