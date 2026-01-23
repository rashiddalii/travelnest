import { createClient } from "@/lib/supabase/server";
import { isValidEmail, jsonError, logAuthFailure, normalizeEmail } from "@/lib/auth/api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const { email, password } = body as { email?: unknown; password?: unknown };

    if (typeof email !== "string" || email.trim().length === 0)
      return jsonError("Email is required", 400);

    if (typeof password !== "string" || password.length === 0)
      return jsonError("Password is required", 400);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) return jsonError("Invalid email format", 400);

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined;
      logAuthFailure("login_failed", {
        email: normalizedEmail,
        message: error?.message || "No user returned",
        status,
      });
      // Avoid leaking details for credential failures.
      return jsonError("Invalid email or password", 401);
    }

    // Optional: enforce email confirmation (matches existing UX messaging)
    if (!data.user.email_confirmed_at) {
      logAuthFailure("login_blocked_email_not_confirmed", {
        email: normalizedEmail,
        userId: data.user.id,
      });
      return jsonError("Please verify your email address before logging in.", 403);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
      },
    });
  } catch (error) {
    console.error("Unexpected error in /api/auth/login:", error);
    return jsonError("Internal server error", 500);
  }
}

