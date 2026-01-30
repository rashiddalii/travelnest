"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { useConfirm } from "@/hooks/use-confirm";
import { Bell, ArrowLeft, Settings } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityFeed, type ActivityNotification } from "@/components/notifications/activity-feed";

/** Dummy activity data for UI verification (no backend). */
function getDummyActivity(): ActivityNotification[] {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  return [
    {
      id: "dummy-1",
      type: "trip_invite",
      trip_id: "trip-1",
      inviter_id: "user-1",
      message: "Alex Chen invited you to join Paris 2024",
      read: false,
      status: "pending",
      metadata: {},
      created_at: twoHoursAgo.toISOString(),
      trip: { id: "trip-1", title: "Paris 2024", cover_photo_url: null },
      inviter: { id: "user-1", full_name: "Alex Chen", avatar_url: null },
    },
    {
      id: "dummy-2",
      type: "trip_update",
      trip_id: "trip-2",
      inviter_id: "user-2",
      message: "Sam added a new card to the Itinerary section in Bali Trip",
      read: false,
      metadata: {},
      created_at: thirtyMinsAgo.toISOString(),
      trip: { id: "trip-2", title: "Bali Trip", cover_photo_url: null },
      inviter: { id: "user-2", full_name: "Sam Rivera", avatar_url: null },
    },
    {
      id: "dummy-3",
      type: "expense_added",
      trip_id: "trip-2",
      inviter_id: "user-2",
      message: "Sam added an expense (€45) to Bali Trip",
      read: true,
      metadata: {},
      created_at: yesterday.toISOString(),
      trip: { id: "trip-2", title: "Bali Trip", cover_photo_url: null },
      inviter: { id: "user-2", full_name: "Sam Rivera", avatar_url: null },
    },
    {
      id: "dummy-4",
      type: "trip_invite",
      trip_id: "trip-3",
      inviter_id: "user-3",
      message: "Jordan Lee invited you to join Tokyo Adventure",
      read: true,
      status: "accepted",
      metadata: {},
      created_at: threeDaysAgo.toISOString(),
      trip: { id: "trip-3", title: "Tokyo Adventure", cover_photo_url: null },
      inviter: { id: "user-3", full_name: "Jordan Lee", avatar_url: null },
    },
    {
      id: "dummy-5",
      type: "mention",
      trip_id: "trip-1",
      inviter_id: "user-1",
      message: "Alex mentioned you in a comment on Paris 2024",
      read: false,
      metadata: {},
      created_at: threeDaysAgo.toISOString(),
      trip: { id: "trip-1", title: "Paris 2024", cover_photo_url: null },
      inviter: { id: "user-1", full_name: "Alex Chen", avatar_url: null },
    },
    {
      id: "dummy-6",
      type: "system",
      trip_id: null,
      inviter_id: null,
      message: "Welcome to TravelNest! Create your first trip to get started.",
      read: true,
      metadata: {},
      created_at: tenDaysAgo.toISOString(),
      trip: null,
      inviter: null,
    },
  ];
}

function ActivityCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, initialized } = useAuthStore();
  const toast = useToast();
  const { confirm } = useConfirm();
  const hasLoadedRef = useRef(false);
  const tokenFromUrl = searchParams.get("token");

  const [activity, setActivity] = useState<ActivityNotification[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && initialized && !user) {
      router.push("/login");
      return;
    }
    if (user && !hasLoadedRef.current && initialized && !authLoading) {
      hasLoadedRef.current = true;
      setActivity(getDummyActivity());
      if (tokenFromUrl) {
        handleAcceptFromToken(tokenFromUrl).then(() => {
          router.replace("/activity", { scroll: false });
        });
      }
    }
  }, [user, initialized, authLoading, tokenFromUrl, router]);

  const handleAcceptFromToken = async (token: string) => {
    try {
      const res = await fetch("/api/invitations/accept-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept invitation");
      if (data.trip_id) router.push(`/trips/${data.trip_id}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation");
    }
  };

  const handleMarkAsRead = (id: string) => {
    setActivity((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleAcceptInvite = (n: ActivityNotification) => {
    setProcessingId(n.id);
    setActivity((prev) => prev.filter((item) => item.id !== n.id));
    toast.success("Invitation accepted! (Demo – no backend)");
    setProcessingId(null);
  };

  const handleRejectInvite = (n: ActivityNotification) => {
    setActivity((prev) => prev.filter((item) => item.id !== n.id));
    toast.success("Invitation rejected (Demo – no backend)");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Activity
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Invites, board updates, and mentions
                </p>
              </div>
            </div>
            <Link
              href="/settings/notifications"
              className="btn-modern inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              Notification settings
            </Link>
          </div>
        </div>

        <div className="glass-card-strong rounded-xl shadow-lg overflow-hidden">
          <ActivityFeed
            activity={activity}
            processingId={processingId}
            onMarkAsRead={handleMarkAsRead}
            onAcceptInvite={handleAcceptInvite}
            onRejectInvite={handleRejectInvite}
            onConfirmReject={confirm}
            emptyMessage="No activity yet"
            emptySubtext="Trip invites, board updates and mentions will show here."
          />
        </div>
      </div>
    </div>
  );
}

export default function ActivityCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-2xl w-full px-4">
            <Skeleton className="h-8 w-40 mb-6" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      }
    >
      <ActivityCenterContent />
    </Suspense>
  );
}
