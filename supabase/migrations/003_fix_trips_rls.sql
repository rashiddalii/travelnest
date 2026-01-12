-- Fix infinite recursion in trips RLS policies
-- The trips policy checks trip_members, which causes recursion when trip_members policy checks trips

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view trips they're members of" ON trips;

-- We can reuse the is_trip_member function we created earlier
-- If it doesn't exist, create it
CREATE OR REPLACE FUNCTION is_trip_member(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is owner
  IF EXISTS (
    SELECT 1 FROM trips
    WHERE id = p_trip_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a member (bypass RLS by using SECURITY DEFINER)
  RETURN EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
END;
$$;

-- Create new policy using the function to avoid recursion
CREATE POLICY "Users can view trips they're members of"
  ON trips FOR SELECT
  USING (
    -- User is the owner (direct check, no recursion)
    owner_id = auth.uid() OR
    -- User is a member (checked via SECURITY DEFINER function to avoid recursion)
    is_trip_member(trips.id, auth.uid())
  );
