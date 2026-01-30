"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { Globe, Eye, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type VisibilityValue = "public" | "friends" | "private";

function PrivacyContent() {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();
  const toast = useToast();
  const hasLoadedRef = useRef(false);
  const [privacyProfileVisibility, setPrivacyProfileVisibility] = useState<VisibilityValue>("friends");
  const [privacyTripBoardDefault, setPrivacyTripBoardDefault] = useState<VisibilityValue>("friends");
  const [privacyMemoriesVisibility, setPrivacyMemoriesVisibility] = useState<VisibilityValue>("friends");
  const [privacySaving, setPrivacySaving] = useState(false);

  useEffect(() => {
    if (initialized && !loading && !user) router.push("/login");
  }, [user, loading, initialized, router]);

  useEffect(() => {
    if (user) hasLoadedRef.current = true;
  }, [user]);

  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      toast.success("Privacy settings saved.");
    } finally {
      setPrivacySaving(false);
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Privacy</h1>
      <div className="glass-card-strong rounded-xl shadow-lg p-6">
        <section className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Visibility</h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
            <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">Profile visibility</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Who can see your profile</span>
                </div>
              </div>
              <select
                value={privacyProfileVisibility}
                onChange={(e) => setPrivacyProfileVisibility(e.target.value as VisibilityValue)}
                className="input-modern px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 cursor-pointer"
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <Eye className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">Trip board default</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Default visibility for new trips</span>
                </div>
              </div>
              <select
                value={privacyTripBoardDefault}
                onChange={(e) => setPrivacyTripBoardDefault(e.target.value as VisibilityValue)}
                className="input-modern px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 cursor-pointer"
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">Memories visibility</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Photos & notes on trip boards</span>
                </div>
              </div>
              <select
                value={privacyMemoriesVisibility}
                onChange={(e) => setPrivacyMemoriesVisibility(e.target.value as VisibilityValue)}
                className="input-modern px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 cursor-pointer"
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={handleSavePrivacy}
              disabled={privacySaving}
              className="btn-modern px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {privacySaving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl"><Skeleton className="h-8 w-32 mb-6" /><Skeleton className="h-64 w-full rounded-xl" /></div>}>
      <PrivacyContent />
    </Suspense>
  );
}
