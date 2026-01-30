"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  User,
  Sliders,
  Lock,
  Shield,
  Bell,
  Settings,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { PROFILE_SIDEBAR_ITEMS, type ProfileSection } from "@/app/settings/constants";

const SECTION_ICONS: Record<ProfileSection, React.ComponentType<{ className?: string }>> = {
  profile: User,
  preferences: Sliders,
  security: Lock,
  privacy: Shield,
  notifications: Bell,
  account: Settings,
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/settings/profile") return pathname === "/settings/profile" || pathname === "/settings/profile/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function ProfileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNav = (href: string) => {
    setDrawerOpen(false);
    router.push(href);
  };

  const navContent = (
    <nav className="flex flex-col gap-0.5 py-2">
      {PROFILE_SIDEBAR_ITEMS.map((item) => {
        const Icon = SECTION_ICONS[item.id];
        const active = isActive(pathname ?? "", item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={(e) => {
              if (window.innerWidth < 1024) {
                e.preventDefault();
                handleNav(item.href);
              }
            }}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
              active
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile: menu button to open drawer */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="btn-modern flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          Settings & privacy
        </button>
      </div>

      {/* Mobile: drawer overlay */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside
            className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[min(320px,85vw)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl flex flex-col animate-in slide-in-from-left duration-200"
            role="dialog"
            aria-label="Settings menu"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{navContent}</div>
          </aside>
        </>
      )}

      {/* Desktop: persistent sidebar - flush under navbar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:border-r lg:border-gray-200 dark:lg:border-gray-700 lg:bg-white/50 dark:lg:bg-gray-800/50 lg:pt-4 lg:pb-6 lg:pr-4">
        <h2 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Settings
        </h2>
        {navContent}
      </aside>
    </>
  );
}
