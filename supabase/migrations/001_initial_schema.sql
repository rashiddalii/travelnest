-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profiles
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- TRIPS & COLLABORATION TABLES
-- ============================================

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  start_date DATE,
  end_date DATE,
  privacy TEXT DEFAULT 'private' CHECK (privacy IN ('private', 'friends-only', 'public')),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Trip members (many-to-many: users ↔ trips with permissions)
CREATE TABLE IF NOT EXISTS trip_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- Enable RLS on trip_members
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;

-- Trip sections (itinerary, budget, expenses, packing, etc.)
CREATE TABLE IF NOT EXISTS trip_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('overview', 'itinerary', 'budget', 'expenses', 'packing', 'documents', 'photos', 'notes', 'playlist')),
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on trip_sections
ALTER TABLE trip_sections ENABLE ROW LEVEL SECURITY;

-- Trip cards (rich cards within sections: text, images, links, PDFs, map locations)
CREATE TABLE IF NOT EXISTS trip_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES trip_sections(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'link', 'pdf', 'map', 'video', 'checklist', 'note')),
  title TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- stores: url, file_url, coordinates, checklist items, etc.
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on trip_cards
ALTER TABLE trip_cards ENABLE ROW LEVEL SECURITY;

-- ============================================
-- EXPENSE TRACKING TABLES
-- ============================================

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  paid_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'PKR',
  description TEXT,
  category TEXT, -- food, transport, accommodation, activity, other
  split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'percentage')),
  receipt_url TEXT,
  date DATE DEFAULT CURRENT_DATE,
  is_settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Expense splits (who owes what for each expense)
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  percentage DECIMAL(5, 2), -- for percentage-based splits
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

-- Enable RLS on expense_splits
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COLLABORATION & ACTIVITY TABLES
-- ============================================

-- Comments on cards with @mentions
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES trip_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT ARRAY[]::UUID[], -- array of user IDs mentioned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Activity feed (live activity feed entries)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('trip_created', 'member_added', 'member_removed', 'card_added', 'card_updated', 'card_deleted', 'expense_added', 'expense_settled', 'comment_added', 'section_reordered')),
  entity_type TEXT, -- 'trip', 'card', 'expense', 'comment', etc.
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Trips indexes
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_slug ON trips(slug);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(start_date, end_date);

-- Trip members indexes
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members(user_id);

-- Trip sections indexes
CREATE INDEX IF NOT EXISTS idx_trip_sections_trip_id ON trip_sections(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_sections_position ON trip_sections(trip_id, position);

-- Trip cards indexes
CREATE INDEX IF NOT EXISTS idx_trip_cards_section_id ON trip_cards(section_id);
CREATE INDEX IF NOT EXISTS idx_trip_cards_position ON trip_cards(section_id, position);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Expense splits indexes
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_card_id ON comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_trip_id ON activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(trip_id, created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Trips: Users can view trips they're members of
CREATE POLICY "Users can view trips they're members of"
  ON trips FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Trips: Only owners can create trips
CREATE POLICY "Users can create trips"
  ON trips FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Trips: Owners and editors can update trips
CREATE POLICY "Owners and editors can update trips"
  ON trips FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role IN ('owner', 'editor')
    )
  );

-- Trips: Only owners can delete trips
CREATE POLICY "Only owners can delete trips"
  ON trips FOR DELETE
  USING (owner_id = auth.uid());

-- Trip members: Users can view members of trips they're in
CREATE POLICY "Users can view trip members"
  ON trip_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
    )
  );

-- Trip members: Owners and editors can add members
CREATE POLICY "Owners and editors can add members"
  ON trip_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_members.trip_id
      AND (
        trips.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members tm
          WHERE tm.trip_id = trips.id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Trip sections: Members can view sections
CREATE POLICY "Members can view trip sections"
  ON trip_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_sections.trip_id
      AND (
        trips.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = trips.id
          AND trip_members.user_id = auth.uid()
        )
      )
    )
  );

-- Trip sections: Editors can modify sections
CREATE POLICY "Editors can modify trip sections"
  ON trip_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_sections.trip_id
      AND (
        trips.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = trips.id
          AND trip_members.user_id = auth.uid()
          AND trip_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Trip cards: Members can view cards
CREATE POLICY "Members can view trip cards"
  ON trip_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_sections ts
      JOIN trips t ON t.id = ts.trip_id
      WHERE ts.id = trip_cards.section_id
      AND (
        t.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = t.id
          AND trip_members.user_id = auth.uid()
        )
      )
    )
  );

-- Trip cards: Editors can modify cards
CREATE POLICY "Editors can modify trip cards"
  ON trip_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trip_sections ts
      JOIN trips t ON t.id = ts.trip_id
      WHERE ts.id = trip_cards.section_id
      AND (
        t.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = t.id
          AND trip_members.user_id = auth.uid()
          AND trip_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Expenses: Members can view expenses
CREATE POLICY "Members can view expenses"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = expenses.trip_id
      AND (
        trips.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = trips.id
          AND trip_members.user_id = auth.uid()
        )
      )
    )
  );

-- Expenses: Editors can modify expenses
CREATE POLICY "Editors can modify expenses"
  ON expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = expenses.trip_id
      AND (
        trips.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = trips.id
          AND trip_members.user_id = auth.uid()
          AND trip_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Expense splits: Members can view splits
CREATE POLICY "Members can view expense splits"
  ON expense_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN trips t ON t.id = e.trip_id
      WHERE e.id = expense_splits.expense_id
      AND (
        t.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = t.id
          AND trip_members.user_id = auth.uid()
        )
      )
    )
  );

-- Expense splits: Editors can modify splits
CREATE POLICY "Editors can modify expense splits"
  ON expense_splits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN trips t ON t.id = e.trip_id
      WHERE e.id = expense_splits.expense_id
      AND (
        t.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = t.id
          AND trip_members.user_id = auth.uid()
          AND trip_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Comments: Members can view comments
CREATE POLICY "Members can view comments"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_cards tc
      JOIN trip_sections ts ON ts.id = tc.section_id
      JOIN trips t ON t.id = ts.trip_id
      WHERE tc.id = comments.card_id
      AND (
        t.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = t.id
          AND trip_members.user_id = auth.uid()
        )
      )
    )
  );

-- Comments: Members can add comments
CREATE POLICY "Members can add comments"
  ON comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM trip_cards tc
      JOIN trip_sections ts ON ts.id = tc.section_id
      JOIN trips t ON t.id = ts.trip_id
      WHERE tc.id = comments.card_id
      AND (
        t.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = t.id
          AND trip_members.user_id = auth.uid()
        )
      )
    )
  );

-- Comments: Users can update/delete their own comments
CREATE POLICY "Users can modify own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());

-- Activities: Members can view activities
CREATE POLICY "Members can view activities"
  ON activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = activities.trip_id
      AND (
        trips.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_members.trip_id = trips.id
          AND trip_members.user_id = auth.uid()
        )
      )
    )
  );

-- Activities: System can create activities (via service role)
CREATE POLICY "System can create activities"
  ON activities FOR INSERT
  WITH CHECK (true);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Add updated_at triggers to all tables that need them
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_trip_sections_updated_at
  BEFORE UPDATE ON trip_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_trip_cards_updated_at
  BEFORE UPDATE ON trip_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

