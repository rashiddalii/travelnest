# Supabase Storage Setup for Trip Covers

This guide will help you set up the Supabase Storage bucket for trip cover images.

## Quick Setup (5 minutes)

### 1. Create the Bucket

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your TravelNest project
3. Click **"Storage"** in the left sidebar
4. Click **"New bucket"** button (top right)
5. Configure:
   ```
   Name: trip-covers
   Public bucket: ✅ ON
   File size limit: 5242880 (5 MB)
   Allowed MIME types: (leave empty or add: image/jpeg,image/png,image/webp)
   ```
6. Click **"Create bucket"**

### 2. Add Storage Policies

Go to **SQL Editor** and run this:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload trip covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trip-covers');

-- Allow public to view (so images load in browser)
CREATE POLICY "Anyone can view trip covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trip-covers');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own trip covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trip-covers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Test It

1. Go to your app: `http://localhost:3000/trips/new`
2. Try uploading an image
3. If it works, you're all set! ✅

## Detailed Explanation

### Why "Public" Bucket?

- Images need to be accessible via URL to display in the browser
- Public bucket generates public URLs automatically
- The SELECT policy controls who can view (we allow everyone)

### File Path Structure

Images are stored as:
```
trip-covers/
  └── {user_id}/
      └── {timestamp}.{ext}
```

Example: `trip-covers/abc-123-user-id/1699123456789.jpg`

This structure:
- Organizes files by user
- Prevents filename conflicts
- Makes it easy to find/delete user uploads

### Security Notes

- ✅ Only authenticated users can upload (INSERT policy)
- ✅ Anyone can view images (needed for public display)
- ✅ Users can only delete their own files (folder matches user ID)
- ⚠️ Consider adding UPDATE policy if you want users to replace images

## Alternative: Private Bucket

If you want more control, you can use a private bucket and generate signed URLs:

1. Create bucket as **Private**
2. Use this policy instead:
```sql
-- Only authenticated users can upload
CREATE POLICY "Authenticated users can upload trip covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trip-covers');

-- Only authenticated users can view
CREATE POLICY "Authenticated users can view trip covers"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'trip-covers');
```

Then in your code, generate signed URLs:
```typescript
const { data } = supabase.storage
  .from('trip-covers')
  .createSignedUrl(filePath, 3600); // 1 hour expiry
```

But for trip covers, public bucket is simpler and recommended.

## Troubleshooting

### Error: "Bucket not found"
- Check bucket name is exactly `trip-covers`
- Verify bucket exists in Storage dashboard

### Error: "new row violates row-level security policy"
- Make sure you ran the INSERT policy SQL
- Check you're logged in when uploading

### Images not displaying
- Verify bucket is set to "Public"
- Check SELECT policy exists
- Inspect browser console for CORS errors
- Verify image URL format

### Upload fails silently
- Check browser console for errors
- Verify file size is under 5MB
- Check file type is an image
- Ensure user is authenticated

## Next Steps

Once storage is set up:
- ✅ Users can upload cover photos when creating trips
- ✅ Users can upload cover photos when editing trips
- ✅ Images will be publicly accessible via URL
- ✅ Images are organized by user ID
