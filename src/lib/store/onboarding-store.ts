import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OnboardingState, OnboardingPreferences } from "@/types/onboarding";

interface OnboardingStore extends OnboardingState {
  setStep: (step: number) => void;
  setPreference: <K extends keyof OnboardingPreferences>(
    key: K,
    value: OnboardingPreferences[K]
  ) => void;
  reset: () => void;
  isComplete: () => boolean;
}

const initialState: OnboardingState = {
  currentStep: 0,
  preferences: {},
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setStep: (step) => set({ currentStep: step }),
      setPreference: (key, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        })),
      reset: () => set(initialState),
      isComplete: () => {
        const prefs = get().preferences;
        return (
          !!prefs.travelGroup &&
          !!prefs.vibe &&
          !!prefs.budgetLevel &&
          !!prefs.interests &&
          prefs.interests.length > 0
        );
      },
    }),
    {
      name: "onboarding-storage",
    }
  )
);
