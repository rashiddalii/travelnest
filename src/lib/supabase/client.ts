import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

export function createClient() {
  return createBrowserClient(url, key);
}

