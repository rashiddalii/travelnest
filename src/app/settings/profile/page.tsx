"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useProfileStore } from "@/lib/store/profile-store";
import { useToast } from "@/lib/store/toast-store";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Save,
  Upload,
  Trash2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import type { Profile } from "@/types/profile";
import { Skeleton } from "@/components/ui/skeleton";

function ProfileEditContent() {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();
  const { setProfile: setGlobalProfile, updateProfile: updateGlobalProfile } = useProfileStore();
  const toast = useToast();
  const { confirm } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [hasGoogleAvatar, setHasGoogleAvatar] = useState(false);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.push("/login");
    }
  }, [user, loading, initialized, router]);

  useEffect(() => {
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
        setHasGoogleAvatar(data.hasGoogleAvatar);
        setGoogleAvatarUrl(data.googleAvatarUrl);
        if (data.profile) {
          setGlobalProfile({
            full_name: data.profile.full_name,
            avatar_url: data.profile.avatar_url,
            bio: data.profile.bio,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
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
        if (previousProfile) updateGlobalProfile({ full_name: previousProfile.full_name, bio: previousProfile.bio });
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const previousAvatarUrl = profile?.avatar_url;
    const localPreviewUrl = URL.createObjectURL(file);
    setProfile((prev) => (prev ? { ...prev, avatar_url: localPreviewUrl } : null));
    updateGlobalProfile({ avatar_url: localPreviewUrl });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: previousAvatarUrl || null } : null));
        updateGlobalProfile({ avatar_url: previousAvatarUrl || null });
        URL.revokeObjectURL(localPreviewUrl);
        throw new Error(data.error || "Failed to upload avatar");
      }
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
    const previousAvatarUrl = profile?.avatar_url;
    setProfile((prev) => (prev ? { ...prev, avatar_url: null } : null));
    updateGlobalProfile({ avatar_url: null });
    try {
      const response = await fetch("/api/profile/avatar", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
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

  const getInitials = () => {
    if (fullName) return fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const isInitialLoad = !initialized || (loading && !hasLoadedRef.current);
  if (isInitialLoad) {
    return (
      <div className="max-w-2xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="glass-card-strong rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full shrink-0" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
          </div>
          <div className="space-y-4 mt-8">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl ml-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit profile</h1>
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <div className="glass-card-strong rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || "Profile"} className="w-full h-full object-cover" />
              ) : (
                <span>{getInitials()}</span>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-modern flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Upload Photo
            </button>
            {profile?.avatar_url && (
              <button
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="btn-modern flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            )}
            {hasGoogleAvatar && googleAvatarUrl && profile?.avatar_url !== googleAvatarUrl && (
              <button onClick={handleUseGoogleAvatar} disabled={saving} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                <Sparkles className="w-4 h-4" />
                Use Google profile picture
              </button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG, WebP, or GIF. Max 5MB.</p>
          </div>
        </div>
        <div className="space-y-4 mt-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="input-modern w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
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
              className="btn-modern flex items-center gap-2 px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <ProfileEditContent />
    </Suspense>
  );
}
