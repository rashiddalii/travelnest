import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendInvitationEmail } from "@/lib/email";
import { randomBytes } from "crypto";

// Generate secure random token
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> | { tripId: string } }
) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📧 [${requestId}] Invitation request started`);
  
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
    const { email, role = "editor" } = body;
    
    console.log(`📧 [${requestId}] Inviting:`, { email: email.trim(), role, tripId });

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'editor' or 'viewer'" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Get trip and check permissions
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, title, owner_id")
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

    // Check if user is owner or editor
    const { data: membership, error: membershipError } = await supabase
      .from("trip_members")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError && membershipError.code !== "PGRST116") {
      console.error("Error checking membership:", membershipError);
    }

    const userRole = trip.owner_id === user.id ? "owner" : membership?.role;
    
    // Only owner and editors can invite
    if (userRole !== "owner" && userRole !== "editor") {
      return NextResponse.json(
        { error: "Only trip owners and editors can invite members" },
        { status: 403 }
      );
    }

    // Get inviter's profile
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

    // Check if user already exists by email
    const { data: userIdData, error: userIdError } = await supabase.rpc(
      "get_user_id_by_email",
      { user_email: normalizedEmail }
    );

    const isExistingUser = !!userIdData && !userIdError;
    const invitedUserId = userIdData as string | null;

    // Check if user is already a member (if they exist)
    if (isExistingUser && invitedUserId) {
      const { data: existingMember, error: existingMemberError } = await supabase
        .from("trip_members")
        .select("id, role, joined_at")
        .eq("trip_id", tripId)
        .eq("user_id", invitedUserId)
        .maybeSingle();

      if (existingMemberError && existingMemberError.code !== "PGRST116") {
        console.error("Error checking existing member:", existingMemberError);
      }

      if (existingMember) {
        if (existingMember.joined_at) {
          return NextResponse.json(
            { error: "User is already a member of this trip" },
            { status: 400 }
          );
        } else {
          // User is already invited but hasn't accepted - check if there's a recent invitation
          // If invited within last hour, don't allow duplicate invitation
          const { data: recentToken } = await supabase
            .from("invitation_tokens")
            .select("created_at")
            .eq("trip_id", tripId)
            .eq("email", normalizedEmail)
            .is("used_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (recentToken) {
            const tokenAge = new Date().getTime() - new Date(recentToken.created_at).getTime();
            const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
            
            if (tokenAge < oneHour) {
              return NextResponse.json(
                { error: "An invitation was already sent recently. Please wait before sending another." },
                { status: 400 }
              );
            }
          }
          // Otherwise, allow resending invitation (user might have lost the email)
        }
      }
    }

    // Generate secure invitation token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Delete any existing pending invitation tokens for this trip/email
    const { data: deletedTokens } = await supabase
      .from("invitation_tokens")
      .delete()
      .eq("trip_id", tripId)
      .eq("email", normalizedEmail)
      .is("used_at", null)
      .select();

    if (deletedTokens && deletedTokens.length > 0) {
      console.log(`📧 Deleted ${deletedTokens.length} existing invitation token(s) for ${normalizedEmail}`);
    }

    // Create new invitation token
    const { data: invitationToken, error: tokenError } = await supabase
      .from("invitation_tokens")
      .insert({
        trip_id: tripId,
        email: normalizedEmail,
        role: role,
        token: token,
        invited_by: inviterProfile.id,
        expires_at: expiresAt.toISOString(),
        used_at: null,
      })
      .select()
      .single();

    if (tokenError) {
      console.error("❌ Error creating invitation token:", tokenError);
      return NextResponse.json(
        { error: "Failed to create invitation token" },
        { status: 500 }
      );
    }

    console.log("✅ Created invitation token:", {
      tokenId: invitationToken.id,
      email: normalizedEmail,
      tripId,
      isExistingUser,
    });

    // Create or update trip member record only if user exists
    // For new users, we'll create the member record when they sign up and accept the invitation
    let newMember = null;
    if (isExistingUser && invitedUserId) {
      const { data: memberData, error: memberError } = await supabase
        .from("trip_members")
        .upsert({
          trip_id: tripId,
          user_id: invitedUserId,
          role: role,
          invited_by: inviterProfile.id,
          invited_at: new Date().toISOString(),
          joined_at: null,
        }, {
          onConflict: "trip_id,user_id",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (memberError) {
        console.error("Error creating trip member:", memberError);
        // Continue anyway - we'll create it when they accept
      } else {
        newMember = memberData;
      }

      // Create notification for existing user (only if one doesn't already exist)
      // Check if there's already a pending/unread notification for this invitation
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id, read, status")
        .eq("user_id", invitedUserId)
        .eq("trip_id", tripId)
        .eq("type", "trip_invite")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Only create notification if:
      // 1. No notification exists, OR
      // 2. Existing notification is already accepted/rejected/revoked (old invitation)
      const shouldCreateNotification = !existingNotification || 
        (existingNotification.status && !["pending", null].includes(existingNotification.status));

      if (shouldCreateNotification) {
        const tripTitle = trip.title || "a trip";
        const inviterName = inviterProfile.full_name || "Someone";
        const notificationMessage = `${inviterName} invited you to join "${tripTitle}"`;

        const { data: notificationId, error: notificationError } = await supabase.rpc("create_notification", {
          p_user_id: invitedUserId,
          p_type: "trip_invite",
          p_trip_id: tripId,
          p_inviter_id: inviterProfile.id,
          p_message: notificationMessage,
          p_metadata: {
            role: role,
            trip_title: tripTitle,
            invitation_token_id: invitationToken.id,
          },
        });

        if (notificationError) {
          console.error(`❌ [${requestId}] Error creating notification:`, notificationError);
        } else {
          console.log(`✅ [${requestId}] Created notification:`, {
            notificationId,
            userId: invitedUserId,
            tripId,
          });
        }
      } else {
        console.log(`⏭️  [${requestId}] Skipping duplicate notification - one already exists:`, {
          notificationId: existingNotification.id,
          status: existingNotification.status,
          read: existingNotification.read,
        });
      }
    }

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = isExistingUser
      ? `${baseUrl}/invite/${token}` // Existing user: direct to invitations
      : `${baseUrl}/invite/${token}?signup=true`; // New user: signup flow

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

    // Email service logs the details - implementation will be added later
    if (!emailResult.success) {
      console.error("❌ Email service error:", emailResult.error);
      // Don't fail the invitation if email fails - they can still accept via app
    }

    console.log(`✅ [${requestId}] Invitation completed successfully`);
    
    return NextResponse.json({
      success: true,
      message: isExistingUser
        ? "Invitation sent successfully"
        : "Invitation email sent. They'll need to sign up first.",
      member: newMember,
      isNewUser: !isExistingUser,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Unexpected error inviting member:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
