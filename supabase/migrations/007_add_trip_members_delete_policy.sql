-- Add DELETE policy for trip_members
-- Only trip owners can delete members

-- Create a function to check if user can delete members (is owner)
CREATE OR REPLACE FUNCTION can_delete_trip_member(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is owner
  RETURN EXISTS (
    SELECT 1 FROM trips
    WHERE id = p_trip_id AND owner_id = p_user_id
  );
END;
$$;

-- Create DELETE policy for trip_members
-- Only trip owners can delete members
CREATE POLICY "Only owners can delete trip members"
  ON trip_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_members.trip_id
      AND trips.owner_id = auth.uid()
    )
  );
