import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { TravelStyle, TravelGroup, PlanningMode } from "@/types/onboarding";

// Valid values for validation
const VALID_TRAVEL_STYLES: TravelStyle[] = [
  "chill_relax",
  "party_nightlife",
  "food_culture",
  "adventure_exploration",
  "budget_friendly",
  "luxury_comfort",
];

const VALID_TRAVEL_GROUPS: TravelGroup[] = ["solo", "friends", "partner", "family"];

const VALID_PLANNING_MODES: PlanningMode[] = ["ai_planner", "manual_planner"];

/**
 * GET /api/onboarding
 * Returns current onboarding state + saved preferences for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    let admin;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("Admin client not configured:", error);
      return NextResponse.json(
        {
          error:
            "Server not configured: missing SUPABASE_SERVICE_ROLE_KEY. Set it in travelnest-web/.env.local and restart the server.",
        },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error } = await admin
      .from("profiles")
      .select("preferences, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching onboarding state:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract onboarding-specific fields from preferences JSONB
    const preferences = profile?.preferences ?? {};
    const onboardingPreferences = {
      travel_styles: preferences.travel_styles ?? null,
      planning_mode: preferences.planning_mode ?? null,
      typical_group: preferences.typical_group ?? null,
    };

    return NextResponse.json({
      preferences: onboardingPreferences,
      onboarding_completed: profile?.onboarding_completed ?? false,
    });
  } catch (error) {
    console.error("Unexpected error fetching onboarding state:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/onboarding
 * Create/update onboarding preferences
 * Inputs:
 *   - travel_styles (array, required): array of TravelStyle values
 *   - planning_mode (required): "ai_planner" | "manual_planner"
 *   - typical_group (optional): "solo" | "friends" | "partner" | "family"
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    let admin;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("Admin client not configured:", error);
      return NextResponse.json(
        {
          error:
            "Server not configured: missing SUPABASE_SERVICE_ROLE_KEY. Set it in travelnest-web/.env.local and restart the server.",
        },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { travel_styles, planning_mode, typical_group } = body;

    // Validate required fields
    if (!travel_styles || !Array.isArray(travel_styles) || travel_styles.length === 0) {
      return NextResponse.json(
        { error: "travel_styles is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!planning_mode) {
      return NextResponse.json(
        { error: "planning_mode is required" },
        { status: 400 }
      );
    }

    // Validate travel_styles values
    const invalidStyles = travel_styles.filter(
      (style: string) => !VALID_TRAVEL_STYLES.includes(style as TravelStyle)
    );
    if (invalidStyles.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid travel_styles: ${invalidStyles.join(", ")}. Valid values: ${VALID_TRAVEL_STYLES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate planning_mode
    if (!VALID_PLANNING_MODES.includes(planning_mode as PlanningMode)) {
      return NextResponse.json(
        {
          error: `Invalid planning_mode: ${planning_mode}. Valid values: ${VALID_PLANNING_MODES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate typical_group if provided
    if (typical_group && !VALID_TRAVEL_GROUPS.includes(typical_group as TravelGroup)) {
      return NextResponse.json(
        {
          error: `Invalid typical_group: ${typical_group}. Valid values: ${VALID_TRAVEL_GROUPS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Get existing profile to merge preferences
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();

    const existingPreferences = existingProfile?.preferences ?? {};

    // Build new preferences object (merge with existing)
    const newPreferences = {
      ...existingPreferences,
      travel_styles,
      planning_mode,
      ...(typical_group && { typical_group }),
    };

    const email = user.email?.trim().toLowerCase() || null;
    const fullName =
      typeof (user.user_metadata as Record<string, unknown> | null | undefined)?.full_name ===
      "string"
        ? ((user.user_metadata as Record<string, unknown>).full_name as string)
        : null;

    // Upsert profile with onboarding preferences
    const { data: updated, error } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email,
          full_name: fullName,
          preferences: newPreferences,
          onboarding_completed: true,
        },
        { onConflict: "id" }
      )
      .select("id, onboarding_completed, preferences")
      .single();

    if (error) {
      console.error("Error saving onboarding preferences:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      onboarding_completed: true,
      preferences: {
        travel_styles: updated.preferences.travel_styles,
        planning_mode: updated.preferences.planning_mode,
        typical_group: updated.preferences.typical_group ?? null,
      },
    });
  } catch (error) {
    console.error("Unexpected error saving onboarding preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/onboarding
 * Update preferences after onboarding (same validation as POST)
 */
export async function PUT(request: Request) {
  // Same logic as POST - both create or update
  return POST(request);
}
