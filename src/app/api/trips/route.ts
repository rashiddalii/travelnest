import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Helper function to generate unique slug
function generateSlug(title: string, startDate?: string): string {
  // Convert title to URL-friendly slug
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Add date suffix if available
  if (startDate) {
    try {
      const date = new Date(startDate);
      const year = date.getFullYear();
      const month = date.toLocaleString("en-US", { month: "short" }).toLowerCase();
      slug = `${slug}-${year}-${month}`;
    } catch (error) {
      // If date parsing fails, just use title
      console.error("Error parsing date for slug:", error);
    }
  }

  return slug;
}

// Helper function to ensure unique slug
async function ensureUniqueSlug(
  supabase: any,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { data, error } = await supabase
      .from("trips")
      .select("id")
      .eq("slug", slug)
      .single();

    if (error && error.code === "PGRST116") {
      // No row found - slug is unique
      return slug;
    }

    if (error && error.code !== "PGRST116") {
      // Some other error occurred
      throw new Error(`Error checking slug uniqueness: ${error.message}`);
    }

    // Slug exists, try with counter
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Default section configuration
const DEFAULT_SECTIONS = [
  { type: "overview", title: "Overview", position: 0 },
  { type: "itinerary", title: "Itinerary", position: 1 },
  { type: "budget", title: "Budget", position: 2 },
  { type: "expenses", title: "Expenses", position: 3 },
  { type: "packing", title: "Packing List", position: 4 },
  { type: "documents", title: "Documents", position: 5 },
  { type: "photos", title: "Photos", position: 6 },
  { type: "notes", title: "Notes", position: 7 },
  { type: "playlist", title: "Playlist", position: 8 },
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
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

    const body = await request.json();
    const { title, description, start_date, end_date, privacy, cover_photo_url } =
      body;

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Validate dates
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
    const validPrivacy = ["private", "friends-only", "public"];
    const tripPrivacy = privacy || "private";
    if (!validPrivacy.includes(tripPrivacy)) {
      return NextResponse.json(
        { error: "Invalid privacy setting" },
        { status: 400 }
      );
    }

    // Generate unique slug
    const baseSlug = generateSlug(title, start_date);
    // Must be checked with service role so we don't miss private trips
    const uniqueSlug = await ensureUniqueSlug(admin, baseSlug);

    // Create trip
    const { data: trip, error: tripError } = await admin
      .from("trips")
      .insert({
        slug: uniqueSlug,
        title: title.trim(),
        description: description?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        privacy: tripPrivacy,
        cover_photo_url: cover_photo_url || null,
        owner_id: user.id,
      })
      .select()
      .single();

    // Log cover photo URL for debugging
    if (cover_photo_url) {
      console.log("Saving cover photo URL to database:", cover_photo_url);
    }

    if (tripError) {
      console.error("Error creating trip:", tripError);
      return NextResponse.json(
        { error: tripError.message || "Failed to create trip" },
        { status: 500 }
      );
    }

    if (!trip) {
      return NextResponse.json(
        { error: "Failed to create trip" },
        { status: 500 }
      );
    }

    // Create default sections
    const sectionsToInsert = DEFAULT_SECTIONS.map((section) => ({
      trip_id: trip.id,
      type: section.type,
      title: section.title,
      position: section.position,
      metadata: {},
    }));

    const { error: sectionsError } = await admin
      .from("trip_sections")
      .insert(sectionsToInsert);

    if (sectionsError) {
      console.error("Error creating sections:", sectionsError);
      // Don't fail the request, but log the error
      // Sections can be created later if needed
    }

    // Add owner as trip member
    const { error: memberError } = await admin
      .from("trip_members")
      .insert({
        trip_id: trip.id,
        user_id: user.id,
        role: "owner",
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error("Error adding owner as member:", memberError);
      // Don't fail the request, but log the error
    }

    // Create activity entry
    const { error: activityError } = await admin
      .from("activities")
      .insert({
        trip_id: trip.id,
        user_id: user.id,
        type: "trip_created",
        entity_type: "trip",
        entity_id: trip.id,
        metadata: { title: trip.title },
      });

    if (activityError) {
      console.error("Error creating activity:", activityError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json(
      {
        success: true,
        trip: {
          id: trip.id,
          slug: trip.slug,
          title: trip.title,
          description: trip.description,
          start_date: trip.start_date,
          end_date: trip.end_date,
          privacy: trip.privacy,
          cover_photo_url: trip.cover_photo_url,
          owner_id: trip.owner_id,
          created_at: trip.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error creating trip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // First, get the user's trip memberships to filter by joined_at
    // Only show trips where user is owner OR has accepted invitation (joined_at IS NOT NULL)
    const { data: userMemberships, error: membershipsError } = await supabase
      .from("trip_members")
      .select("trip_id, joined_at, role")
      .eq("user_id", user.id);

    if (membershipsError) {
      console.error("Error fetching user memberships:", membershipsError);
      return NextResponse.json(
        { error: membershipsError.message || "Failed to fetch memberships" },
        { status: 500 }
      );
    }

    // Get trip IDs where user has accepted (joined_at IS NOT NULL) or is owner
    const acceptedTripIds = new Set(
      (userMemberships || [])
        .filter((m) => m.joined_at !== null)
        .map((m) => m.trip_id)
    );

    // Get trips where user is owner OR has accepted invitation
    // We'll query all trips the user can see via RLS, then filter
    const { data: allTrips, error: tripsError } = await supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false });

    if (tripsError) {
      console.error("Error fetching trips:", tripsError);
      return NextResponse.json(
        { error: tripsError.message || "Failed to fetch trips" },
        { status: 500 }
      );
    }

    if (!allTrips || allTrips.length === 0) {
      return NextResponse.json({ trips: [] });
    }

    // Filter trips: only show trips where user is owner OR has accepted invitation
    const trips = allTrips.filter(
      (trip) => trip.owner_id === user.id || acceptedTripIds.has(trip.id)
    );

    if (trips.length === 0) {
      return NextResponse.json({ trips: [] });
    }

    const tripIds = trips.map((t) => t.id);

    // Get all members for these trips
    // Query members only for trips where user is owner (to avoid recursion)
    // We'll get members for owned trips, and for member trips we'll query differently
    const ownedTripIds = trips.filter((t) => t.owner_id === user.id).map((t) => t.id);
    
    let membersData: any[] = [];
    
    // For owned trips, we can safely query all members
    if (ownedTripIds.length > 0) {
      const { data: ownedMembers, error: ownedMembersError } = await supabase
        .from("trip_members")
        .select("trip_id, user_id, role, profiles!trip_members_user_id_fkey(id, full_name, avatar_url)")
        .in("trip_id", ownedTripIds);

      if (!ownedMembersError && ownedMembers) {
        membersData = [...membersData, ...ownedMembers];
      }
    }

    // For trips where user is a member (not owner), try to get members
    // This might fail due to RLS, so we'll catch and continue
    const memberTripIds = trips.filter((t) => t.owner_id !== user.id).map((t) => t.id);
    if (memberTripIds.length > 0) {
      try {
        const { data: memberTripsMembers, error: memberTripsError } = await supabase
          .from("trip_members")
          .select("trip_id, user_id, role, profiles!trip_members_user_id_fkey(id, full_name, avatar_url)")
          .in("trip_id", memberTripIds)
          .eq("user_id", user.id); // Only get the current user's membership to avoid recursion

        if (!memberTripsError && memberTripsMembers) {
          membersData = [...membersData, ...memberTripsMembers];
        }
      } catch (error) {
        // If this fails due to RLS recursion, we'll just continue without these members
        console.warn("Could not fetch members for non-owned trips:", error);
      }
    }

    // Group members by trip_id
    const membersByTrip = new Map<
      string,
      Array<{
        user_id: string;
        role: string;
        profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
      }>
    >();
    
    membersData?.forEach((member: any) => {
      const tripId = member.trip_id;
      if (!membersByTrip.has(tripId)) {
        membersByTrip.set(tripId, []);
      }
      membersByTrip.get(tripId)?.push({
        user_id: member.user_id,
        role: member.role,
        profile: member.profiles,
      });
    });

    // Format response
    const formattedTrips =
      trips?.map((trip) => {
        const members = membersByTrip.get(trip.id) || [];
        const memberProfiles = members
          .map((m) => m.profile)
          .filter(Boolean)
          .slice(0, 4); // First 4 members for display

        return {
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
          members: memberProfiles,
          member_count: members.length,
        };
      }) || [];

    return NextResponse.json({ trips: formattedTrips || [] });
  } catch (error) {
    console.error("Unexpected error fetching trips:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
