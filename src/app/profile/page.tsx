"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useProfileStore } from "@/lib/store/profile-store";
import { useToast } from "@/lib/store/toast-store";
import { useConfirm } from "@/hooks/use-confirm";
import { Navbar } from "@/components/layout/navbar";
import {
  User,
  Users,
  UsersRound,
  Heart,
  Sparkles,
  Save,
  Upload,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Palmtree,
  PartyPopper,
  UtensilsCrossed,
  Mountain,
  Wallet,
  Crown,
  Wand2,
  ClipboardList,
} from "lucide-react";
import type { Profile } from "@/types/profile";
import type { TravelStyle, TravelGroup, PlanningMode } from "@/types/onboarding";
import { Skeleton } from "@/components/ui/skeleton";

// Travel style options (multi-select)
const TRAVEL_STYLES: {
  id: TravelStyle;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "chill_relax",
    label: "Chill & Relax",
    description: "Laid-back vibes, beaches, spas",
    icon: Palmtree,
  },
  {
    id: "party_nightlife",
    label: "Party & Nightlife",
    description: "Clubs, bars, social scenes",
    icon: PartyPopper,
  },
  {
    id: "food_culture",
    label: "Food & Culture",
    description: "Local cuisine, traditions, history",
    icon: UtensilsCrossed,
  },
  {
    id: "adventure_exploration",
    label: "Adventure & Exploration",
    description: "Hiking, activities, off-the-beaten-path",
    icon: Mountain,
  },
  {
    id: "budget_friendly",
    label: "Budget Friendly",
    description: "Affordable options, backpacker style",
    icon: Wallet,
  },
  {
    id: "luxury_comfort",
    label: "Luxury & Comfort",
    description: "Premium experiences, fine dining",
    icon: Crown,
  },
];

// Travel group options (single-select)
const TRAVEL_GROUPS: {
  id: TravelGroup;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "solo", label: "Solo", description: "I travel alone", icon: User },
  { id: "friends", label: "Friends", description: "With my friends", icon: Users },
  { id: "partner", label: "Partner", description: "With my significant other", icon: Heart },
  { id: "family", label: "Family", description: "With my family", icon: UsersRound },
];

// Planning mode options (single-select)
const PLANNING_MODES: {
  id: PlanningMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "ai_planner",
    label: "AI Trip Planner",
    description: "Let AI help plan my trips",
    icon: Wand2,
  },
  {
    id: "manual_planner",
    label: "Manual Planning",
    description: "I prefer to plan everything myself",
    icon: ClipboardList,
  },
];

