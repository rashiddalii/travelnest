-- Add INSERT and UPDATE policies for invitation_tokens
-- These are needed because the table has RLS enabled but only had SELECT policy

-- RLS Policy: Authenticated users can insert invitation tokens (when inviting)
-- This is done server-side by trip owners/editors, so we allow authenticated users
CREATE POLICY "Authenticated users can insert invitation tokens"
  ON invitation_tokens FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policy: System can update tokens (mark as used, etc.)
-- This is done server-side, so we allow authenticated users
CREATE POLICY "Authenticated users can update invitation tokens"
  ON invitation_tokens FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policy: Authenticated users can delete invitation tokens (when resending)
CREATE POLICY "Authenticated users can delete invitation tokens"
  ON invitation_tokens FOR DELETE
  USING (auth.uid() IS NOT NULL);
