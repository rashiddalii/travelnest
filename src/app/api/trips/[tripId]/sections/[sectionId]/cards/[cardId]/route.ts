import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params:
      | Promise<{ tripId: string; sectionId: string; cardId: string }>
      | { tripId: string; sectionId: string; cardId: string };
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
    const { tripId, sectionId, cardId } =
      params instanceof Promise ? await params : params;

    // Get card to verify it exists and belongs to section
    const { data: card, error: cardError } = await supabase
      .from("trip_cards")
      .select("id, section_id, trip_sections!inner(trip_id)")
      .eq("id", cardId)
      .single();

    if (cardError) {
      if (cardError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Card not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: cardError.message || "Failed to verify card" },
        { status: 500 }
      );
    }

    // Verify section belongs to trip
    const section = card.trip_sections as any;
    if (section.trip_id !== tripId || card.section_id !== sectionId) {
      return NextResponse.json(
        { error: "Card not found in this section" },
        { status: 404 }
      );
    }

    // Check if user is a member of this trip with editor/owner role
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
      .select("privacy, owner_id")
      .eq("id", tripId)
      .single();

    if (tripError) {
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

    // Only editors and owners can edit cards
    if (membership && !["owner", "editor"].includes(membership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to edit cards" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, title, content, metadata } = body;

    // Validate card type
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
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid card type" },
        { status: 400 }
      );
    }

    // Update card
    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title?.trim() || null;
    if (content !== undefined) updateData.content = content?.trim() || null;
    if (metadata !== undefined) updateData.metadata = metadata || {};

    const { data: updatedCard, error: updateError } = await supabase
      .from("trip_cards")
      .update(updateData)
      .eq("id", cardId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating card:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update card" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      card: updatedCard,
    });
  } catch (error) {
    console.error("Unexpected error updating card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params:
      | Promise<{ tripId: string; sectionId: string; cardId: string }>
      | { tripId: string; sectionId: string; cardId: string };
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
    const { tripId, sectionId, cardId } =
      params instanceof Promise ? await params : params;

    // Get card to verify it exists and belongs to section
    const { data: card, error: cardError } = await supabase
      .from("trip_cards")
      .select("id, section_id, trip_sections!inner(trip_id)")
      .eq("id", cardId)
      .single();

    if (cardError) {
      if (cardError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Card not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: cardError.message || "Failed to verify card" },
        { status: 500 }
      );
    }

    // Verify section belongs to trip
    const section = card.trip_sections as any;
    if (section.trip_id !== tripId || card.section_id !== sectionId) {
      return NextResponse.json(
        { error: "Card not found in this section" },
        { status: 404 }
      );
    }

    // Check if user is a member of this trip with editor/owner role
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

    // Only editors and owners can delete cards
    if (membership && !["owner", "editor"].includes(membership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to delete cards" },
        { status: 403 }
      );
    }

    // Delete card
    const { error: deleteError } = await supabase
      .from("trip_cards")
      .delete()
      .eq("id", cardId);

    if (deleteError) {
      console.error("Error deleting card:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete card" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error deleting card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
