import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createClient() {
  if (!supabaseUrl || supabaseUrl === "your_supabase_url") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Please set it in your .env.local file."
    );
  }

  if (!supabaseAnonKey || supabaseAnonKey === "your_anon_key") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Please set it in your .env.local file."
    );
  }

  // TypeScript assertion: we know these are strings after the checks above
  const url: string = supabaseUrl;
  const key: string = supabaseAnonKey;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

