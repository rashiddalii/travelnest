import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, redirect based on onboarding status
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    const onboardingCompleted = profile?.onboarding_completed ?? false;

    if (!onboardingCompleted) {
      redirect("/onboarding");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="max-w-4xl w-full text-center">
        <div className="flex flex-col items-center mb-4">
          <img
            src="/logo-icon.png"
            alt="TravelNest"
            className="h-32 w-auto mb-4"
          />
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
            Welcome to TravelNest
          </h1>
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Your lifelong digital home for every trip. Plan with AI, travel with
          friends, track expenses, and preserve memories.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 cursor-pointer"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
