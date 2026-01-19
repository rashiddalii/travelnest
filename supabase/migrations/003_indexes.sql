-- TravelNest indexes only

-- Trips
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON public.trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_slug ON public.trips(slug);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON public.trips(start_date, end_date);

-- Trip members
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON public.trip_members(user_id);

-- Trip sections
CREATE INDEX IF NOT EXISTS idx_trip_sections_trip_id ON public.trip_sections(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_sections_position ON public.trip_sections(trip_id, position);

-- Trip cards
CREATE INDEX IF NOT EXISTS idx_trip_cards_section_id ON public.trip_cards(section_id);
CREATE INDEX IF NOT EXISTS idx_trip_cards_position ON public.trip_cards(section_id, position);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- Expense splits
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON public.expense_splits(user_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_card_id ON public.comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Activities
CREATE INDEX IF NOT EXISTS idx_activities_trip_id ON public.activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(trip_id, created_at DESC);

-- Invitation tokens
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitation_tokens_pending_unique
ON public.invitation_tokens(trip_id, email)
WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON public.invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON public.invitation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_trip_id ON public.invitation_tokens(trip_id);

-- User inbox
CREATE INDEX IF NOT EXISTS idx_user_inbox_user_id ON public.user_inbox(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inbox_unread ON public.user_inbox(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_inbox_created_at ON public.user_inbox(user_id, created_at DESC);

