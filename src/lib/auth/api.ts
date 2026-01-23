import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  user: User;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
}

export function jsonError(message: string, status = 400, code?: string) {
  const body: ApiErrorResponse = { error: message };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  // Pragmatic validation (not fully RFC compliant).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function logAuthFailure(event: string, details: Record<string, unknown>) {
  // Never log secrets (passwords, tokens).
  console.warn(`[AUTH] ${event}`, {
    ...details,
    timestamp: new Date().toISOString(),
  });
}

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { error: jsonError("Not authenticated", 401) };

  return { supabase, user };
}

