"use client";

import { Navbar } from "@/components/layout/navbar";
import { ProfileSidebar } from "@/components/profile/profile-sidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="flex pt-14 lg:pt-0">
        <ProfileSidebar />
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pt-24 lg:pt-8 pb-6 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
