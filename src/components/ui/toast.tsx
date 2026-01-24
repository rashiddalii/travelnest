"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { Toast as ToastType, ToastVariant } from "@/lib/store/toast-store";

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const variantStyles: Record<
  ToastVariant,
  { bg: string; border: string; icon: string; iconColor: string }
> = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "bg-emerald-100 dark:bg-emerald-900",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950/50",
    border: "border-red-200 dark:border-red-800",
    icon: "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-600 dark:text-red-400",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-800",
    icon: "bg-amber-100 dark:bg-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-200 dark:border-blue-800",
    icon: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const styles = variantStyles[toast.variant];
  const icon = variantIcons[toast.variant];

  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(toast.id), 300);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -20, scale: 0.95 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
        ${styles.bg} ${styles.border}
        min-w-[300px] max-w-[500px]
      `}
    >
      <div className={`shrink-0 p-2 rounded-lg ${styles.icon}`}>
        <span className={styles.iconColor}>{icon}</span>
      </div>
      <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
        {toast.message}
      </p>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStoreImport();

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Import the store inside the component to avoid hydration issues
import { useToastStore as useToastStoreImport } from "@/lib/store/toast-store";
