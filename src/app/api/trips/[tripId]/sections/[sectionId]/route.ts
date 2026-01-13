import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params:
      | Promise<{ tripId: string; sectionId: string }>
      | { tripId: string; sectionId: string };
  }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Handle params as Promise (Next.js 15+) or object (Next.js 14)
    const { tripId, sectionId } =
      params instanceof Promise ? await params : params;

    // Get section
    const { data: section, error: sectionError } = await supabase
      .from("trip_sections")
      .select("*")
      .eq("id", sectionId)
      .eq("trip_id", tripId)
      .single();

    if (sectionError) {
      if (sectionError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Section not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching section:", sectionError);
      return NextResponse.json(
        { error: sectionError.message || "Failed to fetch section" },
        { status: 500 }
      );
    }

    // Check if user is a member of this trip
    const { data: membership, error: membershipError } = await supabase
      .from("trip_members")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (membershipError && membershipError.code !== "PGRST116") {
      console.error("Error checking membership:", membershipError);
    }

    // Get trip to check privacy
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("privacy")
      .eq("id", tripId)
      .single();

    if (tripError) {
      console.error("Error fetching trip:", tripError);
      return NextResponse.json(
        { error: "Failed to verify trip access" },
        { status: 500 }
      );
    }

    // If user is not a member and trip is private, deny access
    if (!membership && trip.privacy === "private") {
      return NextResponse.json(
        { error: "You don't have access to this trip" },
        { status: 403 }
      );
    }

    // Get cards for this section
    const { data: cards, error: cardsError } = await supabase
      .from("trip_cards")
      .select("*")
      .eq("section_id", sectionId)
      .order("position", { ascending: true });

    if (cardsError) {
      console.error("Error fetching cards:", cardsError);
    }

    // Get trip info for navigation
    const { data: tripInfo, error: tripInfoError } = await supabase
      .from("trips")
      .select("id, title, slug")
      .eq("id", tripId)
      .single();

    if (tripInfoError) {
      console.error("Error fetching trip info:", tripInfoError);
    }

    return NextResponse.json({
      section: {
        id: section.id,
        trip_id: section.trip_id,
        type: section.type,
        title: section.title,
        position: section.position,
        metadata: section.metadata,
        created_at: section.created_at,
        updated_at: section.updated_at,
      },
      cards: cards || [],
      trip: tripInfo || null,
      userRole: membership?.role || null,
    });
  } catch (error) {
    console.error("Unexpected error fetching section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
