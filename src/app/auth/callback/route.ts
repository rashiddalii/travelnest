import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Check onboarding status and redirect accordingly
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      const onboardingCompleted = profile?.onboarding_completed ?? false;

      if (next) {
        // If there's a specific redirect, use it
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      } else if (!onboardingCompleted) {
        return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
      } else {
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      }
    }
  }

  // Fallback redirect
  return NextResponse.redirect(new URL(next || "/dashboard", requestUrl.origin));
}

