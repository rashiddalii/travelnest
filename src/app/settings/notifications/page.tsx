"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";

function NotificationsContent() {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();
  const toast = useToast();
  const hasLoadedRef = useRef(false);

  const [notifTripInvitations, setNotifTripInvitations] = useState(true);
  const [notifBoardUpdates, setNotifBoardUpdates] = useState(true);
  const [notifNewPhotos, setNotifNewPhotos] = useState(true);
  const [notifNotes, setNotifNotes] = useState(true);
  const [notifExpenses, setNotifExpenses] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    if (initialized && !loading && !user) router.push("/login");
  }, [user, loading, initialized, router]);

  useEffect(() => {
    if (user) hasLoadedRef.current = true;
  }, [user]);

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      toast.success("Notification settings saved.");
    } finally {
      setNotifSaving(false);
    }
  };

  const items = [
    {
      key: "trip_invitations",
      label: "Trip invitations",
      desc: "When someone invites you to a trip",
      value: notifTripInvitations,
      set: setNotifTripInvitations,
    },
    {
      key: "board_updates",
      label: "Board updates",
      desc: "Changes to trip boards you're in",
      value: notifBoardUpdates,
      set: setNotifBoardUpdates,
    },
    {
      key: "new_photos",
      label: "New photos",
      desc: "When photos are added to a trip",
      value: notifNewPhotos,
      set: setNotifNewPhotos,
    },
    {
      key: "notes",
      label: "Notes",
      desc: "When someone adds or mentions you in notes",
      value: notifNotes,
      set: setNotifNotes,
    },
    {
      key: "expenses",
      label: "Expenses",
      desc: "Expense updates on shared trips",
      value: notifExpenses,
      set: setNotifExpenses,
    },
    {
      key: "marketing",
      label: "Marketing emails",
      desc: "Tips, offers and product updates",
      value: notifMarketing,
      set: setNotifMarketing,
    },
  ];

  if (!initialized || (loading && !hasLoadedRef.current) || !user) {
    return (
      <div className="max-w-2xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Notification settings
        </h1>
        <Link
          href="/activity"
          className="btn-modern inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          View activity
        </Link>
      </div>

      <div className="glass-card-strong rounded-xl shadow-lg p-6">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Notifications
        </h2>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 gap-4"
            >
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white block">
                  {item.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.desc}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={item.value}
                onClick={() => item.set(!item.value)}
                className={`shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer ${item.value ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
              >
                <span
                  className={`block w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${item.value ? "translate-x-6" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white block">
                Push notifications
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Receive push on this device
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifPush}
              onClick={() => setNotifPush(!notifPush)}
              className={`shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer ${notifPush ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <span
                className={`block w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${notifPush ? "translate-x-6" : "translate-x-0.5"}`}
              />
            </button>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={handleSaveNotifications}
            disabled={notifSaving}
            className="btn-modern px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {notifSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}
