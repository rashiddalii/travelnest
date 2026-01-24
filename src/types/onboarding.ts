// Travel styles - multi-select options (combines interests + budget + vibe)
export type TravelStyle =
  | "chill_relax"
  | "party_nightlife"
  | "food_culture"
  | "adventure_exploration"
  | "budget_friendly"
  | "luxury_comfort";

// Travel group - single select
export type TravelGroup = "solo" | "friends" | "partner" | "family";

// Planning mode - single select
export type PlanningMode = "ai_planner" | "manual_planner";

export interface OnboardingPreferences {
  travelStyles: TravelStyle[];
  typicalGroup: TravelGroup;
  planningMode: PlanningMode;
}

export interface OnboardingState {
  currentStep: number;
  preferences: Partial<OnboardingPreferences>;
}

// API request/response types
export interface OnboardingSubmitRequest {
  travel_styles: TravelStyle[];
  planning_mode: PlanningMode;
  typical_group?: TravelGroup;
}

export interface OnboardingResponse {
  preferences: OnboardingPreferences | null;
  onboarding_completed: boolean;
}

// Labels for UI display
export const TRAVEL_STYLE_LABELS: Record<TravelStyle, { label: string; description: string }> = {
  chill_relax: {
    label: "Chill & Relax",
    description: "Laid-back vibes, beaches, spas",
  },
  party_nightlife: {
    label: "Party & Nightlife",
    description: "Clubs, bars, social scenes",
  },
  food_culture: {
    label: "Food & Culture",
    description: "Local cuisine, traditions, history",
  },
  adventure_exploration: {
    label: "Adventure & Exploration",
    description: "Hiking, activities, off-the-beaten-path",
  },
  budget_friendly: {
    label: "Budget Friendly",
    description: "Affordable options, backpacker style",
  },
  luxury_comfort: {
    label: "Luxury & Comfort",
    description: "Premium experiences, fine dining",
  },
};

export const TRAVEL_GROUP_LABELS: Record<TravelGroup, { label: string; description: string }> = {
  solo: {
    label: "Solo",
    description: "I travel alone",
  },
  friends: {
    label: "Friends",
    description: "With my friends",
  },
  partner: {
    label: "Partner",
    description: "With my significant other",
  },
  family: {
    label: "Family",
    description: "With my family",
  },
};

export const PLANNING_MODE_LABELS: Record<PlanningMode, { label: string; description: string }> = {
  ai_planner: {
    label: "AI Trip Planner",
    description: "Let AI help plan my trips",
  },
  manual_planner: {
    label: "Manual Planning",
    description: "I prefer to plan everything myself",
  },
};
