-- RLS read policies (no insert/update/delete policies)
-- Design:
-- - Client is read-only
-- - Server uses service role for all writes
-- - RLS controls visibility for reads only

-- ============================================
-- profiles
-- ============================================

CREATE POLICY "read own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- ============================================
-- trips
-- ============================================

CREATE POLICY "read trips if member, owner, or public"
  ON public.trips
  FOR SELECT
  USING (
    privacy = 'public'
    OR owner_id = auth.uid()
    OR public.is_trip_member(id)
  );

-- ============================================
-- trip_members
-- ============================================

-- Keep this intentionally simple to avoid recursion:
-- - members can always read their own membership rows
-- - owners can read all membership rows for trips they own
CREATE POLICY "read own membership or owned trip memberships"
  ON public.trip_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_members.trip_id
        AND t.owner_id = auth.uid()
    )
  );

-- ============================================
-- trip_sections
-- ============================================

CREATE POLICY "read sections if trip member"
  ON public.trip_sections
  FOR SELECT
  USING (public.is_trip_member(trip_id));

-- ============================================
-- trip_cards
-- ============================================

CREATE POLICY "read cards if trip member"
  ON public.trip_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.trip_sections ts
      WHERE ts.id = trip_cards.section_id
        AND public.is_trip_member(ts.trip_id)
    )
  );

-- ============================================
-- expenses
-- ============================================

CREATE POLICY "read expenses if trip member"
  ON public.expenses
  FOR SELECT
  USING (public.is_trip_member(trip_id));

-- ============================================
-- expense_splits
-- ============================================

CREATE POLICY "read expense splits if trip member"
  ON public.expense_splits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      WHERE e.id = expense_splits.expense_id
        AND public.is_trip_member(e.trip_id)
    )
  );

-- ============================================
-- comments
-- ============================================

CREATE POLICY "read comments if trip member"
  ON public.comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.trip_cards tc
      JOIN public.trip_sections ts ON ts.id = tc.section_id
      WHERE tc.id = comments.card_id
        AND public.is_trip_member(ts.trip_id)
    )
  );

-- ============================================
-- activities
-- ============================================

CREATE POLICY "read activities if trip member"
  ON public.activities
  FOR SELECT
  USING (public.is_trip_member(trip_id));

-- ============================================
-- invitation_tokens
-- ============================================

-- Intentionally public-readable (token acceptance flow is verified server-side).
CREATE POLICY "read invitation tokens"
  ON public.invitation_tokens
  FOR SELECT
  USING (true);

