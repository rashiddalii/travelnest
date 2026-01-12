import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { AuthState } from "@/types/auth";

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  loading: true,
  initialized: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set(initialState),
}));

