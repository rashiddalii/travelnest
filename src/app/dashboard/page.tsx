"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { LogOut, Sparkles, Calendar, Lock, Users, Image as ImageIcon, Edit, Trash2, MoreVertical } from "lucide-react";
import { format, isFuture, isPast } from "date-fns";
import { NotificationIcon } from "@/components/notifications/notification-icon";

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
  members: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  member_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();
  const supabase = createClient();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [showMenuTripId, setShowMenuTripId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Only redirect if auth is done loading and no user
    if (initialized && !loading && !user) {
      router.push("/login");
    }
  }, [user, loading, initialized, router]);

  useEffect(() => {
    // Only fetch once when we have user and haven't loaded yet
    if (user && !hasLoadedRef.current && initialized && !loading) {
      hasLoadedRef.current = true;
      fetchTrips();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initialized, loading]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowMenuTripId(null);
    };
    if (showMenuTripId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showMenuTripId]);

  const fetchTrips = async (forceRefresh = false) => {
    // Don't fetch if we've already loaded and not forcing refresh
    if (!forceRefresh && hasLoadedRef.current && tripsLoading === false) {
      return;
    }

    setTripsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/trips");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch trips");
      }

      setTrips(data.trips || []);
    } catch (err) {
      console.error("Error fetching trips:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load trips"
      );
    } finally {
      setTripsLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      return;
    }

    setDeletingTripId(tripId);
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete trip");
      }

      // Refresh trips list (force refresh)
      await fetchTrips(true);
    } catch (err) {
      console.error("Error deleting trip:", err);
      alert(err instanceof Error ? err.message : "Failed to delete trip");
    } finally {
      setDeletingTripId(null);
      setShowMenuTripId(null);
    }
  };

  const handleEditTrip = (tripId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/trips/${tripId}/edit`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "private":
        return <Lock className="w-3 h-3" />;
      case "friends-only":
        return <Users className="w-3 h-3" />;
      case "public":
        return <Sparkles className="w-3 h-3" />;
      default:
        return <Lock className="w-3 h-3" />;
    }
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case "private":
        return "Private";
      case "friends-only":
        return "Friends Only";
      case "public":
        return "Public";
      default:
        return "Private";
    }
  };

  const getTripStatus = (trip: Trip) => {
    if (!trip.start_date) return null;
    const startDate = new Date(trip.start_date);
    if (isFuture(startDate)) return "upcoming";
    if (isPast(startDate)) return "past";
    return "current";
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return null;
    try {
      const startDate = format(new Date(start), "MMM d, yyyy");
      if (end) {
        const endDate = format(new Date(end), "MMM d, yyyy");
        return `${startDate} - ${endDate}`;
      }
      return startDate;
    } catch {
      return null;
    }
  };

  // Only show full-page loading screen on initial load when we don't have user data yet
  if ((loading || !initialized) && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const upcomingTrips = trips.filter((trip) => getTripStatus(trip) === "upcoming");
  const pastTrips = trips.filter((trip) => getTripStatus(trip) === "past" || getTripStatus(trip) === null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back!
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationIcon />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Create Trip Button */}
        <div className="mb-8 flex justify-end">
          <button
            onClick={() => router.push("/trips/new")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <Sparkles className="w-5 h-5" />
            Create New Trip
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {tripsLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading trips...</p>
            </div>
          </div>
        ) : trips.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No trips yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create your first adventure to get started
              </p>
              <button
                onClick={() => router.push("/trips/new")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                <Sparkles className="w-5 h-5" />
                Create New Trip
              </button>
            </div>
          </div>
        ) : (
          /* Trips List */
          <div className="space-y-8">
            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Upcoming Trips
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group relative"
                    >
                      {/* Cover Photo */}
                      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-500">
                        <Link href={`/trips/${trip.id}`} className="block w-full h-full">
                          {trip.cover_photo_url ? (
                            <img
                              src={trip.cover_photo_url}
                              alt={trip.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error("Error loading cover image for trip:", trip.id, trip.cover_photo_url);
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-white/50" />
                            </div>
                          )}
                        </Link>
                        {/* Privacy Badge */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs">
                          {getPrivacyIcon(trip.privacy)}
                          <span>{getPrivacyLabel(trip.privacy)}</span>
                        </div>
                        {/* Edit/Delete Menu (Owner Only) */}
                        {trip.owner_id === user?.id && (
                          <div className="absolute top-3 left-3">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowMenuTripId(showMenuTripId === trip.id ? null : trip.id);
                                }}
                                className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {showMenuTripId === trip.id && (
                                <div className="absolute left-0 top-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[120px] z-10">
                                  <button
                                    onClick={(e) => handleEditTrip(trip.id, e)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteTrip(trip.id, e)}
                                    disabled={deletingTripId === trip.id}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {deletingTripId === trip.id ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <Link href={`/trips/${trip.id}`}>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {trip.title}
                          </h3>
                        </Link>
                        {trip.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {trip.description}
                          </p>
                        )}
                        {trip.start_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
                          </div>
                        )}

                        {/* Members */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center -space-x-2">
                            {trip.members.slice(0, 4).map((member, idx) => (
                              <div
                                key={member.id}
                                className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-medium"
                                title={member.full_name || "Member"}
                              >
                                {member.avatar_url ? (
                                  <img
                                    src={member.avatar_url}
                                    alt={member.full_name || "Member"}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {(member.full_name || "U")[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                            ))}
                            {trip.member_count > 4 && (
                              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xs font-medium">
                                +{trip.member_count - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Trips */}
            {pastTrips.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Past Trips
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group opacity-75 relative"
                    >
                      {/* Cover Photo */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-400 to-gray-600">
                        <Link href={`/trips/${trip.id}`} className="block w-full h-full">
                          {trip.cover_photo_url ? (
                            <img
                              src={trip.cover_photo_url}
                              alt={trip.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-white/50" />
                            </div>
                          )}
                        </Link>
                        {/* Privacy Badge */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs">
                          {getPrivacyIcon(trip.privacy)}
                          <span>{getPrivacyLabel(trip.privacy)}</span>
                        </div>
                        {/* Edit/Delete Menu (Owner Only) */}
                        {trip.owner_id === user?.id && (
                          <div className="absolute top-3 left-3">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowMenuTripId(showMenuTripId === trip.id ? null : trip.id);
                                }}
                                className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {showMenuTripId === trip.id && (
                                <div className="absolute left-0 top-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[120px] z-10">
                                  <button
                                    onClick={(e) => handleEditTrip(trip.id, e)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteTrip(trip.id, e)}
                                    disabled={deletingTripId === trip.id}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {deletingTripId === trip.id ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <Link href={`/trips/${trip.id}`}>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {trip.title}
                          </h3>
                        </Link>
                        {trip.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {trip.description}
                          </p>
                        )}
                        {trip.start_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
                          </div>
                        )}

                        {/* Members */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center -space-x-2">
                            {trip.members.slice(0, 4).map((member) => (
                              <div
                                key={member.id}
                                className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-medium"
                                title={member.full_name || "Member"}
                              >
                                {member.avatar_url ? (
                                  <img
                                    src={member.avatar_url}
                                    alt={member.full_name || "Member"}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {(member.full_name || "U")[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                            ))}
                            {trip.member_count > 4 && (
                              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xs font-medium">
                                +{trip.member_count - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
