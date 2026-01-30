"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * Redirect /profile and /profile/* to /settings/profile and /settings/*.
 * e.g. /profile -> /settings/profile, /profile/preferences -> /settings/preferences
 */
export default function ProfileRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const slug = params.slug as string[] | undefined;
    const subpath = Array.isArray(slug) && slug.length > 0 ? slug.join("/") : "profile";
    const newPath = `/settings/${subpath}`;
    router.replace(newPath, { scroll: true });
  }, [router, params.slug]);

  return null;
}
