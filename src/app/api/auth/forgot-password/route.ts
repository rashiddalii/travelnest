import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const { email } = body as { email?: unknown };

    if (typeof email !== "string" || email.trim().length === 0)
      return jsonError("Email is required", 400);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) return jsonError("Invalid email format", 400);

    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/callback?next=/reset-password`;

    // In development, generate the action link so we can "mock" email delivery.
    let devActionLink: string | undefined;
    if (process.env.NODE_ENV !== "production") {
      try {
        const admin = createAdminClient();
        const { data, error } = await admin.auth.admin.generateLink({
          type: "recovery",
          email: normalizedEmail,
          options: { redirectTo },
        });

        if (!error && data?.properties?.action_link) {
          devActionLink = data.properties.action_link;
          console.log("📧 [EMAIL LOG] Password reset link:", {
            to: normalizedEmail,
            action_link: devActionLink,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.warn("Could not generate password recovery link (dev):", error);
      }
    }

    // Trigger Supabase's built-in email flow (recommended for production).
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined;
      logAuthFailure("forgot_password_failed", {
        email: normalizedEmail,
        message: error.message,
        status,
      });

      // If we have a dev action link, allow local testing even if SMTP isn't configured.
      if (devActionLink) {
        return NextResponse.json({
          success: true,
          message:
            "Password reset email could not be sent, but a dev reset link was generated (see server logs).",
        });
      }

      return jsonError(error.message || "Failed to initiate password reset", 400);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for this email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Unexpected error in /api/auth/forgot-password:", error);
    return jsonError("Internal server error", 500);
  }
}

