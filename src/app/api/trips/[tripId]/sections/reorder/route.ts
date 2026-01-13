import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ tripId: string }> | { tripId: string };
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
    const { tripId } = params instanceof Promise ? await params : params;

    const body = await request.json();
    const { sectionOrders } = body; // Array of { id: string, position: number }

    if (!Array.isArray(sectionOrders)) {
      return NextResponse.json(
        { error: "sectionOrders must be an array" },
        { status: 400 }
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

    // Only editors and owners can reorder sections
    if (membership && !["owner", "editor"].includes(membership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to reorder sections" },
        { status: 403 }
      );
    }

    // Update all section positions in a transaction
    const updates = sectionOrders.map(({ id, position }: { id: string; position: number }) =>
      supabase
        .from("trip_sections")
        .update({ position })
        .eq("id", id)
        .eq("trip_id", tripId)
    );

    const results = await Promise.all(updates);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error("Error updating section positions:", errors);
      return NextResponse.json(
        { error: "Failed to update some section positions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error reordering sections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
