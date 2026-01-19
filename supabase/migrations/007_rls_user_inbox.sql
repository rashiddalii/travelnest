-- RLS policies for user_inbox (read/update only)

CREATE POLICY "read own inbox"
  ON public.user_inbox
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "update own inbox"
  ON public.user_inbox
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

