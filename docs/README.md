# TravelNest Database Documentation

This directory contains comprehensive documentation for the TravelNest database schema.

## Files

### 📊 `DATABASE_ERD.md`
Complete Entity Relationship Diagram documentation with:
- Visual Mermaid diagram showing all tables and relationships
- Detailed table descriptions
- Relationship summaries
- Data flow examples
- Index and RLS policy information

### 🗄️ `database_schema.dbml`
Database Markup Language file for use with ERD visualization tools:
- Import into [dbdiagram.io](https://dbdiagram.io) for interactive ERD
- Compatible with other DBML tools
- Includes all tables, relationships, indexes, and constraints

### 📝 Migration File
The actual database schema is defined in:
- `../supabase/migrations/001_initial_schema.sql`

## Quick Reference

### Core Tables
- **`profiles`** - User profiles with preferences
- **`trips`** - Trip boards (main entity)
- **`trip_members`** - User-trip relationships with permissions
- **`trip_sections`** - Sections within trip boards (9 default types)
- **`trip_cards`** - Rich content cards within sections
- **`expenses`** - Expense entries
- **`expense_splits`** - Individual user portions of expenses
- **`comments`** - Comments on cards with @mentions
- **`activities`** - Activity feed for real-time updates

### Key Relationships
- Users → Trips (one-to-many as owner, many-to-many as member)
- Trips → Sections → Cards (hierarchical content structure)
- Trips → Expenses → Expense Splits (expense tracking)
- Cards → Comments (collaboration)

## Viewing the ERD

### Option 1: View in Markdown
Open `DATABASE_ERD.md` in any Markdown viewer that supports Mermaid diagrams (GitHub, VS Code with Mermaid extension, etc.)

### Option 2: Interactive ERD
1. Go to [dbdiagram.io](https://dbdiagram.io)
2. Click "Import" → "DBML File"
3. Upload `database_schema.dbml`
4. View and interact with the ERD

### Option 3: Generate Visual Diagram
Use the DBML file with tools like:
- [dbdiagram.io](https://dbdiagram.io) - Web-based
- [dbml-cli](https://github.com/holistics/dbml/tree/master/packages/dbml-cli) - Command line
- [dbdocs](https://dbdocs.io) - Documentation generator

## Database Features

### Row-Level Security (RLS)
All tables have RLS enabled with policies ensuring:
- Users can only access trips they're members of
- Editors can modify, Viewers can only read
- Trip owners have full control

### Real-time Support
Schema is designed for Supabase Realtime:
- All tables support real-time subscriptions
- Activity feed tracks all changes
- Optimistic UI updates supported

### Performance
- Strategic indexes on foreign keys and frequently queried fields
- Composite indexes for common query patterns
- JSONB fields for flexible metadata storage

## Next Steps

1. Review the ERD to understand relationships
2. Check the migration file for complete schema definition
3. Set up Supabase and run the migration
4. Refer to this documentation during development

