import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
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

    // Update profile preferences
    const { error } = await supabase
      .from("profiles")
      .update({
        preferences,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
