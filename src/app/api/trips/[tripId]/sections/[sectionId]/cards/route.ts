import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
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
    const admin = createAdminClient();
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

    // Verify section exists and belongs to trip
    const { data: section, error: sectionError } = await supabase
      .from("trip_sections")
      .select("id, trip_id")
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
      return NextResponse.json(
        { error: sectionError.message || "Failed to verify section" },
        { status: 500 }
      );
    }

    // Check if user is a member of this trip with editor/owner role
    const { data: membership, error: membershipError } = await supabase
      .from("trip_members")
      .select("role, joined_at")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (membershipError && membershipError.code !== "PGRST116") {
      console.error("Error checking membership:", membershipError);
    }

    // Only accepted members can add cards
    if (!membership || membership.joined_at === null) {
      return NextResponse.json(
        { error: "You don't have access to this trip" },
        { status: 403 }
      );
    }

    // Only editors and owners can add cards
    if (!["owner", "editor"].includes(membership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to add cards" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, title, content, metadata } = body;

    // Validate card type (must match database CHECK constraint)
    const validTypes = [
      "text",
      "image",
      "link",
      "pdf",
      "map",
      "video",
      "checklist",
      "note",
    ];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid card type" },
        { status: 400 }
      );
    }

    // Get current max position for this section
    const { data: existingCards, error: positionError } = await supabase
      .from("trip_cards")
      .select("position")
      .eq("section_id", sectionId)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) {
      console.error("Error fetching max position:", positionError);
    }

    const nextPosition =
      existingCards && existingCards.length > 0
        ? existingCards[0].position + 1
        : 0;

    // Create card
    const { data: card, error: cardError } = await admin
      .from("trip_cards")
      .insert({
        section_id: sectionId,
        type,
        title: title?.trim() || null,
        content: content?.trim() || null,
        metadata: metadata || {},
        position: nextPosition,
        created_by: user.id,
      })
      .select()
      .single();

    if (cardError) {
      console.error("Error creating card:", cardError);
      return NextResponse.json(
        { error: cardError.message || "Failed to create card" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error("Unexpected error creating card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
