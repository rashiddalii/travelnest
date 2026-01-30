"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { Lock, Eye, EyeOff, Shield, Smartphone, History, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function SecurityContent() {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();
  const toast = useToast();
  const hasLoadedRef = useRef(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized && !loading && !user) router.push("/login");
  }, [user, loading, initialized, router]);

  useEffect(() => {
    if (user) hasLoadedRef.current = true;
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setPasswordSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update password");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Security</h1>
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="glass-card-strong rounded-xl shadow-lg p-6 space-y-6">
        <section className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="input-modern w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="input-modern w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Password must be at least 8 characters long</p>
            <button
              type="submit"
              disabled={passwordSaving || !newPassword || !confirmPassword}
              className="btn-modern flex items-center gap-2 px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {passwordSaving ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>
        <section className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Security</h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
            <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Coming soon</span>
            </div>
            <button type="button" className="w-full flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer text-left">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Active Sessions</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button type="button" className="w-full flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer text-left">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Login Activity</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl"><Skeleton className="h-8 w-32 mb-6" /><Skeleton className="h-64 w-full rounded-xl" /></div>}>
      <SecurityContent />
    </Suspense>
  );
}
