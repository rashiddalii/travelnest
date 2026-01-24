# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: TravelNest (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project" (takes 1-2 minutes)

## 2. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Update your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important:** `SUPABASE_SERVICE_ROLE_KEY` is **server-only**. Never expose it to the browser (do not prefix it with `NEXT_PUBLIC_`).

## 3. Disable Email Verification (For Development)

**Important**: For development, you can disable email verification to test faster.

1. Go to **Authentication** → **Providers** → **Email**
2. Under **Email Auth Settings**, toggle **"Enable email confirmations"** to **OFF**
3. Click **Save**

**Note**: Re-enable this in production for security!

## 4. Set Up Database Schema

### ✅ Required: Using Supabase CLI (Recommended + Enforced)

This project is **migration-driven**. Do not apply schema changes from the Supabase UI.

```bash
# From: travelnest-web/

# Supabase CLI (no global install required)
npx supabase --version

# Login + link your project (first time only)
npx supabase login
npx supabase link --project-ref your-project-ref

# Apply migrations to the linked database
npx supabase db push
```

### 🚫 Not allowed: Supabase SQL Editor / Studio for schema changes

If you make schema changes in the UI, your local migrations drift and the project becomes hard to maintain.

### Migration Structure (Source of Truth)

All schema lives in `travelnest-web/supabase/migrations/` and is intentionally split:
- `001_schema.sql` (tables only; includes `user_inbox` which replaces `notifications`)
- `002_triggers.sql` (auth + updated_at triggers)
- `003_indexes.sql`
- `004_rls_enable.sql`
- `005_rls_helpers.sql`
- `006_rls_read_policies.sql` (SELECT policies only)
- `007_rls_user_inbox.sql` (inbox SELECT/UPDATE only)
- `008_storage_buckets.sql` (storage buckets + RLS policies for avatars and trip-covers)

## 5. Verify Tables Were Created

1. Go to **Table Editor** in Supabase dashboard
2. You should see:
   - ✅ `profiles` table
3. Click on `profiles` to see its structure:
   - `id` (UUID, primary key, references auth.users)
   - `full_name` (text)
   - `avatar_url` (text)
   - `bio` (text)
   - `preferences` (JSONB)
   - `onboarding_completed` (boolean)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

## 6. Test Authentication

1. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```
2. Go to `http://localhost:3000/register`
3. Create an account
4. You should be able to log in immediately (if email verification is disabled)

## 7. Storage Buckets (Automated via Migrations)

Storage buckets are now created automatically via `008_storage_buckets.sql` migration.

**Buckets created:**
- `avatars` - User profile pictures (public, 5MB limit)
- `trip-covers` - Trip cover photos (public, 5MB limit)

**To apply storage setup:**
```bash
npx supabase db push
```

### Verify the Setup

1. Go to **Storage** in Supabase Dashboard
2. You should see both `avatars` and `trip-covers` buckets
3. Both should show as **"Public"**

### Troubleshooting

**"Bucket not found" error:**
- Run `npx supabase db push` to apply the storage migration
- Check that migration `008_storage_buckets.sql` exists

**"Permission denied" when uploading:**
- Verify the RLS policies were created (check Storage → Policies tab)
- Make sure you're logged in when testing

**Images not loading:**
- Check that the SELECT policy exists
- Verify the bucket is set to "Public"
- Check the image URL format: `https://YOUR_PROJECT.supabase.co/storage/v1/object/public/trip-covers/...`

## 8. Enable Google OAuth (Optional)

If you see this error when clicking “Continue with Google”:

```json
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

it means **Google OAuth is not enabled for the Supabase project your app is currently using**.

### Hosted Supabase (recommended)

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Google** and click **Enable**
3. Add:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)
4. In **Google Cloud Console**, set the authorized redirect URI to:
   - `https://your-project-id.supabase.co/auth/v1/callback`
5. In Supabase **Authentication** → **URL Configuration**, make sure these are allow-listed:
   - `http://localhost:3000/auth/callback` (local dev)
   - `https://your-domain.com/auth/callback` (production)
6. Save and test again.

### Local Supabase (Supabase CLI)

Local auth providers are configured in `travelnest-web/supabase/config.toml`.

- Google is enabled via:
  - `[auth.external.google] enabled = true`
  - `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`
  - `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"`
- Add these env vars to your local Supabase environment (do **not** commit secrets):
  - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
  - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`
- Restart local Supabase after changes.

## Troubleshooting

### "Email not verified" error

**Solution**: Disable email verification in Supabase settings (step 3 above)

### "Invalid supabaseUrl" error

**Solution**: Make sure your `.env.local` has the correct values (step 2)

### Google OAuth: “Unsupported provider: provider is not enabled”

**Solution**:
- Confirm **Google** is enabled in the Supabase project you’re using (Dashboard → Authentication → Providers).
- Double-check your app is pointing at the same project (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

### Tables not showing up

**Solution**: 
1. Check SQL Editor for any errors
2. Make sure you ran the migration in the correct database
3. Refresh the Table Editor page

### RLS (Row Level Security) errors

**Solution**: The migration includes RLS policies. If you see permission errors:
1. Go to **Authentication** → **Policies**
2. Check that policies exist for the `profiles` table
3. If not, re-run the migration

## Next Steps

After setup is complete:
- ✅ Authentication should work
- ✅ User profiles will be auto-created on signup
- ✅ Ready for TICKET 0.2 (Onboarding Quiz)

