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

    const { data: profile, error } = await admin
      .from("profiles")
      .select("preferences, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      preferences: profile?.preferences ?? null,
      onboarding_completed: profile?.onboarding_completed ?? false,
    });
  } catch (error) {
    console.error("Unexpected error fetching profile preferences:", error);
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
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    let preferences;
    try {
      preferences = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate preferences structure
    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json(
        { error: "Invalid preferences data" },
        { status: 400 }
      );
    }

    const email = user.email?.trim().toLowerCase() || null;
    const fullName =
      typeof (user.user_metadata as Record<string, unknown> | null | undefined)?.full_name ===
      "string"
        ? ((user.user_metadata as Record<string, unknown>).full_name as string)
        : null;

    // Upsert profile preferences (handles edge cases where profile row was not created)
    const { data: updated, error } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email,
          full_name: fullName,
          preferences,
          onboarding_completed: true,
        },
        { onConflict: "id" }
      )
      .select("id, onboarding_completed")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!updated?.onboarding_completed) {
      return NextResponse.json(
        { error: "Failed to mark onboarding as completed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, onboarding_completed: true });
  } catch (error) {
    console.error("Unexpected error saving profile preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
