import { jsonError, requireAuth } from "@/lib/auth/api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const { password } = body as { password?: unknown };

    if (typeof password !== "string" || password.length === 0)
      return jsonError("Password is required", 400);

    if (password.length < 6)
      return jsonError("Password must be at least 6 characters", 400);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error("Error updating password:", updateError);
      return jsonError(updateError.message || "Failed to reset password", 400);
    }

    // Revoke refresh tokens across devices (access tokens may remain valid until expiry).
    await supabase.auth.signOut({ scope: "global" });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Please log in again.",
      user: { id: user.id },
    });
  } catch (error) {
    console.error("Unexpected error in /api/auth/reset-password:", error);
    return jsonError("Internal server error", 500);
  }
}

