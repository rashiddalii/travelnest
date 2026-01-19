import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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
    const { id } = params instanceof Promise ? await params : params;

    // Check if notification exists and belongs to user
    const { data: notification, error: notificationError } = await supabase
      .from("user_inbox")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (notificationError) {
      if (notificationError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: notificationError.message || "Failed to fetch notification" },
        { status: 500 }
      );
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to update this notification" },
        { status: 403 }
      );
    }

    // Mark as read
    const { data: updatedNotification, error: updateError } = await supabase
      .from("user_inbox")
      .update({ read: true })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating notification:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to mark notification as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Unexpected error marking notification as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
