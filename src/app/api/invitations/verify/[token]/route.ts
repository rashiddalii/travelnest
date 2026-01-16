import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const supabase = await createClient();
    
    // Handle params as Promise (Next.js 15+) or object (Next.js 14)
    const { token } = params instanceof Promise ? await params : params;

    // Get invitation token
    const { data: invitationToken, error: tokenError } = await supabase
      .from("invitation_tokens")
      .select(
        `
        id,
        trip_id,
        email,
        role,
        expires_at,
        used_at,
        invited_by,
        trips!inner(id, title),
        profiles!invitation_tokens_invited_by_fkey(id, full_name)
        `
      )
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

    // Check if user exists
    const { data: userIdData } = await supabase.rpc(
      "get_user_id_by_email",
      { user_email: invitationToken.email }
    );

    const isExistingUser = !!userIdData;

    return NextResponse.json({
      valid: true,
      tripTitle: (invitationToken.trips as any)?.title || "a trip",
      inviterName: (invitationToken.profiles as any)?.full_name || "Someone",
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
