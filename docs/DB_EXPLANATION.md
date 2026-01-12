# TravelNest Database Explanation

## Table of Contents
1. [Why Sections and Cards?](#why-sections-and-cards)
2. [Table-by-Table Explanation](#table-by-table-explanation)
3. [Visual ERD Diagram](#visual-erd-diagram)
4. [How It Works Together - Example](#how-it-works-together---example)
5. [Why This Design?](#why-this-design)

---

## Why Sections and Cards?

This is a **hierarchical content model** that separates structure from content:

```
TRIP (The Board)
  └── SECTION (Container/Category)
        └── CARD (Individual Content Item)
```

### Real-World Analogy

Think of it like a **book**:
- **Trip** = The entire book/document
- **Section** = Chapter titles (Overview, Itinerary, Budget, etc.)
- **Card** = Individual paragraphs/items within that chapter

Or like **Notion/Trello**:
- **Trip** = Board/Page
- **Section** = List/Container
- **Card** = Individual cards/blocks

### Why Separate Tables?

1. **Sections** = Fixed containers (9 default types) that organize the board
2. **Cards** = Flexible content items (text, images, links, maps, etc.) within sections
3. This separation allows:
   - **Reordering sections** (drag & drop entire sections)
   - **Reordering cards** within sections (drag & drop individual items)
   - **Different permissions** per section type
   - **Scalability** - you can have hundreds of cards per section without bloating the sections table

---

## Table-by-Table Explanation

### 1. `profiles`
- **Purpose:** Extended user profile with TravelNest-specific data
- **Stores:** Name, avatar, bio, travel preferences (JSONB), onboarding status
- **Why:** Supabase Auth only handles authentication. This table extends it with app-specific data
- **Key Fields:**
  - `preferences` (JSONB): Stores onboarding data like travel style, budget level, interests
  - `onboarding_completed`: Tracks if user finished the 30-second onboarding quiz

### 2. `trips`
- **Purpose:** The main trip board - the core entity
- **Stores:** Title, dates, cover photo, privacy settings, owner
- **Why:** Everything in TravelNest belongs to a trip. This is the top-level container
- **Key Fields:**
  - `slug`: Unique URL-friendly identifier (e.g., "paris-2024-dec")
  - `privacy`: Controls who can see the trip (private, friends-only, public)
  - `owner_id`: The user who created the trip
- **Example:** "Paris 2024", "Bali Adventure", "Tokyo Business Trip"

### 3. `trip_members`
- **Purpose:** Many-to-many relationship between users and trips with permissions
- **Stores:** User ID, trip ID, role (owner/editor/viewer), invite information
- **Why:** Multiple users can collaborate on one trip with different permission levels
- **Key Fields:**
  - `role`: Permission level (owner = full control, editor = can edit, viewer = read-only)
  - `invited_by`: Who invited this user
  - `joined_at`: When they accepted the invitation
- **Example:** User A creates trip, invites User B (editor) and User C (viewer)

### 4. `trip_sections`
- **Purpose:** Major containers/categories within a trip board
- **Stores:** Type (overview, itinerary, budget, etc.), title, position for drag & drop
- **Why:** Organizes content into logical groups. When you create a trip, 9 sections are auto-created
- **Key Fields:**
  - `type`: Predefined section types (overview, itinerary, budget, expenses, packing, documents, photos, notes, playlist)
  - `position`: Order of sections (enables drag & drop reordering)
  - `metadata`: Additional section-specific data (JSONB)
- **Example:** When you create a trip, these 9 sections are auto-created:
  1. Overview (dates, countdown, cover photo)
  2. Itinerary (day-by-day plan)
  3. Budget (planned vs spent)
  4. Expenses (expense tracker)
  5. Packing (packing list)
  6. Documents (PDFs, tickets, etc.)
  7. Photos (photo gallery)
  8. Notes (notes & letters)
  9. Playlist (Spotify/YouTube)

### 5. `trip_cards`
- **Purpose:** Individual content items within a section
- **Stores:** Type (text, image, link, pdf, map, etc.), content, metadata, position
- **Why:** Flexible content storage. Each card is ONE piece of content that users add
- **Key Fields:**
  - `type`: Content type (text, image, link, pdf, map, video, checklist, note)
  - `content`: Text content for text/note cards
  - `metadata`: JSONB field storing URLs, coordinates, checklist items, etc.
  - `position`: Order within section (enables drag & drop)
  - `created_by`: Who added this card
- **Examples:**
  - In **"Itinerary"** section:
    - Card 1: `type="text"`, `content="Day 1: Arrive in Paris"`
    - Card 2: `type="map"`, `metadata={lat: 48.8566, lng: 2.3522}` (Eiffel Tower location)
    - Card 3: `type="link"`, `metadata={url: "https://louvre.fr"}` (Louvre website)
  - In **"Photos"** section:
    - Card 1: `type="image"`, `metadata={url: "photo1.jpg"}`
    - Card 2: `type="image"`, `metadata={url: "photo2.jpg"}`
  - In **"Notes"** section:
    - Card 1: `type="note"`, `content="Remember to buy metro pass"`
    - Card 2: `type="note"`, `content="Best restaurant: Le Comptoir"`

### 6. `expenses`
- **Purpose:** Individual expense entries for a trip
- **Stores:** Amount, who paid, category, split type, receipt URL, date
- **Why:** Track all expenses for a trip. Separate from trip_cards because expenses have special logic (splitting, settlement)
- **Key Fields:**
  - `paid_by`: User who paid for this expense
  - `amount`: Expense amount
  - `currency`: Currency code (default: PKR)
  - `split_type`: How to split (equal, custom, percentage)
  - `receipt_url`: Link to uploaded receipt photo
  - `is_settled`: Whether expense has been fully paid
- **Example:** "Dinner at restaurant - $50, paid by John, split equally"

### 7. `expense_splits`
- **Purpose:** Who owes what for each expense
- **Stores:** User ID, expense ID, their share amount, settlement status
- **Why:** Calculate "You owe X" or "You are owed Y". One expense can be split among multiple users
- **Key Fields:**
  - `amount`: User's share of the expense
  - `percentage`: For percentage-based splits
  - `is_settled`: Whether this user has paid their share
- **Example:** Expense of $50 split equally between 2 users:
  - Split 1: `user_id="user-1"`, `amount=25`, `is_settled=false`
  - Split 2: `user_id="user-2"`, `amount=25`, `is_settled=false`

### 8. `comments`
- **Purpose:** Comments on trip cards with @mention support
- **Stores:** Comment text, card ID, user ID, mentioned user IDs
- **Why:** Enable discussion on specific content. Users can @mention others to notify them
- **Key Fields:**
  - `mentions`: Array of user IDs mentioned in the comment
  - `content`: Comment text
- **Example:** User comments on a card: "Great idea! @john what do you think?"

### 9. `activities`
- **Purpose:** Activity feed for real-time updates and notifications
- **Stores:** What happened, who did it, when, what entity was affected
- **Why:** Show "John added a card" or "Sarah added an expense" in real-time. Powers the live activity feed
- **Key Fields:**
  - `type`: Activity type (trip_created, member_added, card_added, expense_added, etc.)
  - `entity_type`, `entity_id`: Reference to the affected entity (card, expense, etc.)
  - `metadata`: Additional activity data (JSONB)
- **Example:** When user adds a card, activity record: `type="card_added"`, `entity_type="trip_card"`, `entity_id="card-123"`

---

## Visual ERD Diagram

Here's a visual representation of all the relationships:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAVELNEST DATABASE ERD                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐
│ auth.users  │
│ (Supabase)  │
└──────┬──────┘
       │ 1:1
       │
┌──────▼──────┐
│  profiles   │◄──────────────────────────────────┐
│             │                                    │
│ • id (PK)   │                                    │
│ • full_name │                                    │
│ • avatar    │                                    │
│ • prefs     │                                    │
└──────┬──────┘                                    │
       │                                           │
       │ 1:N                                       │
       │                                           │
┌──────▼──────────────┐                           │
│       trips         │                           │
│                     │                           │
│ • id (PK)           │                           │
│ • slug (unique)     │                           │
│ • title             │                           │
│ • dates             │                           │
│ • owner_id (FK)─────┘                           │
└──────┬──────────────┘                           │
       │                                           │
       │ 1:N                                       │
       │                                           │
       ├──────────────────────────────────────────┼──────────┐
       │                                          │          │
       │                                          │          │
┌──────▼──────────┐                    ┌─────────▼──────┐  │
│ trip_members    │                    │ trip_sections  │  │
│                 │                    │                │  │
│ • trip_id (FK)  │                    │ • trip_id (FK) │  │
│ • user_id (FK)──┼────────────────────┤ • type         │  │
│ • role          │                    │ • position     │  │
│ • invited_by    │                    └──────┬─────────┘  │
└─────────────────┘                           │            │
                                              │ 1:N        │
                                              │            │
                                    ┌─────────▼─────────┐  │
                                    │   trip_cards      │  │
                                    │                   │  │
                                    │ • section_id (FK) │  │
                                    │ • type            │  │
                                    │ • content         │  │
                                    │ • created_by (FK)─┼──┘
                                    └──────┬────────────┘
                                           │ 1:N
                                           │
                              ┌────────────▼──────────┐
                              │      comments         │
                              │                       │
                              │ • card_id (FK)        │
                              │ • user_id (FK)────────┼──┐
                              │ • mentions[]          │  │
                              └───────────────────────┘  │
                                                          │
┌─────────────────────────────────────────────────────────┼──┐
│                                                          │  │
│  ┌──────────────┐              ┌──────────────────┐    │  │
│  │   expenses    │              │  expense_splits  │    │  │
│  │               │              │                  │    │  │
│  │ • trip_id (FK)│──────1:N─────┤ • expense_id (FK)│    │  │
│  │ • paid_by (FK)┼──────────────┤ • user_id (FK)───┼────┘  │
│  │ • amount      │              │ • amount         │       │
│  │ • split_type  │              │ • is_settled     │       │
│  └──────────────┘              └──────────────────┘       │
│                                                              │
│  ┌──────────────┐                                           │
│  │  activities  │                                           │
│  │              │                                           │
│  │ • trip_id (FK)│                                           │
│  │ • user_id (FK)│                                           │
│  │ • type        │                                           │
│  │ • entity_id   │                                           │
│  └──────────────┘                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘

LEGEND:
─── = One-to-Many relationship
FK = Foreign Key
PK = Primary Key
```

### Relationship Summary

#### One-to-Many Relationships:
- `profiles` → `trips` (one user can own many trips)
- `trips` → `trip_members` (one trip has many members)
- `trips` → `trip_sections` (one trip has many sections)
- `trips` → `expenses` (one trip has many expenses)
- `trips` → `activities` (one trip has many activities)
- `trip_sections` → `trip_cards` (one section has many cards)
- `trip_cards` → `comments` (one card has many comments)
- `expenses` → `expense_splits` (one expense has many splits)
- `profiles` → `trip_cards` (one user creates many cards)
- `profiles` → `expenses` (one user pays for many expenses)
- `profiles` → `comments` (one user writes many comments)

#### Many-to-Many Relationships:
- `profiles` ↔ `trips` (via `trip_members` junction table)
  - One user can be a member of many trips
  - One trip can have many members
  - Junction table stores: role, invited_by, invited_at, joined_at

---

## How It Works Together - Example

Let's trace through what happens when you create a trip "Paris 2024":

### Step 1: Create Trip
**`trips` table** - One row created:
```sql
id: "abc-123"
title: "Paris 2024"
slug: "paris-2024"
owner_id: "user-1"
start_date: "2024-12-01"
end_date: "2024-12-07"
privacy: "friends-only"
```

### Step 2: Auto-Create Sections
**`trip_sections` table** - 9 rows auto-created:
```sql
Section 1: id="sec-1", trip_id="abc-123", type="overview", position=0
Section 2: id="sec-2", trip_id="abc-123", type="itinerary", position=1
Section 3: id="sec-3", trip_id="abc-123", type="budget", position=2
Section 4: id="sec-4", trip_id="abc-123", type="expenses", position=3
Section 5: id="sec-5", trip_id="abc-123", type="packing", position=4
Section 6: id="sec-6", trip_id="abc-123", type="documents", position=5
Section 7: id="sec-7", trip_id="abc-123", type="photos", position=6
Section 8: id="sec-8", trip_id="abc-123", type="notes", position=7
Section 9: id="sec-9", trip_id="abc-123", type="playlist", position=8
```

### Step 3: Add Trip Members
**`trip_members` table** - Owner automatically added, then invites friends:
```sql
Member 1: trip_id="abc-123", user_id="user-1", role="owner"
Member 2: trip_id="abc-123", user_id="user-2", role="editor", invited_by="user-1"
Member 3: trip_id="abc-123", user_id="user-3", role="viewer", invited_by="user-1"
```

### Step 4: Users Add Cards
**`trip_cards` table** - Cards added by users in different sections:

**In "Itinerary" section (sec-2):**
```sql
Card 1: section_id="sec-2", type="text", 
        content="Day 1: Arrive at CDG airport at 10 AM",
        position=0, created_by="user-1"

Card 2: section_id="sec-2", type="map", 
        metadata='{"lat": 48.8566, "lng": 2.3522, "name": "Eiffel Tower"}',
        position=1, created_by="user-2"

Card 3: section_id="sec-2", type="link", 
        metadata='{"url": "https://www.louvre.fr", "title": "Louvre Museum"}',
        position=2, created_by="user-1"
```

**In "Photos" section (sec-7):**
```sql
Card 1: section_id="sec-7", type="image", 
        metadata='{"url": "https://storage.../photo1.jpg", "caption": "Eiffel Tower"}',
        position=0, created_by="user-1"

Card 2: section_id="sec-7", type="image", 
        metadata='{"url": "https://storage.../photo2.jpg", "caption": "Louvre"}',
        position=1, created_by="user-2"
```

**In "Notes" section (sec-8):**
```sql
Card 1: section_id="sec-8", type="note", 
        content="Remember to buy metro pass at airport",
        position=0, created_by="user-1"

Card 2: section_id="sec-8", type="note", 
        content="Best restaurant: Le Comptoir du Relais",
        position=1, created_by="user-2"
```

### Step 5: Add Expenses
**`expenses` table** - Expenses added during trip:
```sql
Expense 1: trip_id="abc-123", paid_by="user-1", amount=50.00, 
          currency="EUR", category="food", 
          description="Dinner at restaurant", split_type="equal"

Expense 2: trip_id="abc-123", paid_by="user-2", amount=30.00, 
          currency="EUR", category="transport", 
          description="Metro passes", split_type="equal"
```

**`expense_splits` table** - Auto-calculated splits:
```sql
For Expense 1 (split equally between 3 users):
Split 1: expense_id="exp-1", user_id="user-1", amount=16.67, is_settled=false
Split 2: expense_id="exp-1", user_id="user-2", amount=16.67, is_settled=false
Split 3: expense_id="exp-1", user_id="user-3", amount=16.67, is_settled=false

For Expense 2 (split equally between 3 users):
Split 1: expense_id="exp-2", user_id="user-1", amount=10.00, is_settled=false
Split 2: expense_id="exp-2", user_id="user-2", amount=10.00, is_settled=true  (they paid)
Split 3: expense_id="exp-2", user_id="user-3", amount=10.00, is_settled=false
```

### Step 6: Add Comments
**`comments` table** - Users comment on cards:
```sql
Comment 1: card_id="card-1", user_id="user-2", 
           content="Great idea! @user-3 what do you think?",
           mentions=["user-3"]

Comment 2: card_id="card-2", user_id="user-3", 
           content="Love this location! Can't wait to visit.",
           mentions=[]
```

### Step 7: Activity Feed
**`activities` table** - Tracks all actions:
```sql
Activity 1: trip_id="abc-123", user_id="user-1", 
            type="trip_created", entity_type="trip", entity_id="abc-123"

Activity 2: trip_id="abc-123", user_id="user-1", 
            type="card_added", entity_type="trip_card", entity_id="card-1"

Activity 3: trip_id="abc-123", user_id="user-2", 
            type="card_added", entity_type="trip_card", entity_id="card-2"

Activity 4: trip_id="abc-123", user_id="user-1", 
            type="expense_added", entity_type="expense", entity_id="exp-1"
```

---

## Why This Design?

### 1. **Separation of Concerns**
- **Sections** handle structure/organization
- **Cards** handle content/flexibility
- This makes the code cleaner and easier to maintain

### 2. **Scalability**
- You can have **hundreds of cards** per section without bloating the sections table
- Each table is optimized for its specific purpose
- Indexes are strategically placed for common queries

### 3. **Flexibility**
- Easy to add new **card types** (e.g., "poll", "calendar event") without changing sections
- Easy to add new **section types** if needed
- JSONB metadata fields allow storing different data structures per card type

### 4. **User Experience**
- **Drag & drop sections** independently from cards
- **Drag & drop cards** within sections
- Different sections can have different UI/behavior (e.g., Expenses section shows calculator, Photos section shows gallery)

### 5. **Performance**
- Query sections separately from cards (faster page loads)
- Can lazy-load cards per section
- Indexes on `position` fields enable efficient ordering

### 6. **Real-time Collaboration**
- Sections and cards can be updated independently
- Real-time subscriptions can target specific sections
- Activity feed tracks changes at both levels

### 7. **Permission Management**
- RLS policies can control access at section level
- Different sections might have different permission rules (e.g., only editors can add expenses)

---

## Database Features

### Row-Level Security (RLS)
All tables have RLS enabled with policies ensuring:
- Users can only access trips they're members of
- Editors can modify, Viewers can only read
- Trip owners have full control
- Users can only modify their own comments

### Real-time Support
Schema is designed for Supabase Realtime:
- All tables support real-time subscriptions
- Activity feed tracks all changes
- Optimistic UI updates supported

### Performance Optimizations
- Strategic indexes on foreign keys and frequently queried fields
- Composite indexes for common query patterns (e.g., `(trip_id, position)`)
- JSONB fields for flexible metadata storage without schema changes

### Data Integrity
- Foreign key constraints with appropriate CASCADE rules
- Check constraints for data validation (e.g., privacy must be one of 3 values)
- Unique constraints prevent duplicates (e.g., one membership per user per trip)
- Triggers for automatic `updated_at` timestamps

---

## Common Queries

### Get all sections for a trip (ordered by position):
```sql
SELECT * FROM trip_sections 
WHERE trip_id = 'abc-123' 
ORDER BY position;
```

### Get all cards in a section (ordered by position):
```sql
SELECT * FROM trip_cards 
WHERE section_id = 'sec-2' 
ORDER BY position;
```

### Get all expenses for a trip with splits:
```sql
SELECT e.*, es.user_id, es.amount as split_amount, es.is_settled
FROM expenses e
LEFT JOIN expense_splits es ON e.id = es.expense_id
WHERE e.trip_id = 'abc-123'
ORDER BY e.date DESC;
```

### Get activity feed for a trip:
```sql
SELECT a.*, p.full_name, p.avatar_url
FROM activities a
LEFT JOIN profiles p ON a.user_id = p.id
WHERE a.trip_id = 'abc-123'
ORDER BY a.created_at DESC
LIMIT 50;
```

---

## Summary

The TravelNest database uses a **hierarchical structure** where:
- **Trips** are the top-level containers
- **Sections** organize content into logical groups (9 default types)
- **Cards** are flexible content items within sections (8+ types)
- **Expenses** and **Expense Splits** handle financial tracking
- **Comments** enable collaboration on cards
- **Activities** power the real-time activity feed

This design provides:
- ✅ Scalability (handle many cards per section)
- ✅ Flexibility (easy to add new content types)
- ✅ Performance (optimized queries with indexes)
- ✅ User Experience (drag & drop, real-time updates)
- ✅ Security (RLS policies on all tables)

The separation of **Sections** and **Cards** is the key architectural decision that makes the system flexible and scalable while maintaining clean organization.
