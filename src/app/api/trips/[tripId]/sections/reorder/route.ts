import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
      .select("role, joined_at")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (membershipError && membershipError.code !== "PGRST116") {
      console.error("Error checking membership:", membershipError);
    }

    // Only accepted members can reorder sections
    if (!membership || membership.joined_at === null) {
      return NextResponse.json(
        { error: "You don't have access to this trip" },
        { status: 403 }
      );
    }

    // Only editors and owners can reorder sections
    if (!["owner", "editor"].includes(membership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to reorder sections" },
        { status: 403 }
      );
    }

    // Update all section positions in a transaction
    const updates = sectionOrders.map(({ id, position }: { id: string; position: number }) =>
      admin
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
