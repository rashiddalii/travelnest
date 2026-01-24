"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NotificationIconProps {
  className?: string;
}

export function NotificationIcon({ className }: NotificationIconProps) {
  const router = useRouter();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications?unreadOnly=true");
      const data = await response.json();

      if (response.ok) {
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Set up real-time subscription for notifications
    // RLS will automatically filter to user's notifications
    const channel = supabase
      .channel(`user-inbox-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_inbox",
        },
        () => {
          // Refresh count when notifications change
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleClick = () => {
    router.push("/invitations");
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${className}`}
      title="Notifications"
    >
      <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      {!loading && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
