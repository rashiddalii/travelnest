-- Add invitation tokens table for secure invitation links
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for pending invitations (one pending per trip/email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitation_tokens_pending_unique 
ON invitation_tokens(trip_id, email) 
WHERE used_at IS NULL;

-- Enable RLS on invitation_tokens
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view tokens (for accepting invitations)
CREATE POLICY "Users can view invitation tokens"
  ON invitation_tokens FOR SELECT
  USING (true);

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

-- Add status column to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'revoked'));

-- Update existing notifications to have 'pending' status if they're unread and trip_invite type
UPDATE notifications 
SET status = 'pending' 
WHERE status IS NULL 
  AND type = 'trip_invite' 
  AND read = false;

-- Update accepted/rejected notifications
UPDATE notifications n
SET status = CASE 
  WHEN EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = n.trip_id
    AND tm.user_id = n.user_id
    AND tm.joined_at IS NOT NULL
  ) THEN 'accepted'
  WHEN NOT EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = n.trip_id
    AND tm.user_id = n.user_id
  ) AND n.type = 'trip_invite' THEN 'rejected'
  ELSE 'pending'
END
WHERE n.type = 'trip_invite' AND n.status = 'pending';

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_trip_id ON invitation_tokens(trip_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
