export type TravelGroup = "solo" | "friends" | "family" | "couple";
export type TravelVibe = "backpacker" | "balanced" | "luxury";
export type BudgetLevel = "low" | "medium" | "high";

export interface OnboardingPreferences {
  travelGroup: TravelGroup;
  vibe: TravelVibe;
  budgetLevel: BudgetLevel;
  interests: string[];
  defaultCurrency: string;
}

export interface OnboardingState {
  currentStep: number;
  preferences: Partial<OnboardingPreferences>;
}
