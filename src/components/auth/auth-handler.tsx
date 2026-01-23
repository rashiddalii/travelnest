"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth-store";

export function AuthHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setLoading, setInitialized } = useAuthStore();

  useEffect(() => {
    // Check if Supabase is configured
    let supabase;
    try {
      supabase = createClient();
    } catch (error) {
      // If Supabase is not configured, just mark as initialized without user
      console.warn("Supabase not configured:", error);
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle sign out - set loading briefly for smooth transition
      if (event === "SIGNED_OUT") {
        setLoading(true);
        setUser(null);
        
        // Redirect to login if on protected page
        if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/trips") || pathname?.startsWith("/onboarding")) {
          router.push("/login");
          router.refresh();
        }
        
        // Small delay to ensure redirect starts before setting loading to false
        setTimeout(() => {
          setLoading(false);
        }, 100);
        return;
      }

      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);

      // Handle redirects after auth events
      if (session?.user) {
        // If user just logged in and is on auth page, check onboarding status
        if (pathname === "/login" || pathname === "/register") {
          // Check if onboarding is completed
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .single();

          if (!profile?.onboarding_completed) {
            router.push("/onboarding");
          } else {
            router.push("/dashboard");
          }
          router.refresh();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, setUser, setLoading, setInitialized]);

  return null;
}

