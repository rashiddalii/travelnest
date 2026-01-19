import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const admin = createAdminClient();
    
    // Handle params as Promise (Next.js 15+) or object (Next.js 14)
    const { token } = params instanceof Promise ? await params : params;

    // Use service role to fetch invitation context (trip title, inviter name) without RLS friction.
    const { data: invitationToken, error: tokenError } = await admin
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

    const { data: tripData } = await admin
      .from("trips")
      .select("title")
      .eq("id", invitationToken.trip_id)
      .single();

    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", invitationToken.invited_by)
      .single();

    const normalizedEmail = invitationToken.email?.toLowerCase() || "";
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const isExistingUser = !!existingProfile;

    return NextResponse.json({
      valid: true,
      tripTitle: tripData?.title || "a trip",
      inviterName: inviterProfile?.full_name || "Someone",
      role: invitationToken.role,
      email: invitationToken.email,
      tripId: invitationToken.trip_id,
      isNewUser: !isExistingUser,
    });
  } catch (error) {
    console.error("Unexpected error verifying invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
