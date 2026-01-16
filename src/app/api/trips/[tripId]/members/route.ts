import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> | { tripId: string } }
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
    const { tripId } = params instanceof Promise ? await params : params;

    // Check if user is a member of this trip
    const { data: membership, error: membershipError } = await supabase
      .from("trip_members")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (membershipError && membershipError.code !== "PGRST116") {
      console.error("Error checking membership:", membershipError);
    }

    // Get trip to check privacy
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("privacy, owner_id")
      .eq("id", tripId)
      .single();

    if (tripError) {
      if (tripError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Trip not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: tripError.message || "Failed to fetch trip" },
        { status: 500 }
      );
    }

    // If user is not a member and trip is private, deny access
    if (!membership && trip.privacy === "private") {
      return NextResponse.json(
        { error: "You don't have access to this trip" },
        { status: 403 }
      );
    }

    // Get all trip members with profile information
    const { data: members, error: membersError } = await supabase
      .from("trip_members")
      .select(
        `
        id,
        user_id,
        role,
        invited_by,
        invited_at,
        joined_at,
        created_at,
        profiles!trip_members_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: membersError.message || "Failed to fetch members" },
        { status: 500 }
      );
    }

    // Format members
    const formattedMembers =
      members?.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        invited_by: member.invited_by,
        invited_at: member.invited_at,
        joined_at: member.joined_at,
        created_at: member.created_at,
        profile: member.profiles,
        status: member.joined_at ? "joined" : "pending",
      })) || [];

    return NextResponse.json({
      members: formattedMembers,
      userRole: membership?.role || (trip.owner_id === user.id ? "owner" : null),
    });
  } catch (error) {
    console.error("Unexpected error fetching members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
