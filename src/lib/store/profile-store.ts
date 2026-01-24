import { create } from "zustand";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface ProfileStore {
  profile: ProfileData | null;
  setProfile: (profile: ProfileData | null) => void;
  updateProfile: (updates: Partial<ProfileData>) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    })),
  reset: () => set({ profile: null }),
}));
