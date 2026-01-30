"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { useConfirm } from "@/hooks/use-confirm";
import { Download, UserX, Trash2, Link2, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function AccountContent() {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();
  const toast = useToast();
  const { confirm } = useConfirm();
  const hasLoadedRef = useRef(false);
  const [accountActionLoading, setAccountActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (initialized && !loading && !user) router.push("/login");
  }, [user, loading, initialized, router]);

  useEffect(() => {
    if (user) hasLoadedRef.current = true;
  }, [user]);

  const handleDownloadData = async () => {
    setAccountActionLoading("download");
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success("We'll email your data when it's ready.");
    } finally {
      setAccountActionLoading(null);
    }
  };

  const handleDeactivateAccount = async () => {
    const confirmed = await confirm({
      title: "Deactivate account",
      message: "Your account will be disabled. You can sign in again later to reactivate. Continue?",
      confirmLabel: "Deactivate",
      variant: "danger",
    });
    if (!confirmed) return;
    setAccountActionLoading("deactivate");
    try {
      await new Promise((r) => setTimeout(r, 500));
      toast.success("Account deactivated.");
    } finally {
      setAccountActionLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: "Delete account",
      message: "This will permanently delete your account and all your data. This cannot be undone.",
      confirmLabel: "Delete forever",
      variant: "danger",
    });
    if (!confirmed) return;
    setAccountActionLoading("delete");
    try {
      await new Promise((r) => setTimeout(r, 500));
      toast.error("Account deletion must be completed from your email. Check your inbox.");
    } finally {
      setAccountActionLoading(null);
    }
  };

  const provider = (user as { app_metadata?: { provider?: string } })?.app_metadata?.provider;

  if (!initialized || (loading && !hasLoadedRef.current) || !user) {
    return (
      <div className="max-w-2xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account</h1>
      <div className="glass-card-strong rounded-xl shadow-lg p-6 space-y-6">
        <section className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Data & account</h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
            <button
              type="button"
              onClick={handleDownloadData}
              disabled={accountActionLoading === "download"}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">Download my data</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Get a copy of your data</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              type="button"
              onClick={handleDeactivateAccount}
              disabled={accountActionLoading === "deactivate"}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <UserX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Deactivate account</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={accountActionLoading === "delete"}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Delete account</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </section>
        <section className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Connected accounts</h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
            <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 gap-4">
              <div className="flex items-center gap-3">
                <Link2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">Google</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {provider === "google" ? "Connected" : "Not connected"}
                  </span>
                </div>
              </div>
              {provider === "google" ? (
                <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl"><Skeleton className="h-8 w-32 mb-6" /><Skeleton className="h-64 w-full rounded-xl" /></div>}>
      <AccountContent />
    </Suspense>
  );
}
