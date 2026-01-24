import type { OnboardingPreferences } from "./onboarding";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferences: OnboardingPreferences | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  preferences?: Partial<OnboardingPreferences>;
}

export interface UserProfileData {
  profile: Profile | null;
  email: string;
  hasGoogleAvatar: boolean;
  googleAvatarUrl: string | null;
}
