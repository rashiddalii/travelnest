-- RLS helper(s)

-- One helper, read-only, non-mutating.
-- IMPORTANT: do NOT reference public.trips here (to avoid policy recursion).
CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_members
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
      AND joined_at IS NOT NULL
  );
$$;

