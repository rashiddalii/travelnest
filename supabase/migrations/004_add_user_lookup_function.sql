-- Function to get user ID by email
-- This function allows looking up users from auth.users table
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Query auth.users table (requires SECURITY DEFINER)
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = LOWER(TRIM(user_email))
  LIMIT 1;
  
  RETURN user_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;
