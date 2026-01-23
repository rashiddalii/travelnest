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

    const { email, password, name } = body as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
    };

    if (typeof email !== "string" || email.trim().length === 0)
      return jsonError("Email is required", 400);

    if (typeof password !== "string" || password.length === 0)
      return jsonError("Password is required", 400);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) return jsonError("Invalid email format", 400);

    if (password.length < 6)
      return jsonError("Password must be at least 6 characters", 400);

    const fullName = typeof name === "string" && name.trim().length > 0 ? name.trim() : undefined;

    const supabase = await createClient();
    const origin = new URL(request.url).origin;

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined;
      logAuthFailure("register_failed", {
        email: normalizedEmail,
        message: error.message,
        status,
      });
      return jsonError(error.message || "Registration failed", 400);
    }

    if (!data.user) return jsonError("Registration failed", 500);

    return NextResponse.json(
      {
        success: true,
        requires_email_confirmation: data.session === null,
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error in /api/auth/register:", error);
    return jsonError("Internal server error", 500);
  }
}

