import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAdminClient() {
  if (!supabaseUrl || supabaseUrl === "your_supabase_url") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Please set it in your .env.local file."
    );
  }

  if (!supabaseServiceRoleKey || supabaseServiceRoleKey === "your_service_role_key") {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Please set it in your .env.local file."
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

