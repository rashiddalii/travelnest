-- Allow users to delete their own pending membership (when rejecting invitations)
-- This is needed so users can remove themselves from trip_members when they reject an invitation

-- Add additional DELETE policy: Users can delete their own membership if they haven't joined yet
CREATE POLICY "Users can delete own pending membership"
  ON trip_members FOR DELETE
  USING (
    -- User can delete their own membership if joined_at is null (pending invitation)
    user_id = auth.uid() 
    AND joined_at IS NULL
  );
