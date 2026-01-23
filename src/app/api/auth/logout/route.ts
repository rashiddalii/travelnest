import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/auth/api";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // Supabase will clear the auth cookies for this session.
    const { error } = await supabase.auth.signOut({ scope: "global" });

    if (error) return jsonError(error.message || "Logout failed", 400);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in /api/auth/logout:", error);
    return jsonError("Internal server error", 500);
  }
}

