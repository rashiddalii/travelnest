"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Redirect /invitations to /activity (activity center).
 * Preserves ?token= for invite acceptance flow.
 */
function InvitationsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const url = token ? `/activity?token=${encodeURIComponent(token)}` : "/activity";
    router.replace(url, { scroll: true });
  }, [router, searchParams]);

  return null;
}

export default function InvitationsRedirect() {
  return (
    <Suspense fallback={null}>
      <InvitationsRedirectContent />
    </Suspense>
  );
}
