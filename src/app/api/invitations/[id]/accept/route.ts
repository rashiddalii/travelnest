import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
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
    const { id } = params instanceof Promise ? await params : params;

    // Get notification to find trip_id
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .select("id, user_id, trip_id, type")
      .eq("id", id)
      .single();

    if (notificationError) {
      if (notificationError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: notificationError.message || "Failed to fetch invitation" },
        { status: 500 }
      );
    }

    // Verify notification belongs to user
    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to accept this invitation" },
        { status: 403 }
      );
    }

    // Verify it's a trip invitation
    if (notification.type !== "trip_invite" || !notification.trip_id) {
      return NextResponse.json(
        { error: "Invalid invitation type" },
        { status: 400 }
      );
    }

    // First check if membership exists
    const { data: existingMembership, error: checkError } = await supabase
      .from("trip_members")
      .select("id, joined_at")
      .eq("trip_id", notification.trip_id)
      .eq("user_id", user.id)
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Membership not found. The invitation may have been revoked." },
          { status: 404 }
        );
      }
      console.error("Error checking membership:", checkError);
      return NextResponse.json(
        { error: checkError.message || "Failed to check membership" },
        { status: 500 }
      );
    }

    // If already accepted, just return success
    if (existingMembership?.joined_at) {
      // Mark notification as read anyway
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      return NextResponse.json({
        success: true,
        message: "Invitation already accepted",
        trip_id: notification.trip_id,
      });
    }

    // Update trip_members to set joined_at
    const { data: membership, error: updateError } = await supabase
      .from("trip_members")
      .update({ joined_at: new Date().toISOString() })
      .eq("trip_id", notification.trip_id)
      .eq("user_id", user.id)
      .is("joined_at", null) // Only update if not already set
      .select();

    if (updateError) {
      console.error("Error accepting invitation:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to accept invitation" },
        { status: 500 }
      );
    }

    // Check if update was successful (should return at least one row)
    if (!membership || membership.length === 0) {
      // Membership might have been deleted or already accepted
      // Check again to see current state
      const { data: currentMembership } = await supabase
        .from("trip_members")
        .select("joined_at")
        .eq("trip_id", notification.trip_id)
        .eq("user_id", user.id)
        .single();

      if (!currentMembership) {
        return NextResponse.json(
          { error: "Membership not found. The invitation may have been revoked." },
          { status: 404 }
        );
      }

      if (currentMembership.joined_at) {
        // Already accepted, just mark notification as read
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", id);

        return NextResponse.json({
          success: true,
          message: "Invitation already accepted",
          trip_id: notification.trip_id,
        });
      }

      return NextResponse.json(
        { error: "Failed to update membership. Please try again." },
        { status: 500 }
      );
    }

    // Mark notification as read and update status to accepted
    await supabase
      .from("notifications")
      .update({ 
        read: true,
        status: "accepted",
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      trip_id: notification.trip_id,
    });
  } catch (error) {
    console.error("Unexpected error accepting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
