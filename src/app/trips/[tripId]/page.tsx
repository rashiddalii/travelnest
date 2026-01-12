"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth-store";
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
} from "lucide-react";
import { format } from "date-fns";

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
  user_id: string;
  role: string;
  joined_at: string | null;
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

  // Unwrap params Promise using React.use()
  const { tripId } = use(params);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && tripId) {
      fetchTrip();
    }
  }, [user, authLoading, tripId]);

  const fetchTrip = async () => {
    if (!tripId) return;
    
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

  if (authLoading || loading) {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
          {members.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Members
              </h3>
              <div className="flex items-center gap-3">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-2"
                    title={member.profile?.full_name || "Member"}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-medium">
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
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {member.profile?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Trip Sections
          </h2>
          {sections.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No sections available yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                      {SECTION_ICONS[section.type] || <FileText className="w-5 h-5" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {section.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {section.type}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

