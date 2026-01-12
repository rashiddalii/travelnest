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

    // Get trip
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError) {
      if (tripError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Trip not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching trip:", tripError);
      return NextResponse.json(
        { error: tripError.message || "Failed to fetch trip" },
        { status: 500 }
      );
    }

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

    // If user is not a member and trip is private, deny access
    if (!membership && trip.privacy === "private") {
      return NextResponse.json(
        { error: "You don't have access to this trip" },
        { status: 403 }
      );
    }

    // Get trip sections
    const { data: sections, error: sectionsError } = await supabase
      .from("trip_sections")
      .select("*")
      .eq("trip_id", tripId)
      .order("position", { ascending: true });

    if (sectionsError) {
      console.error("Error fetching sections:", sectionsError);
    }

    // Get trip members
    const { data: members, error: membersError } = await supabase
      .from("trip_members")
      .select(
        "user_id, role, joined_at, profiles!trip_members_user_id_fkey(id, full_name, avatar_url)"
      )
      .eq("trip_id", tripId);

    if (membersError) {
      console.error("Error fetching members:", membersError);
    }

    // Format members
    const formattedMembers =
      members?.map((member: any) => ({
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        profile: member.profiles,
      })) || [];

    return NextResponse.json({
      trip: {
        id: trip.id,
        slug: trip.slug,
        title: trip.title,
        description: trip.description,
        cover_photo_url: trip.cover_photo_url,
        start_date: trip.start_date,
        end_date: trip.end_date,
        privacy: trip.privacy,
        owner_id: trip.owner_id,
        created_at: trip.created_at,
        updated_at: trip.updated_at,
      },
      sections: sections || [],
      members: formattedMembers,
      userRole: membership?.role || null,
    });
  } catch (error) {
    console.error("Unexpected error fetching trip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json();
    const { title, description, start_date, end_date, privacy, cover_photo_url } = body;

    // Get trip to check ownership
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("owner_id")
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

    // Only owner can update trip
    if (trip.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only the trip owner can update the trip" },
        { status: 403 }
      );
    }

    // Validate dates if provided
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (start > end) {
        return NextResponse.json(
          { error: "Start date must be before end date" },
          { status: 400 }
        );
      }
    }

    // Validate privacy
    if (privacy && !["private", "friends-only", "public"].includes(privacy)) {
      return NextResponse.json(
        { error: "Invalid privacy setting" },
        { status: 400 }
      );
    }

    // Update trip
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (start_date !== undefined) updateData.start_date = start_date || null;
    if (end_date !== undefined) updateData.end_date = end_date || null;
    if (privacy !== undefined) updateData.privacy = privacy;
    if (cover_photo_url !== undefined) updateData.cover_photo_url = cover_photo_url || null;

    const { data: updatedTrip, error: updateError } = await supabase
      .from("trips")
      .update(updateData)
      .eq("id", tripId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating trip:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update trip" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      trip: updatedTrip,
    });
  } catch (error) {
    console.error("Unexpected error updating trip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Get trip to check ownership
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("owner_id")
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

    // Only owner can delete trip
    if (trip.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only the trip owner can delete the trip" },
        { status: 403 }
      );
    }

    // Delete trip (cascade will delete related records)
    const { error: deleteError } = await supabase
      .from("trips")
      .delete()
      .eq("id", tripId);

    if (deleteError) {
      console.error("Error deleting trip:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete trip" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error deleting trip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
