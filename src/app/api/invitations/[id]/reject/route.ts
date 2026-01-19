import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
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
    const { id } = params instanceof Promise ? await params : params;

    // Get inbox item to find trip_id
    const { data: notification, error: notificationError } = await supabase
      .from("user_inbox")
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
        { error: "Not authorized to reject this invitation" },
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

    // Check if member exists first
    const { data: existingMember, error: checkError } = await supabase
      .from("trip_members")
      .select("id, joined_at")
      .eq("trip_id", notification.trip_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking member:", checkError);
    }

    // Remove from trip_members (only if joined_at is null - pending invitation)
    if (existingMember) {
      if (existingMember.joined_at) {
        // Member already accepted - can't remove, but update notification status
        console.log("⚠️ Member already accepted invitation, cannot remove from trip");
      } else {
        // Member is pending - delete them
        const { data: deletedMembers, error: deleteError } = await admin
          .from("trip_members")
          .delete()
          .eq("trip_id", notification.trip_id)
          .eq("user_id", user.id)
          .is("joined_at", null) // Only delete if not already accepted
          .select();

        if (deleteError) {
          console.error("❌ Error rejecting invitation (deleting member):", deleteError);
          // Continue anyway - update notification status
        } else if (deletedMembers && deletedMembers.length > 0) {
          console.log("✅ Member removed from trip after rejection:", {
            memberId: deletedMembers[0].id,
            tripId: notification.trip_id,
            userId: user.id,
          });
        } else {
          console.log("⚠️ No member was deleted (may have been removed already or RLS blocked)");
        }
      }
    } else {
      // Member doesn't exist - might have been removed already
      console.log("ℹ️ Member not found in trip_members (may have been removed already)");
    }

    // Update notification status to rejected instead of deleting (keep history)
    await supabase
      .from("user_inbox")
      .update({ 
        status: "rejected",
        read: true,
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      message: "Invitation rejected successfully",
    });
  } catch (error) {
    console.error("Unexpected error rejecting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
