"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Calendar,
  Lock,
  Users,
  Image as ImageIcon,
  MapPin,
  DollarSign,
  ShoppingBag,
  FileText,
  Camera,
  StickyNote,
  Music,
  GripVertical,
  UserPlus,
  X,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { InviteMembersModal } from "@/components/trips/invite-members-modal";

interface Trip {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  privacy: "private" | "friends-only" | "public";
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface Section {
  id: string;
  trip_id: string;
  type: string;
  title: string;
  position: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Member {
  id?: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  invited_at?: string | null;
  status?: "joined" | "pending";
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TripPageProps {
  params: Promise<{
    tripId: string;
  }>;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  overview: <MapPin className="w-5 h-5" />,
  itinerary: <Calendar className="w-5 h-5" />,
  budget: <DollarSign className="w-5 h-5" />,
  expenses: <DollarSign className="w-5 h-5" />,
  packing: <ShoppingBag className="w-5 h-5" />,
  documents: <FileText className="w-5 h-5" />,
  photos: <Camera className="w-5 h-5" />,
  notes: <StickyNote className="w-5 h-5" />,
  playlist: <Music className="w-5 h-5" />,
};

// Sortable Section Component
function SortableSection({
  section,
  tripId,
  canEdit,
}: {
  section: Section;
  tripId: string;
  canEdit: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        {canEdit && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        <Link
          href={`/trips/${tripId}/sections/${section.id}`}
          className="block"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
              {SECTION_ICONS[section.type] || <FileText className="w-5 h-5" />}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {section.title}
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {section.type}
          </p>
        </Link>
      </div>
    </div>
  );
}

export default function TripPage({ params }: TripPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const supabase = createClient();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Unwrap params Promise using React.use()
  const { tripId } = use(params);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const canEdit = userRole === "owner" || userRole === "editor";

  useEffect(() => {
    // Only redirect if auth is done loading and no user
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    // Only fetch once when we have user and tripId, and haven't loaded yet
    if (user && tripId && !hasLoadedRef.current && !authLoading) {
      hasLoadedRef.current = true;
      fetchTrip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, tripId]);

  // Set up real-time subscription for trip_members changes
  useEffect(() => {
    if (!tripId || !user) return;

    const channel = supabase
      .channel(`trip-members-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "trip_members",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          // Member was deleted (rejected invitation or removed) - refresh members list
          console.log("🔄 Member deleted, refreshing members list");
          fetchMembers();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_members",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          // New member added - refresh members list
          console.log("🔄 New member added, refreshing members list");
          fetchMembers();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trip_members",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          // Member updated (e.g., joined_at set when accepting) - refresh members list
          console.log("🔄 Member updated, refreshing members list", payload);
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, user, supabase]);

  const fetchTrip = async (forceRefresh = false) => {
    if (!tripId) return;
    
    // Don't fetch if we already have trip data (unless forcing refresh)
    if (trip && !forceRefresh) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/trips/${tripId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch trip");
      }

      setTrip(data.trip);
      setSections(data.sections || []);
      setMembers(data.members || []);
      setUserRole(data.userRole);
    } catch (err) {
      console.error("Error fetching trip:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load trip"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!tripId) return;
    
    try {
      const response = await fetch(`/api/trips/${tripId}/members`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch members");
      }

      setMembers(data.members || []);
      if (data.userRole) {
        setUserRole(data.userRole);
      }
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!tripId || !confirm("Are you sure you want to remove this member?")) {
      return;
    }

    setRemovingMemberId(userId);
    try {
      const response = await fetch(`/api/trips/${tripId}/members/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      // Refresh members list
      await fetchMembers();
    } catch (err) {
      console.error("Error removing member:", err);
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sections.findIndex((section) => section.id === active.id);
    const newIndex = sections.findIndex((section) => section.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update UI
    const newSections = arrayMove(sections, oldIndex, newIndex);
    setSections(newSections);

    // Update positions in database
    setIsReordering(true);
    try {
      const sectionOrders = newSections.map((section, index) => ({
        id: section.id,
        position: index,
      }));

      const response = await fetch(
        `/api/trips/${tripId}/sections/reorder`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sectionOrders }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reorder sections");
      }
    } catch (err) {
      console.error("Error reordering sections:", err);
      // Revert on error
      setSections(sections);
      alert(err instanceof Error ? err.message : "Failed to reorder sections");
    } finally {
      setIsReordering(false);
    }
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return null;
    try {
      const startDate = format(new Date(start), "MMMM d, yyyy");
      if (end) {
        const endDate = format(new Date(end), "MMMM d, yyyy");
        return `${startDate} - ${endDate}`;
      }
      return startDate;
    } catch {
      return null;
    }
  };

  // Only show loading screen on initial load when we don't have data yet
  if ((authLoading || loading) && !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {error}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You may not have access to this trip, or it may not exist.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Cover Photo */}
        {trip.cover_photo_url && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-xl">
            <img
              src={trip.cover_photo_url}
              alt={trip.title}
              className="w-full h-64 md:h-96 object-cover"
              onError={(e) => {
                console.error("Error loading cover image:", trip.cover_photo_url);
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Trip Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {trip.title}
              </h1>
              {trip.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {trip.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                {trip.start_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  <span className="capitalize">{trip.privacy}</span>
                </div>
                {members.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Members {members.length > 0 && `(${members.length})`}
              </h3>
              {canEdit && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
              )}
            </div>
            {members.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No members yet</p>
                {canEdit && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Invite your first member
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-medium">
                        {member.profile?.avatar_url ? (
                          <img
                            src={member.profile.avatar_url}
                            alt={member.profile.full_name || "Member"}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span>
                            {(member.profile?.full_name || "U")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {member.status === "pending" && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {member.profile?.full_name || "Unknown"}
                        </p>
                        {member.status === "pending" && (
                          <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {member.role}
                      </p>
                    </div>
                    {userRole === "owner" && member.user_id !== trip?.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={removingMemberId === member.user_id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all disabled:opacity-50"
                        title="Remove member"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Trip Sections
            </h2>
            {canEdit && sections.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Drag to reorder
              </p>
            )}
          </div>
          {sections.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No sections available yet
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sections.map((s) => s.id)}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sections.map((section) => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      tripId={tripId}
                      canEdit={canEdit || false}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Invite Members Modal */}
      <InviteMembersModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        tripId={tripId}
        onMemberInvited={fetchMembers}
      />
    </div>
  );
}

