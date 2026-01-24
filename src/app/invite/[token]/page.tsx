"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle, XCircle, Clock } from "lucide-react";

export default function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, initialized } = useAuthStore();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<{
    tripTitle: string;
    inviterName: string;
    role: string;
    email: string;
    isNewUser: boolean;
  } | null>(null);

  useEffect(() => {
    // Unwrap params Promise
    const unwrapParams = async () => {
      if (params instanceof Promise) {
        const resolved = await params;
        setToken(resolved.token);
      } else {
        setToken(params.token);
      }
    };
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!token) return;

    const fetchInvitation = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/invitations/verify/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Invalid or expired invitation");
        }

        setInvitationData(data);
      } catch (err) {
        console.error("Error fetching invitation:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load invitation"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  // Handle redirects based on auth state
  useEffect(() => {
    if (!initialized || authLoading || !invitationData) return;

    const isNewUser = searchParams.get("signup") === "true" || invitationData.isNewUser;

    if (!user) {
      // Not logged in
      if (isNewUser) {
        // New user: redirect to signup with token
        router.push(`/register?invite=${token}`);
      } else {
        // Existing user: redirect to login with token
        router.push(`/login?invite=${token}`);
      }
      return;
    }

    // User is logged in - check if they need onboarding or if they're a new user
    if (user) {
      // For new users, create membership record first
      if (invitationData?.isNewUser) {
        fetch("/api/invitations/complete-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
          .then((res) => res.json())
          .catch(() => {
            // Continue even if this fails
          });
      }

      // Check onboarding status and redirect accordingly
      fetch("/api/profile/preferences")
        .then((res) => res.json())
        .then((data) => {
          if (!data.onboarding_completed) {
            router.push(`/onboarding?invite=${token}`);
          } else {
            // Onboarding complete - redirect to invitations page
            router.push(`/invitations?token=${token}`);
          }
        })
        .catch(() => {
          // If check fails, go to invitations page
          router.push(`/invitations?token=${token}`);
        });
    }
  }, [user, authLoading, initialized, invitationData, token, router, searchParams]);

  if (loading || authLoading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show invitation preview while redirecting
  if (invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              You're Invited!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {invitationData.inviterName} invited you to join
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              "{invitationData.tripTitle}"
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <Clock className="w-4 h-4" />
              <span>Redirecting...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
