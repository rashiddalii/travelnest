-- ============================================
-- Storage Buckets Setup
-- ============================================
-- Creates avatars and trip-covers buckets with RLS policies

-- 1. Create avatars bucket (for user profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- public bucket (avatars are publicly accessible)
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Create trip-covers bucket (for trip cover photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-covers',
  'trip-covers',
  true,  -- public bucket (trip covers are publicly accessible)
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- Storage Policies (RLS for Storage)
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload trip covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update trip covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete trip covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view trip covers" ON storage.objects;

-- Avatars bucket policies
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Trip-covers bucket policies
-- Allow authenticated users to upload trip covers
CREATE POLICY "Authenticated users can upload trip covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trip-covers');

-- Allow authenticated users to update trip covers
CREATE POLICY "Authenticated users can update trip covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'trip-covers');

-- Allow authenticated users to delete trip covers
CREATE POLICY "Authenticated users can delete trip covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'trip-covers');

-- Allow public read access to trip covers
CREATE POLICY "Anyone can view trip covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trip-covers');
