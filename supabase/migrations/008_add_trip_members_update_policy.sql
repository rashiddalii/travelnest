-- Add UPDATE policy for trip_members
-- Users can update their own membership record (specifically to set joined_at when accepting invitations)

CREATE POLICY "Users can update own membership"
  ON trip_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
