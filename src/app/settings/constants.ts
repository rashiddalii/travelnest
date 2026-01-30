import type { TravelStyle, TravelGroup, PlanningMode } from "@/types/onboarding";
import {
  User,
  Users,
  UsersRound,
  Heart,
  Palmtree,
  PartyPopper,
  UtensilsCrossed,
  Mountain,
  Wallet,
  Crown,
  Wand2,
  ClipboardList,
} from "lucide-react";

export type { TravelStyle, TravelGroup, PlanningMode };

export interface ProfilePreferences {
  travel_styles?: TravelStyle[];
  typical_group?: TravelGroup;
  planning_mode?: PlanningMode;
}

export const TRAVEL_STYLES: {
  id: TravelStyle;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "chill_relax", label: "Chill & Relax", description: "Laid-back vibes, beaches, spas", icon: Palmtree },
  { id: "party_nightlife", label: "Party & Nightlife", description: "Clubs, bars, social scenes", icon: PartyPopper },
  { id: "food_culture", label: "Food & Culture", description: "Local cuisine, traditions, history", icon: UtensilsCrossed },
  { id: "adventure_exploration", label: "Adventure & Exploration", description: "Hiking, activities, off-the-beaten-path", icon: Mountain },
  { id: "budget_friendly", label: "Budget Friendly", description: "Affordable options, backpacker style", icon: Wallet },
  { id: "luxury_comfort", label: "Luxury & Comfort", description: "Premium experiences, fine dining", icon: Crown },
];

export const TRAVEL_GROUPS: {
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

export const PLANNING_MODES: {
  id: PlanningMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "ai_planner", label: "AI Trip Planner", description: "Let AI help plan my trips", icon: Wand2 },
  { id: "manual_planner", label: "Manual Planning", description: "I prefer to plan everything myself", icon: ClipboardList },
];

export type ProfileSection = "profile" | "preferences" | "security" | "privacy" | "notifications" | "account";

export const PROFILE_SIDEBAR_ITEMS: { id: ProfileSection; label: string; href: string }[] = [
  { id: "profile", label: "Profile", href: "/settings/profile" },
  { id: "preferences", label: "Preferences", href: "/settings/preferences" },
  { id: "security", label: "Security", href: "/settings/security" },
  { id: "privacy", label: "Privacy", href: "/settings/privacy" },
  { id: "notifications", label: "Notifications", href: "/settings/notifications" },
  { id: "account", label: "Account", href: "/settings/account" },
];
