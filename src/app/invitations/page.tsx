"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  Calendar,
  User,
  Check,
  X,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Invitation {
  id: string;
  type: string;
  trip_id: string;
  inviter_id: string;
  message: string;
  read: boolean;
  status?: "pending" | "accepted" | "rejected" | "expired" | "revoked";
  metadata: Record<string, any>;
  created_at: string;
  trip: {
    id: string;
    title: string;
    cover_photo_url: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;
  inviter: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

function InvitationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, initialized } = useAuthStore();
  const supabase = createClient();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const tokenFromUrl = searchParams.get("token");

  useEffect(() => {
    // Only redirect if auth is done loading and no user
    if (!authLoading && initialized && !user) {
      router.push("/login");
      return;
    }

    // Only fetch once when we have user and haven't loaded yet
    if (user && !hasLoadedRef.current && initialized && !authLoading) {
      hasLoadedRef.current = true;
      
      // If there's a token in URL, accept it first
      if (tokenFromUrl) {
        handleAcceptFromToken(tokenFromUrl).then(() => {
          fetchInvitations();
          markAllAsRead();
          // Remove token from URL
          router.replace("/invitations", { scroll: false });
        });
      } else {
        fetchInvitations();
        markAllAsRead();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initialized, authLoading, tokenFromUrl]);

  const handleAcceptFromToken = async (token: string) => {
    try {
      const response = await fetch("/api/invitations/accept-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      // Redirect to the trip
      if (data.trip_id) {
        router.push(`/trips/${data.trip_id}`);
      }
    } catch (err) {
      console.error("Error accepting invitation from token:", err);
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
    }
  };

  // Set up real-time subscription for new invitations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`invitations-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_inbox",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh invitations when new one arrives
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchInvitations = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch invitations");
      }

      // Filter to only show trip_invite notifications
      const tripInvites = (data.notifications || []).filter(
        (n: Invitation) => n.type === "trip_invite" && n.trip_id
      );

      // Check which invitations are still pending (joined_at is null and status is pending)
      const invitationsWithStatus = await Promise.all(
        tripInvites.map(async (invite: Invitation) => {
          const { data: membership } = await supabase
            .from("trip_members")
            .select("joined_at")
            .eq("trip_id", invite.trip_id)
            .eq("user_id", user.id)
            .maybeSingle();

          // Determine status
          let status = invite.status || "pending";
          if (membership?.joined_at) {
            status = "accepted";
          } else if (invite.status === "rejected" || invite.status === "revoked" || invite.status === "expired") {
            status = invite.status;
          }

          // Only show pending invitations in the main list
          // But we'll show all with their status
          return { ...invite, status };
        })
      );

      // Filter to show: pending, or all if user wants to see history
      // For now, show only pending
      setInvitations(
        invitationsWithStatus.filter(
          (inv) => inv.status === "pending"
        ) as Invitation[]
      );
    } catch (err) {
      console.error("Error fetching invitations:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load invitations"
      );
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      // Mark all unread trip_invite notifications as read
      const response = await fetch("/api/notifications");
      const data = await response.json();

      if (response.ok && data.notifications) {
        const unreadInvites = data.notifications.filter(
          (n: Invitation) => n.type === "trip_invite" && !n.read
        );

        // Mark each as read
        await Promise.all(
          unreadInvites.map((invite: Invitation) =>
            fetch(`/api/notifications/${invite.id}/read`, {
              method: "PUT",
            })
          )
        );
      }
    } catch (err) {
      console.error("Error marking notifications as read:", err);
      // Don't show error to user, just log it
    }
  };

  const handleAccept = async (invitation: Invitation) => {
    if (!invitation.trip_id) return;

    setProcessingId(invitation.id);
    try {
      const response = await fetch(
        `/api/invitations/${invitation.id}/accept`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      // Update notification status to accepted
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitation.id ? { ...inv, status: "accepted" as const } : inv
        ).filter((inv) => inv.status === "pending") // Remove accepted from list
      );

      // Navigate to the trip
      router.push(`/trips/${invitation.trip_id}`);
    } catch (err) {
      console.error("Error accepting invitation:", err);
      alert(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invitation: Invitation) => {
    if (!invitation.trip_id) return;

    if (
      !confirm(
        "Are you sure you want to reject this invitation? This action cannot be undone."
      )
    ) {
      return;
    }

    setProcessingId(invitation.id);
    try {
      const response = await fetch(
        `/api/invitations/${invitation.id}/reject`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reject invitation");
      }

      // Update notification status to rejected and remove from list
      setInvitations((prev) =>
        prev.filter((inv) => inv.id !== invitation.id)
      );
    } catch (err) {
      console.error("Error rejecting invitation:", err);
      alert(
        err instanceof Error ? err.message : "Failed to reject invitation"
      );
    } finally {
      setProcessingId(null);
    }
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

  // Only show loading screen on initial load when we don't have user data yet
  if ((authLoading || loading) && !user && invitations.length === 0) {
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

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Trip Invitations
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Accept or reject invitations to join trips
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && invitations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading invitations...
              </p>
            </div>
          </div>
        ) : invitations.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No pending invitations
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You don't have any pending trip invitations at the moment.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                <Sparkles className="w-5 h-5" />
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* Invitations List */
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Cover Photo */}
                  <div className="shrink-0">
                    {invitation.trip?.cover_photo_url ? (
                      <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden">
                        <img
                          src={invitation.trip.cover_photo_url}
                          alt={invitation.trip.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full md:w-48 h-48 rounded-lg bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {invitation.trip?.title || "Untitled Trip"}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {invitation.message}
                      </p>

                      {/* Trip Details */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {invitation.inviter && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>
                              Invited by{" "}
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {invitation.inviter.full_name || "Someone"}
                              </span>
                            </span>
                          </div>
                        )}
                        {invitation.trip?.start_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {formatDateRange(
                                invitation.trip.start_date,
                                invitation.trip.end_date
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => handleAccept(invitation)}
                        disabled={processingId === invitation.id}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-5 h-5" />
                        {processingId === invitation.id ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        onClick={() => handleReject(invitation)}
                        disabled={processingId === invitation.id}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <InvitationsPageContent />
    </Suspense>
  );
}
