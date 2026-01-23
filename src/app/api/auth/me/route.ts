import { requireAuth, jsonError } from "@/lib/auth/api";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
    });
  } catch (error) {
    console.error("Unexpected error in /api/auth/me:", error);
    return jsonError("Internal server error", 500);
  }
}

