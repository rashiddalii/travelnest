import type { User } from "@supabase/supabase-js";

export interface AuthUser extends User {}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