// New preferences interface for profile page
interface ProfilePreferences {
  travel_styles?: TravelStyle[];
  typical_group?: TravelGroup;
  planning_mode?: PlanningMode;
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const { user, loading, initialized } = useAuthStore();
  const { setProfile: setGlobalProfile, updateProfile: updateGlobalProfile } = useProfileStore();
  const toast = useToast();
  const { confirm } = useConfirm();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);

  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "settings">(
    initialTab === "settings" ? "settings" : initialTab === "preferences" ? "preferences" : "profile"
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [hasGoogleAvatar, setHasGoogleAvatar] = useState(false);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(null);

  // Preferences state (new format)
  const [preferences, setPreferences] = useState<ProfilePreferences>({});

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.push("/login");
    }
  }, [user, loading, initialized, router]);

  useEffect(() => {
    // Fetch profile when we have a user (only once per session)
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setFullName(data.profile?.full_name || "");
        setBio(data.profile?.bio || "");
        // Extract new preference fields from the preferences JSONB
        const prefs = data.profile?.preferences || {};
        setPreferences({
          travel_styles: prefs.travel_styles || [],
          typical_group: prefs.typical_group || undefined,
          planning_mode: prefs.planning_mode || undefined,
        });
        setHasGoogleAvatar(data.hasGoogleAvatar);
        setGoogleAvatarUrl(data.googleAvatarUrl);
        // Sync to global store for navbar
        if (data.profile) {
          setGlobalProfile({
            full_name: data.profile.full_name,
            avatar_url: data.profile.avatar_url,
            bio: data.profile.bio,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);

    // Optimistic update - update navbar immediately with form values
    const previousProfile = profile;
    updateGlobalProfile({ full_name: fullName, bio });

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, bio }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        if (previousProfile) {
          updateGlobalProfile({ full_name: previousProfile.full_name, bio: previousProfile.bio });
        }
        throw new Error(data.error || "Failed to update profile");
      }

      setProfile(data.profile);
      toast.success("Profile updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setError(null);

    try {
      // Use the new onboarding API to save preferences
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

      if (!response.ok) {
        throw new Error(data.error || "Failed to update preferences");
      }

      toast.success("Preferences updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    // Optimistic update - show local preview immediately
    const previousAvatarUrl = profile?.avatar_url;
    const localPreviewUrl = URL.createObjectURL(file);
    setProfile((prev) => (prev ? { ...prev, avatar_url: localPreviewUrl } : null));
    updateGlobalProfile({ avatar_url: localPreviewUrl });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setProfile((prev) => (prev ? { ...prev, avatar_url: previousAvatarUrl || null } : null));
        updateGlobalProfile({ avatar_url: previousAvatarUrl || null });
        URL.revokeObjectURL(localPreviewUrl);
        throw new Error(data.error || "Failed to upload avatar");
      }

      // Update with real URL from server
      URL.revokeObjectURL(localPreviewUrl);
      setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatar_url } : null));
      updateGlobalProfile({ avatar_url: data.avatar_url });
      toast.success("Avatar updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const confirmed = await confirm({
      title: "Remove Profile Picture",
      message: "Are you sure you want to remove your profile picture?",
      confirmLabel: "Remove",
      variant: "danger",
    });
    
    if (!confirmed) return;

    setUploading(true);
    setError(null);

    // Optimistic update - remove avatar immediately
    const previousAvatarUrl = profile?.avatar_url;
    setProfile((prev) => (prev ? { ...prev, avatar_url: null } : null));
    updateGlobalProfile({ avatar_url: null });

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setProfile((prev) => (prev ? { ...prev, avatar_url: previousAvatarUrl || null } : null));
        updateGlobalProfile({ avatar_url: previousAvatarUrl || null });
        throw new Error(data.error || "Failed to remove avatar");
      }

      toast.success("Avatar removed successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleUseGoogleAvatar = async () => {
    if (!googleAvatarUrl) return;

    setSaving(true);
    setError(null);

    // Optimistic update - use Google avatar immediately
    const previousAvatarUrl = profile?.avatar_url;
    setProfile((prev) => (prev ? { ...prev, avatar_url: googleAvatarUrl } : null));
    updateGlobalProfile({ avatar_url: googleAvatarUrl });

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: googleAvatarUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setProfile((prev) => (prev ? { ...prev, avatar_url: previousAvatarUrl || null } : null));
        updateGlobalProfile({ avatar_url: previousAvatarUrl || null });
        throw new Error(data.error || "Failed to update avatar");
      }

      toast.success("Using Google profile picture!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update avatar");
    } finally {
      setSaving(false);
    }
  };

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

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const toggleTravelStyle = (styleId: TravelStyle) => {
    const currentStyles = preferences.travel_styles || [];
    const newStyles = currentStyles.includes(styleId)
      ? currentStyles.filter((id) => id !== styleId)
      : [...currentStyles, styleId];
    setPreferences({ ...preferences, travel_styles: newStyles });
  };

  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  // Only show loading on true initial load (before first data fetch)
  // Don't show loading when returning to app - let the content remain visible
  const isInitialLoad = !initialized || (loading && !hasLoadedRef.current);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Navbar />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title Skeleton */}
          <Skeleton className="h-8 w-32 mb-6" />

          {/* Tabs Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <Skeleton className="flex-1 h-14" />
              <Skeleton className="flex-1 h-14" />
              <Skeleton className="flex-1 h-14" />
            </div>

            {/* Content Skeleton */}
            <div className="p-6">
              <div className="space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <Skeleton className="h-24 w-24 rounded-full shrink-0" />
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-10 w-32 rounded-lg" />
                      <Skeleton className="h-10 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                  <div className="flex justify-end">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect handled by useEffect, but don't render content without user
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          My Profile
        </h1>

        {/* Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="glass-card-strong rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "profile"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "preferences"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "settings"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Settings
            </button>
          </div>

          {profileLoading ? (
            <div className="p-6">
              <div className="space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <Skeleton className="h-24 w-24 rounded-full shrink-0" />
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-10 w-32 rounded-lg" />
                      <Skeleton className="h-10 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                  <div className="flex justify-end">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name || "Profile"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{getInitials()}</span>
                        )}
                      </div>
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="btn-modern flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Photo
                        </button>
                        {profile?.avatar_url && (
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={uploading}
                            className="btn-modern flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                      {hasGoogleAvatar && googleAvatarUrl && profile?.avatar_url !== googleAvatarUrl && (
                        <button
                          onClick={handleUseGoogleAvatar}
                          disabled={saving}
                          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          Use Google profile picture
                        </button>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        JPG, PNG, WebP, or GIF. Max 5MB.
                      </p>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user.email || ""}
                        disabled
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Email cannot be changed
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bio
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us a bit about yourself..."
                        rows={3}
                        className="input-modern w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 resize-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="btn-modern flex items-center gap-2 px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab - Updated to new format */}
              {activeTab === "preferences" && (
                <div className="space-y-8">
                  {/* Travel Styles (multi-select) */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      What's your travel style?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Select all that apply
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {TRAVEL_STYLES.map((style) => {
                        const Icon = style.icon;
                        const isSelected = preferences.travel_styles?.includes(style.id) || false;
                        return (
                          <button
                            key={style.id}
                            onClick={() => toggleTravelStyle(style.id)}
                            className={`card-hover p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 dark:border-blue-500 shadow-md"
                                : "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                  isSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <span className={`block text-sm font-medium ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"}`}>
                                  {style.label}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {style.description}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {preferences.travel_styles && preferences.travel_styles.length > 0 && (
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        {preferences.travel_styles.length} selected
                      </p>
                    )}
                  </div>

                  {/* Travel Group (single-select) */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Who do you travel with?
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {TRAVEL_GROUPS.map((group) => {
                        const Icon = group.icon;
                        const isSelected = preferences.typical_group === group.id;
                        return (
                          <button
                            key={group.id}
                            onClick={() => setPreferences({ ...preferences, typical_group: group.id })}
                            className={`card-hover p-4 rounded-xl border-2 transition-all text-center cursor-pointer ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 dark:border-blue-500 shadow-md"
                                : "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"}`}>
                              {group.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Planning Mode (single-select) */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      How do you like to plan?
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PLANNING_MODES.map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = preferences.planning_mode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => setPreferences({ ...preferences, planning_mode: mode.id })}
                            className={`card-hover p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 dark:border-blue-500 shadow-md"
                                : "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  isSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <span className={`block text-sm font-medium ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"}`}>
                                  {mode.label}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {mode.description}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSavePreferences}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="space-y-8">
                  {/* Password Change */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Change Password
                    </h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="input-modern w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="input-modern w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Password must be at least 8 characters long
                      </p>
                      <button
                        type="submit"
                        disabled={passwordSaving || !newPassword || !confirmPassword}
                        className="btn-modern flex items-center gap-2 px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4" />
                        {passwordSaving ? "Updating..." : "Update Password"}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
