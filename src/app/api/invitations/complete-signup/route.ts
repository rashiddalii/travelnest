import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * This endpoint is called after a new user signs up with an invitation token.
 * It creates the trip_members record for the newly signed up user.
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Get invitation token
    const { data: invitationToken, error: tokenError } = await supabase
      .from("invitation_tokens")
      .select("id, trip_id, email, role, expires_at, used_at, invited_by")
      .eq("token", token)
      .single();

    if (tokenError) {
      if (tokenError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: tokenError.message || "Failed to verify invitation" },
        { status: 500 }
      );
    }

    // Check if token is expired
    if (new Date(invitationToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (invitationToken.used_at) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 }
      );
    }

    // Verify user's email matches invitation email
    const userEmail = user.email?.toLowerCase();
    if (userEmail !== invitationToken.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Create trip member record for the newly signed up user
    const { data: membership, error: memberError } = await supabase
      .from("trip_members")
      .insert({
        trip_id: invitationToken.trip_id,
        user_id: user.id,
        role: invitationToken.role,
        invited_by: invitationToken.invited_by,
        invited_at: new Date().toISOString(),
        joined_at: null, // Will be set when they accept
      })
      .select()
      .single();

    if (memberError) {
      // If member already exists (edge case), that's okay
      if (memberError.code !== "23505") { // Unique violation
        console.error("Error creating membership:", memberError);
        return NextResponse.json(
          { error: memberError.message || "Failed to create membership" },
          { status: 500 }
        );
      }
    }

    // Create notification for the user
    const { data: tripData } = await supabase
      .from("trips")
      .select("title")
      .eq("id", invitationToken.trip_id)
      .single();

    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", invitationToken.invited_by)
      .single();

    if (tripData && inviterProfile) {
      const tripTitle = tripData.title || "a trip";
      const inviterName = inviterProfile.full_name || "Someone";
      const notificationMessage = `${inviterName} invited you to join "${tripTitle}"`;

      await supabase.rpc("create_notification", {
        p_user_id: user.id,
        p_type: "trip_invite",
        p_trip_id: invitationToken.trip_id,
        p_inviter_id: inviterProfile.id,
        p_message: notificationMessage,
        p_metadata: {
          role: invitationToken.role,
          trip_title: tripTitle,
          invitation_token_id: invitationToken.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Membership created successfully",
      trip_id: invitationToken.trip_id,
    });
  } catch (error) {
    console.error("Unexpected error completing signup with invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
