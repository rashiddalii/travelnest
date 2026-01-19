import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendInvitationEmail } from "@/lib/email";
import { randomBytes } from "crypto";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> | { tripId: string } }
) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { tripId } = params instanceof Promise ? await params : params;

    const body = await request.json();
    const { email, role = "editor" } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!["editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'editor' or 'viewer'" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Trip access + inviter permissions (checked with user session + RLS)
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, title, owner_id")
      .eq("id", tripId)
      .single();

    if (tripError) {
      if (tripError.code === "PGRST116") {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: tripError.message || "Failed to fetch trip" },
        { status: 500 }
      );
    }

    const isOwner = trip.owner_id === user.id;

    // If not owner, must be an accepted editor to invite
    let inviterRole: string | null = isOwner ? "owner" : null;
    if (!isOwner) {
      const { data: membership, error: membershipError } = await supabase
        .from("trip_members")
        .select("role, joined_at")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError && membershipError.code !== "PGRST116") {
        console.error("Error checking membership:", membershipError);
      }

      if (!membership || membership.joined_at === null) {
        return NextResponse.json(
          { error: "You don't have access to invite members for this trip" },
          { status: 403 }
        );
      }

      inviterRole = membership.role;
    }

    if (inviterRole !== "owner" && inviterRole !== "editor") {
      return NextResponse.json(
        { error: "Only trip owners and editors can invite members" },
        { status: 403 }
      );
    }

    const { data: inviterProfile, error: inviterProfileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", user.id)
      .single();

    if (inviterProfileError || !inviterProfile) {
      return NextResponse.json(
        { error: "Failed to get inviter profile" },
        { status: 500 }
      );
    }

    // Lookup invited user via profiles.email (server-only; service role)
    const { data: invitedProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const invitedUserId = (invitedProfile as any)?.id as string | undefined;
    const isExistingUser = !!invitedUserId;

    // If invited user exists, ensure they aren't already joined
    if (invitedUserId) {
      const { data: existingMember } = await admin
        .from("trip_members")
        .select("id, joined_at")
        .eq("trip_id", tripId)
        .eq("user_id", invitedUserId)
        .maybeSingle();

      if (existingMember?.joined_at) {
        return NextResponse.json(
          { error: "User is already a member of this trip" },
          { status: 400 }
        );
      }
    }

    // Create invitation token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Remove any existing pending tokens for this trip/email (keeps unique partial index happy)
    await admin
      .from("invitation_tokens")
      .delete()
      .eq("trip_id", tripId)
      .eq("email", normalizedEmail)
      .is("used_at", null);

    const { data: invitationToken, error: tokenError } = await admin
      .from("invitation_tokens")
      .insert({
        trip_id: tripId,
        email: normalizedEmail,
        role,
        token,
        invited_by: inviterProfile.id,
        expires_at: expiresAt.toISOString(),
        used_at: null,
      })
      .select()
      .single();

    if (tokenError || !invitationToken) {
      console.error("Error creating invitation token:", tokenError);
      return NextResponse.json(
        { error: tokenError?.message || "Failed to create invitation token" },
        { status: 500 }
      );
    }

    // If the invited user already exists, create/update their pending membership and inbox item.
    // For brand new users, membership + inbox will be created after signup using the token.
    let member: any = null;
    if (invitedUserId) {
      const { data: memberData, error: memberError } = await admin
        .from("trip_members")
        .upsert(
          {
            trip_id: tripId,
            user_id: invitedUserId,
            role,
            invited_by: inviterProfile.id,
            invited_at: new Date().toISOString(),
            joined_at: null,
          },
          {
            onConflict: "trip_id,user_id",
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (memberError) {
        console.error("Error creating/updating trip member:", memberError);
      } else {
        member = memberData;
      }

      // Revoke any previous pending inbox invites for the same trip/user
      await admin
        .from("user_inbox")
        .update({ status: "revoked", read: true })
        .eq("user_id", invitedUserId)
        .eq("trip_id", tripId)
        .eq("type", "trip_invite")
        .eq("status", "pending");

      const tripTitle = trip.title || "a trip";
      const inviterName = inviterProfile.full_name || "Someone";
      const message = `${inviterName} invited you to join "${tripTitle}"`;

      await admin.from("user_inbox").insert({
        user_id: invitedUserId,
        type: "trip_invite",
        trip_id: tripId,
        actor_id: inviterProfile.id,
        message,
        read: false,
        status: "pending",
        metadata: {
          role,
          trip_title: tripTitle,
          invitation_token_id: invitationToken.id,
          invitation_token: invitationToken.token,
        },
      });
    }

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = isExistingUser
      ? `${baseUrl}/invite/${token}`
      : `${baseUrl}/invite/${token}?signup=true`;

    const tripTitle = trip.title || "a trip";
    const inviterName = inviterProfile.full_name || "Someone";

    const emailResult = await sendInvitationEmail({
      to: normalizedEmail,
      inviterName,
      tripTitle,
      invitationLink,
      isNewUser: !isExistingUser,
      role,
    });

    if (!emailResult.success) {
      console.error("Email service error:", emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: isExistingUser
        ? "Invitation sent successfully"
        : "Invitation email sent. They'll need to sign up first.",
      member,
      isNewUser: !isExistingUser,
    });
  } catch (error) {
    console.error("Unexpected error inviting member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
