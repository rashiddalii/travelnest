import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get user's email from auth
    const userEmail = userData.user.email?.toLowerCase();
    if (userEmail !== invitationToken.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Create or update trip member record
    const { data: membership, error: memberError } = await admin
      .from("trip_members")
      .upsert({
        trip_id: invitationToken.trip_id,
        user_id: user.id,
        role: invitationToken.role,
        invited_by: invitationToken.invited_by,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(), // Accept immediately
      }, {
        onConflict: "trip_id,user_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error creating membership:", memberError);
      return NextResponse.json(
        { error: memberError.message || "Failed to accept invitation" },
        { status: 500 }
      );
    }

    // Mark token as used
    await admin
      .from("invitation_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invitationToken.id);

    // Update inbox status to accepted (if an inbox item exists)
    await supabase
      .from("user_inbox")
      .update({ 
        status: "accepted",
        read: true,
      })
      .eq("trip_id", invitationToken.trip_id)
      .eq("user_id", user.id)
      .eq("type", "trip_invite")
      .in("status", ["pending", "accepted"]);

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      trip_id: invitationToken.trip_id,
    });
  } catch (error) {
    console.error("Unexpected error accepting invitation from token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
