import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    let admin;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("Admin client not configured:", error);
      return NextResponse.json(
        {
          error:
            "Server not configured: missing SUPABASE_SERVICE_ROLE_KEY. Set it in travelnest-web/.env.local and restart the server.",
        },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get profile data
    let { data: profile, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if user has Google avatar from OAuth
    const googleAvatarUrl = user.user_metadata?.avatar_url || null;
    const hasGoogleAvatar = !!googleAvatarUrl;

    // Auto-sync Google avatar for existing users who don't have an avatar yet
    // This handles users who signed up before avatar sync was implemented
    if (profile && !profile.avatar_url && googleAvatarUrl) {
      const { data: updatedProfile, error: updateError } = await admin
        .from("profiles")
        .update({ 
          avatar_url: googleAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)
        .select()
        .single();

      if (!updateError && updatedProfile) {
        profile = updatedProfile;
        console.log(`Auto-synced Google avatar for user ${user.id}`);
      }
    }

    // Also sync full_name from Google if not set
    if (profile && !profile.full_name && user.user_metadata?.full_name) {
      const { data: updatedProfile, error: updateError } = await admin
        .from("profiles")
        .update({ 
          full_name: user.user_metadata.full_name,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)
        .select()
        .single();

      if (!updateError && updatedProfile) {
        profile = updatedProfile;
        console.log(`Auto-synced Google full_name for user ${user.id}`);
      }
    }

    return NextResponse.json({
      profile: profile || null,
      email: user.email,
      hasGoogleAvatar,
      googleAvatarUrl,
    });
  } catch (error) {
    console.error("Unexpected error fetching profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    let admin;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("Admin client not configured:", error);
      return NextResponse.json(
        {
          error:
            "Server not configured: missing SUPABASE_SERVICE_ROLE_KEY. Set it in travelnest-web/.env.local and restart the server.",
        },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { full_name, bio, avatar_url, preferences } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) {
      updateData.full_name = full_name;
    }
    if (bio !== undefined) {
      updateData.bio = bio;
    }
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url;
    }
    if (preferences !== undefined) {
      updateData.preferences = preferences;
    }

    // Update profile
    const { data: updated, error } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("Unexpected error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
