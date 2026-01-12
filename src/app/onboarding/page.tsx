"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { OptionCard } from "@/components/onboarding/option-card";
import {
  User,
  Users,
  UsersRound,
  Heart,
  Backpack,
  Sparkles,
  Crown,
  DollarSign,
  TrendingUp,
  Wallet,
  Camera,
  UtensilsCrossed,
  Mountain,
  Building2,
  Music,
  MapPin,
  Plane,
} from "lucide-react";
import type { TravelGroup, TravelVibe, BudgetLevel } from "@/types/onboarding";

const INTERESTS = [
  { id: "food", label: "Food & Dining", icon: UtensilsCrossed },
  { id: "adventure", label: "Adventure", icon: Mountain },
  { id: "history", label: "History & Culture", icon: Building2 },
  { id: "beaches", label: "Beaches", icon: MapPin },
  { id: "nightlife", label: "Nightlife", icon: Music },
  { id: "photography", label: "Photography", icon: Camera },
  { id: "shopping", label: "Shopping", icon: Wallet },
  { id: "nature", label: "Nature & Wildlife", icon: Mountain },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const {
    currentStep,
    preferences,
    setStep,
    setPreference,
    isComplete,
    reset,
  } = useOnboardingStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
      }
    });
  }, [router, supabase]);

  const handleNext = () => {
    if (currentStep < 3) {
      setError(null); // Clear any previous errors
      setStep(currentStep + 1);
    } else if (isComplete()) {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!isComplete()) {
      console.error("Onboarding not complete:", preferences);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...preferences,
          defaultCurrency: "PKR", // Default currency
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

      // Clear onboarding store
      reset();

      // Redirect to dashboard
      router.push("/dashboard");
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
        return !!preferences.travelGroup;
      case 1:
        return !!preferences.vibe;
      case 2:
        return !!preferences.budgetLevel;
      case 3:
        return (
          preferences.interests && preferences.interests.length > 0
        );
      default:
        return false;
    }
  };

  const toggleInterest = (interestId: string) => {
    const currentInterests = preferences.interests || [];
    const newInterests = currentInterests.includes(interestId)
      ? currentInterests.filter((id) => id !== interestId)
      : [...currentInterests, interestId];
    setPreference("interests", newInterests);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep + 1} of 4
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(((currentStep + 1) / 4) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 4) * 100}%` }}
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
          {currentStep === 0 && (
            <OnboardingScreen
              title="Who do you travel with?"
              description="Help us personalize your experience"
              icon={
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
              }
            >
              <div className="space-y-3">
                <OptionCard
                  title="Solo"
                  description="I travel alone"
                  icon={<User className="w-5 h-5" />}
                  selected={preferences.travelGroup === "solo"}
                  onClick={() => setPreference("travelGroup", "solo")}
                />
                <OptionCard
                  title="Friends"
                  description="With my friends"
                  icon={<Users className="w-5 h-5" />}
                  selected={preferences.travelGroup === "friends"}
                  onClick={() => setPreference("travelGroup", "friends")}
                />
                <OptionCard
                  title="Couple"
                  description="With my partner"
                  icon={<Heart className="w-5 h-5" />}
                  selected={preferences.travelGroup === "couple"}
                  onClick={() => setPreference("travelGroup", "couple")}
                />
                <OptionCard
                  title="Family"
                  description="With my family"
                  icon={<UsersRound className="w-5 h-5" />}
                  selected={preferences.travelGroup === "family"}
                  onClick={() => setPreference("travelGroup", "family")}
                />
              </div>
            </OnboardingScreen>
          )}

          {currentStep === 1 && (
            <OnboardingScreen
              title="What's your travel style?"
              description="Choose the vibe that matches you"
              icon={
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              }
            >
              <div className="space-y-3">
                <OptionCard
                  title="Backpacker"
                  description="Budget-friendly, authentic experiences"
                  icon={<Backpack className="w-5 h-5" />}
                  selected={preferences.vibe === "backpacker"}
                  onClick={() => setPreference("vibe", "backpacker")}
                />
                <OptionCard
                  title="Balanced"
                  description="Mix of comfort and adventure"
                  icon={<TrendingUp className="w-5 h-5" />}
                  selected={preferences.vibe === "balanced"}
                  onClick={() => setPreference("vibe", "balanced")}
                />
                <OptionCard
                  title="Luxury"
                  description="Premium experiences and comfort"
                  icon={<Crown className="w-5 h-5" />}
                  selected={preferences.vibe === "luxury"}
                  onClick={() => setPreference("vibe", "luxury")}
                />
              </div>
            </OnboardingScreen>
          )}

          {currentStep === 2 && (
            <OnboardingScreen
              title="What's your budget range?"
              description="We'll tailor recommendations to your budget"
              icon={
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
              }
            >
              <div className="space-y-3">
                <OptionCard
                  title="Low Budget"
                  description="Affordable options"
                  icon={<DollarSign className="w-5 h-5" />}
                  selected={preferences.budgetLevel === "low"}
                  onClick={() => setPreference("budgetLevel", "low")}
                />
                <OptionCard
                  title="Medium Budget"
                  description="Moderate spending"
                  icon={<TrendingUp className="w-5 h-5" />}
                  selected={preferences.budgetLevel === "medium"}
                  onClick={() => setPreference("budgetLevel", "medium")}
                />
                <OptionCard
                  title="High Budget"
                  description="Premium experiences"
                  icon={<Crown className="w-5 h-5" />}
                  selected={preferences.budgetLevel === "high"}
                  onClick={() => setPreference("budgetLevel", "high")}
                />
              </div>
            </OnboardingScreen>
          )}

          {currentStep === 3 && (
            <OnboardingScreen
              title="What interests you?"
              description="Select all that apply (we'll use this for AI recommendations)"
              icon={
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Plane className="w-8 h-8 text-white" />
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-3">
                {INTERESTS.map((interest) => {
                  const Icon = interest.icon;
                  const isSelected =
                    preferences.interests?.includes(interest.id) || false;
                  return (
                    <button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            isSelected
                              ? "text-blue-900 dark:text-blue-100"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {interest.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {preferences.interests && preferences.interests.length > 0 && (
                <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
                  {preferences.interests.length} selected
                </p>
              )}
            </OnboardingScreen>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-6 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (currentStep === 3) {
                handleComplete();
              } else {
                handleNext();
              }
            }}
            disabled={!canProceed() || saving}
            className="px-6 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            {saving
              ? "Saving..."
              : currentStep === 3
              ? "Complete"
              : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
