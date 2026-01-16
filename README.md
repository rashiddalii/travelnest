# TravelNest

Your lifelong digital home for every trip — where travellers plan with AI, travel with friends, track every expense, and preserve every memory.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([sign up here](https://supabase.com))

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Follow the detailed guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - Create a Supabase project
   - Run the database migrations
   - Get your API keys

3. **Configure environment variables:**
   ```bash
   # Copy .env.local and add your credentials
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   
   # Email service - To be implemented later
   # For now, invitation emails are logged to console
   
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)**

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/       # Auth routes (login, register)
│   ├── api/          # API routes
│   ├── dashboard/    # Dashboard page
│   └── trips/        # Trip pages
├── components/       # React components
├── lib/             # Utilities and configurations
│   ├── supabase/    # Supabase client setup
│   └── store/       # Zustand stores
├── hooks/           # Custom React hooks
├── types/           # TypeScript types
└── styles/          # Global styles
```

## 🗄️ Database Setup

The database schema is in `supabase/migrations/001_initial_schema.sql`.

**To set up:**
1. Go to your Supabase dashboard
2. Open SQL Editor
3. Run the migration file

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

## ✅ Completed Features

### Phase 0 - Auth & Onboarding ✅
- ✅ **TICKET 0.1** - Authentication with Supabase
  - Magic Link login
  - Google OAuth
  - Email + Password
  - Protected routes
  - Auth state management
- ✅ **TICKET 0.2** - 30-Second Onboarding Quiz
- ✅ **TICKET 0.3** - Dashboard (My Trips Home Screen)
- ✅ **TICKET 0.4** - Create Trip + 9 Default Sections

### Phase 1 - Trip Board Foundation ✅
- ✅ **TICKET 1.1** - Section View & Navigation
- ✅ **TICKET 1.2** - Add Cards to Sections (text, image, link, map, pdf, video, audio)
- ✅ **TICKET 1.3** - Edit & Delete Cards
- ✅ **TICKET 1.4** - Drag & Drop Section Reordering

### Phase 2 - Collaboration Features (IN PROGRESS)
- ✅ **TICKET 2.1** - Invite Members (by email, role selection, remove members)
- ✅ **TICKET 2.2** - Invitation Notifications System (navbar icon, real-time notifications)
- ✅ **TICKET 2.3** - Invitations Page (accept/reject invitations)
- ✅ **TICKET 2.4** - Dashboard: Show Trips Only After Acceptance
- 📋 **TICKET 2.5** - Real-time Updates (live editing, no refresh needed)
- 📋 **TICKET 2.6** - Permission Management UI (change member roles)

### Next Up
- 📋 **Phase 3** - Social & Activity Features (@Mentions, Activity Feed, Auto-add Photos)
- 📋 **Phase 4** - Expense Tracker
- 📋 **Phase 5** - AI Trip Planner


## 🛠️ Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Supabase** - Database, Auth, Storage
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Lucide React** - Icons

## 📚 Documentation

- [Next Steps Roadmap](./docs/NEXT_STEPS.md) - Detailed development roadmap with all tickets
- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Complete Supabase configuration
- [TravelNest Core Rules](.cursor/rules/travelnest-core.mdc) - Project specifications
- [Next.js Rules](.cursor/rules/nextjs-rules.mdc) - Code conventions
- [Workflow Rules](.cursor/rules/workflow.mdc) - Development workflow and phase tracking

## 🐛 Troubleshooting

### "Email not verified" error
**Solution**: Disable email verification in Supabase settings for development. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md#3-disable-email-verification-for-development)

### "Invalid supabaseUrl" error
**Solution**: Make sure your `.env.local` file has the correct Supabase credentials.

### Database tables not showing
**Solution**: Run the migration SQL in Supabase SQL Editor. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md#4-set-up-database-schema)

## 📝 License

Private project - All rights reserved
