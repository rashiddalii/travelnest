"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { OptionCard } from "@/components/onboarding/option-card";
import {
  User,
  Users,
  UsersRound,
  Heart,
  Sparkles,
  Palmtree,
  PartyPopper,
  UtensilsCrossed,
  Mountain,
  Wallet,
  Crown,
  Wand2,
  ClipboardList,
} from "lucide-react";
import type {
  TravelStyle,
  TravelGroup,
  PlanningMode,
  TRAVEL_STYLE_LABELS,
  TRAVEL_GROUP_LABELS,
  PLANNING_MODE_LABELS,
} from "@/types/onboarding";

// Travel style options with icons
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

// Travel group options
const TRAVEL_GROUPS: {
  id: TravelGroup;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "solo",
    label: "Solo",
    description: "I travel alone",
    icon: User,
  },
  {
    id: "friends",
    label: "Friends",
    description: "With my friends",
    icon: Users,
  },
  {
    id: "partner",
    label: "Partner",
    description: "With my significant other",
    icon: Heart,
  },
  {
    id: "family",
    label: "Family",
    description: "With my family",
    icon: UsersRound,
  },
];

// Planning mode options
const PLANNING_MODES: {
  id: PlanningMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "ai_planner",
    label: "AI Trip Planner",
    description: "Let AI help plan my trips with smart suggestions",
    icon: Wand2,
  },
  {
    id: "manual_planner",
    label: "Manual Planning",
    description: "I prefer to plan everything myself",
    icon: ClipboardList,
  },
];

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const supabase = createClient();
  const {
    currentStep,
    preferences,
    setStep,
    setPreference,
    toggleTravelStyle,
    isComplete,
    reset,
  } = useOnboardingStore();

  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated and if onboarding is already completed
  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if onboarding is already completed
      try {
        const response = await fetch("/api/onboarding");
        if (response.ok) {
          const data = await response.json();
          if (data.onboarding_completed) {
            // User already completed onboarding, redirect to dashboard
            if (inviteToken) {
              router.push(`/invitations?token=${inviteToken}`);
            } else {
              router.push("/dashboard");
            }
            return;
          }
        }
      } catch (err) {
        console.error("Error checking onboarding status:", err);
      }
      
      setCheckingStatus(false);
    };

    checkAuthAndOnboarding();
  }, [router, supabase, inviteToken]);

  const scrollToTop = () => {
    // Use setTimeout to ensure scroll happens after React re-renders
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setError(null);
      setStep(currentStep + 1);
      scrollToTop();
    } else if (isComplete()) {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setStep(currentStep - 1);
      scrollToTop();
    }
  };

  const handleComplete = async () => {
    if (!isComplete()) {
      console.error("Onboarding not complete:", preferences);
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          travel_styles: preferences.travelStyles,
          planning_mode: preferences.planningMode,
          typical_group: preferences.typicalGroup,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save preferences");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error("Failed to save preferences");
      }

      // Show redirecting state before navigation
      setRedirecting(true);

      // Redirect based on invite token
      if (inviteToken) {
        router.push(`/invitations?token=${inviteToken}`);
      } else {
        router.push("/dashboard");
      }
      
      // Reset store after navigation starts (won't cause flash since we're showing redirecting state)
      reset();
      router.refresh();
    } catch (error) {
      console.error("Error saving preferences:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save preferences. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        // Travel styles - at least one required
        return preferences.travelStyles && preferences.travelStyles.length > 0;
      case 1:
        // Travel group - required
        return !!preferences.typicalGroup;
      case 2:
        // Planning mode - required
        return !!preferences.planningMode;
      default:
        return false;
    }
  };

  const totalSteps = 3;

  // Show loading while checking auth and onboarding status
  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirecting screen after successful onboarding
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Setting up your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(((currentStep + 1) / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-linear-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Screen Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl min-h-[500px] overflow-hidden">
          {/* Step 1: Travel Styles (multi-select) */}
          {currentStep === 0 && (
            <OnboardingScreen
              title="What's your travel style?"
              description="Select all that apply - we'll personalize your experience"
              icon={
                <div className="w-16 h-16 bg-linear-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TRAVEL_STYLES.map((style) => {
                  const Icon = style.icon;
                  const isSelected =
                    preferences.travelStyles?.includes(style.id) || false;
                  return (
                    <button
                      key={style.id}
                      onClick={() => toggleTravelStyle(style.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
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
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-semibold text-sm ${
                              isSelected
                                ? "text-blue-900 dark:text-blue-100"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {style.label}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {style.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {preferences.travelStyles && preferences.travelStyles.length > 0 && (
                <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
                  {preferences.travelStyles.length} selected
                </p>
              )}
            </OnboardingScreen>
          )}

          {/* Step 2: Travel Group (single-select) */}
          {currentStep === 1 && (
            <OnboardingScreen
              title="Who do you travel with?"
              description="Help us personalize your experience"
              icon={
                <div className="w-16 h-16 bg-linear-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
              }
            >
              <div className="space-y-3">
                {TRAVEL_GROUPS.map((group) => {
                  const Icon = group.icon;
                  return (
                    <OptionCard
                      key={group.id}
                      title={group.label}
                      description={group.description}
                      icon={<Icon className="w-5 h-5" />}
                      selected={preferences.typicalGroup === group.id}
                      onClick={() => setPreference("typicalGroup", group.id)}
                    />
                  );
                })}
              </div>
            </OnboardingScreen>
          )}

          {/* Step 3: Planning Mode (single-select) */}
          {currentStep === 2 && (
            <OnboardingScreen
              title="How do you like to plan?"
              description="Choose your preferred planning style"
              icon={
                <div className="w-16 h-16 bg-linear-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-white" />
                </div>
              }
            >
              <div className="space-y-3">
                {PLANNING_MODES.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <OptionCard
                      key={mode.id}
                      title={mode.label}
                      description={mode.description}
                      icon={<Icon className="w-5 h-5" />}
                      selected={preferences.planningMode === mode.id}
                      onClick={() => setPreference("planningMode", mode.id)}
                    />
                  );
                })}
              </div>
            </OnboardingScreen>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-6 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (currentStep === 2) {
                handleComplete();
              } else {
                handleNext();
              }
            }}
            disabled={!canProceed() || saving}
            className="px-6 py-3 rounded-lg font-medium text-white bg-linear-to-r from-blue-600 to-purple-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            {saving
              ? "Saving..."
              : currentStep === 2
              ? "Complete"
              : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
