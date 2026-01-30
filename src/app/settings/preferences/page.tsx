"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { Save } from "lucide-react";
import {
  TRAVEL_STYLES,
  TRAVEL_GROUPS,
  PLANNING_MODES,
  type ProfilePreferences,
  type TravelStyle,
} from "@/app/settings/constants";
import { Skeleton } from "@/components/ui/skeleton";

function PreferencesContent() {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();
  const toast = useToast();
  const hasLoadedRef = useRef(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ProfilePreferences>({});

  useEffect(() => {
    if (initialized && !loading && !user) router.push("/login");
  }, [user, loading, initialized, router]);

  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    setProfileLoading(true);
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      if (response.ok) {
        const prefs = data.profile?.preferences || {};
        setPreferences({
          travel_styles: prefs.travel_styles || [],
          typical_group: prefs.typical_group,
          planning_mode: prefs.planning_mode,
        });
      }
    } catch (err) {
      setError("Failed to load preferences");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travel_styles: preferences.travel_styles || [],
          planning_mode: preferences.planning_mode || "manual_planner",
          typical_group: preferences.typical_group,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update preferences");
      toast.success("Preferences updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const toggleTravelStyle = (styleId: TravelStyle) => {
    const currentStyles = preferences.travel_styles || [];
    const newStyles = currentStyles.includes(styleId)
      ? currentStyles.filter((id) => id !== styleId)
      : [...currentStyles, styleId];
    setPreferences({ ...preferences, travel_styles: newStyles });
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

  if (profileLoading) {
    return (
      <div className="max-w-2xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Preferences</h1>
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="glass-card-strong rounded-xl shadow-lg p-6 space-y-0">
        <section className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Travel style</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select all that apply</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TRAVEL_STYLES.map((style) => {
              const Icon = style.icon;
              const isSelected = preferences.travel_styles?.includes(style.id) || false;
              return (
                <button
                  key={style.id}
                  onClick={() => toggleTravelStyle(style.id)}
                  className={`card-hover p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                    isSelected ? "border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 dark:border-blue-500 shadow-md" : "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`block text-sm font-medium ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"}`}>{style.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{style.description}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {preferences.travel_styles && preferences.travel_styles.length > 0 && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{preferences.travel_styles.length} selected</p>
          )}
        </section>
        <section className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Who do you travel with?</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TRAVEL_GROUPS.map((group) => {
              const Icon = group.icon;
              const isSelected = preferences.typical_group === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => setPreferences({ ...preferences, typical_group: group.id })}
                  className={`card-hover p-4 rounded-xl border-2 transition-all text-center cursor-pointer ${
                    isSelected ? "border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 dark:border-blue-500 shadow-md" : "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600"
                  }`}
                >
                  <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-sm font-medium ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"}`}>{group.label}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">How do you like to plan?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLANNING_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = preferences.planning_mode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setPreferences({ ...preferences, planning_mode: mode.id })}
                  className={`card-hover p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                    isSelected ? "border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 dark:border-blue-500 shadow-md" : "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`block text-sm font-medium ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"}`}>{mode.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{mode.description}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="btn-modern flex items-center gap-2 px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl"><Skeleton className="h-8 w-32 mb-6" /><Skeleton className="h-64 w-full rounded-xl" /></div>}>
      <PreferencesContent />
    </Suspense>
  );
}
