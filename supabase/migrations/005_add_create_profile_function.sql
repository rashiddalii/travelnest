-- Function to get user profile (bypasses RLS for invitations)
-- This function allows reading profiles even when RLS would normally block it
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid UUID)
RETURNS TABLE(id UUID, full_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return the profile (bypasses RLS due to SECURITY DEFINER)
  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = user_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;

-- Also add an RLS policy to allow reading profiles for trip members
-- This allows users to see profiles of people in their trips
CREATE POLICY "Users can view profiles of trip members"
  ON profiles FOR SELECT
  USING (
    -- User can always see their own profile
    id = auth.uid() OR
    -- User can see profiles of people who are in trips with them
    EXISTS (
      SELECT 1 FROM trip_members tm1
      INNER JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
      WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = profiles.id
    ) OR
    -- User can see profiles of people in trips they own
    EXISTS (
      SELECT 1 FROM trips t
      INNER JOIN trip_members tm ON t.id = tm.trip_id
      WHERE t.owner_id = auth.uid()
      AND tm.user_id = profiles.id
    )
  );
