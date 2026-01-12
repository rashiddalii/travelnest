-- Fix infinite recursion in trip_members RLS policies
-- The issue: Policy checks trip_members by querying trip_members again, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view trip members" ON trip_members;

-- Create a SECURITY DEFINER function to check membership without RLS recursion
-- This function bypasses RLS when checking membership
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
CREATE POLICY "Users can view trip members"
  ON trip_members FOR SELECT
  USING (
    -- User can always see their own membership record
    user_id = auth.uid() OR
    -- User is the owner of the trip
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_members.trip_id
      AND trips.owner_id = auth.uid()
    ) OR
    -- User is a member (checked via function to avoid recursion)
    is_trip_member(trip_members.trip_id, auth.uid())
  );

-- Also fix the INSERT policy if it has similar recursion issues
-- The INSERT policy checks trip_members which might cause recursion
DROP POLICY IF EXISTS "Owners and editors can add members" ON trip_members;

-- Create a function to check if user can add members (is owner or editor)
CREATE OR REPLACE FUNCTION can_add_trip_member(p_trip_id UUID, p_user_id UUID)
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
  
  -- Check if user is an editor or owner member (bypass RLS)
  RETURN EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id 
    AND user_id = p_user_id
    AND role IN ('owner', 'editor')
  );
END;
$$;

-- Create new INSERT policy using the function
CREATE POLICY "Owners and editors can add members"
  ON trip_members FOR INSERT
  WITH CHECK (
    can_add_trip_member(trip_members.trip_id, auth.uid())
  );
