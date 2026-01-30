"use client";

import Link from "next/link";
import Image from "next/image";
import type { ConfirmModalOptions } from "@/lib/store/modal-store";
import {
  UserPlus,
  LayoutGrid,
  DollarSign,
  AtSign,
  Info,
  Check,
  X,
  ChevronRight,
  Bell,
} from "lucide-react";
import { format, isToday, isYesterday, startOfWeek, isWithinInterval } from "date-fns";

export interface ActivityNotification {
  id: string;
  type: "trip_invite" | "mention" | "trip_update" | "expense_added" | "system";
  trip_id: string | null;
  inviter_id: string | null;
  message: string;
  read: boolean;
  status?: "pending" | "accepted" | "rejected" | "expired" | "revoked";
  metadata: Record<string, unknown>;
  created_at: string;
  trip: {
    id: string;
    title: string;
    cover_photo_url: string | null;
  } | null;
  inviter: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

type TimeGroupKey = "today" | "yesterday" | "this_week" | "earlier";

function formatRelativeTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24 && isToday(date)) return `${diffHours}h`;
  if (isYesterday(date)) return "Yesterday";
  if (diffDays < 7) return format(date, "EEE");
  if (diffDays < 30) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}

function getTimeGroup(createdAt: string): TimeGroupKey {
  const date = new Date(createdAt);
  const now = new Date();
  if (isToday(date)) return "today";
  if (isYesterday(date)) return "yesterday";
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  if (isWithinInterval(date, { start: weekStart, end: now })) return "this_week";
  return "earlier";
}

function groupNotificationsByTime(
  notifications: ActivityNotification[]
): Record<TimeGroupKey, ActivityNotification[]> {
  const groups: Record<TimeGroupKey, ActivityNotification[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    earlier: [],
  };
  for (const n of notifications) {
    const key = getTimeGroup(n.created_at);
    groups[key].push(n);
  }
  return groups;
}

const TIME_GROUP_LABELS: Record<TimeGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  earlier: "Earlier",
};

const NOTIFICATION_ICONS: Record<
  ActivityNotification["type"],
  { icon: typeof Bell; label: string; bgClass: string }
> = {
  trip_invite: {
    icon: UserPlus,
    label: "Invitation",
    bgClass: "bg-blue-500",
  },
  trip_update: {
    icon: LayoutGrid,
    label: "Board update",
    bgClass: "bg-violet-500",
  },
  expense_added: {
    icon: DollarSign,
    label: "Expense",
    bgClass: "bg-emerald-500",
  },
  mention: {
    icon: AtSign,
    label: "Mention",
    bgClass: "bg-amber-500",
  },
  system: {
    icon: Info,
    label: "System",
    bgClass: "bg-gray-500",
  },
};

export interface ActivityFeedProps {
  activity: ActivityNotification[];
  processingId: string | null;
  onMarkAsRead?: (id: string) => void;
  onAcceptInvite?: (n: ActivityNotification) => void;
  onRejectInvite?: (n: ActivityNotification) => void;
  onConfirmReject?: (options: ConfirmModalOptions) => Promise<boolean>;
  emptyMessage?: string;
  emptySubtext?: string;
}

export function ActivityFeed({
  activity,
  processingId,
  onMarkAsRead,
  onAcceptInvite,
  onRejectInvite,
  onConfirmReject,
  emptyMessage = "No activity yet",
  emptySubtext = "Trip invites, board updates and mentions will show here.",
}: ActivityFeedProps) {
  const grouped = groupNotificationsByTime(activity);
  const hasActivity = activity.length > 0;
  const order: TimeGroupKey[] = ["today", "yesterday", "this_week", "earlier"];

  if (!hasActivity) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <Bell className="w-7 h-7 text-white" />
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {emptyMessage}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {emptySubtext}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {order.map((key) => {
        const list = grouped[key];
        if (list.length === 0) return null;
        return (
          <div key={key}>
            <div className="px-4 py-2 bg-gray-50/80 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {TIME_GROUP_LABELS[key]}
            </div>
            {list.map((n) => {
              const config = NOTIFICATION_ICONS[n.type];
              const Icon = config.icon;
              const isInvite = n.type === "trip_invite";
              const isPendingInvite =
                isInvite &&
                (n.status === "pending" || !n.status) &&
                n.trip_id;

              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors ${
                    !n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center">
                    {n.inviter?.avatar_url ? (
                      <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <Image
                          src={n.inviter.avatar_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      </div>
                    ) : n.trip?.cover_photo_url ? (
                      <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <Image
                          src={n.trip.cover_photo_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center ${config.bgClass}`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 grow">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {n.message}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(n.created_at)}
                      </span>
                      {n.trip && n.trip_id && (
                        <Link
                          href={`/trips/${n.trip_id}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {n.trip.title}
                        </Link>
                      )}
                    </div>
                    {isPendingInvite && onAcceptInvite && onRejectInvite && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onAcceptInvite(n)}
                          disabled={processingId === n.id}
                          className="btn-modern inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (onConfirmReject) {
                              const ok = await onConfirmReject({
                                title: "Reject invitation",
                                message: "Are you sure? This cannot be undone.",
                                confirmLabel: "Reject",
                                variant: "warning" as const,
                              });
                              if (ok) onRejectInvite(n);
                            } else {
                              onRejectInvite(n);
                            }
                          }}
                          disabled={processingId === n.id}
                          className="btn-modern inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                    {((isInvite && n.status === "accepted" && n.trip_id) ||
                      (!isInvite && n.trip_id)) && (
                      <div className="mt-2 flex items-center gap-2">
                        <Link
                          href={`/trips/${n.trip_id}`}
                          className="btn-modern inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium cursor-pointer"
                        >
                          View trip
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        {!isInvite && !n.read && onMarkAsRead && (
                          <button
                            type="button"
                            onClick={() => onMarkAsRead(n.id)}
                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
