"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /settings to /settings/profile (default settings page).
 */
export default function SettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings/profile", { scroll: true });
  }, [router]);
  return null;
}
