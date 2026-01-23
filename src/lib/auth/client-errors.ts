export function toUserFriendlyAuthError(rawMessage: string) {
  const message = rawMessage.trim();
  const lower = message.toLowerCase();

  if (lower.includes("provider is not enabled")) {
    return "Google sign-in isn’t enabled for this Supabase project. Enable Google in Supabase (Authentication → Providers), set the Client ID/Secret, and try again.";
  }

  if (lower.includes("redirect") && lower.includes("not allowed")) {
    return "This redirect URL isn’t allow-listed in Supabase Auth settings. Add your app URL (and `/auth/callback`) to the allowed redirect URLs, then try again.";
  }

  return message;
}

