import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OnboardingState, OnboardingPreferences } from "@/types/onboarding";

interface OnboardingStore extends OnboardingState {
  setStep: (step: number) => void;
  setPreference: <K extends keyof OnboardingPreferences>(
    key: K,
    value: OnboardingPreferences[K]
  ) => void;
  toggleTravelStyle: (style: OnboardingPreferences["travelStyles"][number]) => void;
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
      toggleTravelStyle: (style) =>
        set((state) => {
          const currentStyles = state.preferences.travelStyles || [];
          const newStyles = currentStyles.includes(style)
            ? currentStyles.filter((s) => s !== style)
            : [...currentStyles, style];
          return {
            preferences: {
              ...state.preferences,
              travelStyles: newStyles,
            },
          };
        }),
      reset: () => set(initialState),
      isComplete: () => {
        const prefs = get().preferences;
        return (
          // Step 1: Travel styles (required, at least one)
          !!prefs.travelStyles &&
          prefs.travelStyles.length > 0 &&
          // Step 2: Typical group (optional but we require it for better UX)
          !!prefs.typicalGroup &&
          // Step 3: Planning mode (required)
          !!prefs.planningMode
        );
      },
    }),
    {
      name: "onboarding-storage",
    }
  )
);
