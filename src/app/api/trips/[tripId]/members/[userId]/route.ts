import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params:
      | Promise<{ tripId: string; userId: string }>
      | { tripId: string; userId: string };
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
    const { tripId, userId } =
      params instanceof Promise ? await params : params;

    // Get trip to check ownership
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("owner_id")
      .eq("id", tripId)
      .single();

    if (tripError) {
      if (tripError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Trip not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: tripError.message || "Failed to fetch trip" },
        { status: 500 }
      );
    }

    // Only owner can remove members
    if (trip.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only the trip owner can remove members" },
        { status: 403 }
      );
    }

    // Prevent removing the owner
    if (userId === trip.owner_id) {
      return NextResponse.json(
        { error: "Cannot remove the trip owner" },
        { status: 400 }
      );
    }

    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .single();

    if (memberError) {
      if (memberError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: memberError.message || "Failed to fetch member" },
        { status: 500 }
      );
    }

    // Get member details before deletion to check if they had pending invitation
    const { data: memberDetails } = await supabase
      .from("trip_members")
      .select("joined_at")
      .eq("id", member.id)
      .single();

    // Delete member
    const { data: deletedMember, error: deleteError } = await supabase
      .from("trip_members")
      .delete()
      .eq("id", member.id)
      .select()
      .single();

    if (deleteError) {
      console.error("Error removing member:", deleteError);
      console.error("Delete error details:", {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
      });
      return NextResponse.json(
        { error: deleteError.message || "Failed to remove member. You may not have permission." },
        { status: 500 }
      );
    }

    // Verify deletion was successful
    if (!deletedMember) {
      console.error("Member deletion returned no data");
      return NextResponse.json(
        { error: "Member deletion may have failed. Please check if the member still exists." },
        { status: 500 }
      );
    }

    // If member had pending invitation (joined_at is null), mark notifications as expired/revoked
    if (memberDetails && !memberDetails.joined_at) {
      // Mark related notifications as revoked
      await supabase
        .from("notifications")
        .update({ 
          status: "revoked",
          read: true, // Also mark as read
        })
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .eq("type", "trip_invite")
        .in("status", ["pending"]); // Only update pending invitations

      // Get user's email from notifications to mark tokens as used
      const { data: notifications } = await supabase
        .from("notifications")
        .select("metadata")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .eq("type", "trip_invite")
        .limit(1)
        .maybeSingle();

      // Try to get email from invitation token
      const { data: tokens } = await supabase
        .from("invitation_tokens")
        .select("email")
        .eq("trip_id", tripId)
        .is("used_at", null)
        .limit(1);

      // Mark invitation tokens as used (expired)
      if (tokens && tokens.length > 0) {
        // Get the user's email - we'll need to query auth.users or get it from a notification
        // For now, we'll mark tokens by trip_id and check user_id when they try to use it
        // The token will be invalidated when they try to accept
      }
    }

    return NextResponse.json({ 
      success: true,
      deletedMember 
    });
  } catch (error) {
    console.error("Unexpected error removing member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
