import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Build query - use simpler approach without foreign key names
    let query = supabase
      .from("notifications")
      .select(
        `
        id,
        type,
        trip_id,
        inviter_id,
        message,
        read,
        status,
        metadata,
        created_at
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error("Error fetching notifications:", notificationsError);
      // If table doesn't exist, return empty array (migration not run yet)
      const errorMessage = notificationsError.message?.toLowerCase() || "";
      const errorCode = notificationsError.code || "";
      
      if (
        errorCode === "42P01" || 
        errorCode === "PGRST204" ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("relation") && errorMessage.includes("not found")
      ) {
        return NextResponse.json({
          notifications: [],
          unreadCount: 0,
        });
      }
      return NextResponse.json(
        { error: notificationsError.message || "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    // Format notifications - fetch related data if needed
    const formattedNotifications = [];
    for (const notification of notifications || []) {
      let trip = null;
      let inviter = null;

      // Fetch trip data if trip_id exists
      if (notification.trip_id) {
        const { data: tripData } = await supabase
          .from("trips")
          .select("id, title, cover_photo_url")
          .eq("id", notification.trip_id)
          .single();
        trip = tripData;
      }

      // Fetch inviter data if inviter_id exists
      if (notification.inviter_id) {
        const { data: inviterData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", notification.inviter_id)
          .single();
        inviter = inviterData;
      }

      formattedNotifications.push({
        id: notification.id,
        type: notification.type,
        trip_id: notification.trip_id,
        inviter_id: notification.inviter_id,
        message: notification.message,
        read: notification.read,
        status: (notification as any).status || "pending",
        metadata: notification.metadata,
        created_at: notification.created_at,
        trip,
        inviter,
      });
    }

    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (countError) {
      console.error("Error counting unread notifications:", countError);
      // If table doesn't exist, return 0
      const errorMessage = countError.message?.toLowerCase() || "";
      const errorCode = countError.code || "";
      
      if (
        errorCode === "42P01" || 
        errorCode === "PGRST204" ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("relation") && errorMessage.includes("not found")
      ) {
        return NextResponse.json({
          notifications: formattedNotifications,
          unreadCount: 0,
        });
      }
    }

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error("Unexpected error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
