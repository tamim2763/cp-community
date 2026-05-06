# CP Community Web App

A comprehensive competitive programming community platform built with modern web technologies. Features real-time leaderboards, achievement tracking, resource management, and integration with major competitive programming platforms.

## Features

- **User Authentication & Authorization**
  - Credentials-based login and registration
  - Email verification system
  - Password reset functionality
  - Role-based access control (USER, ADMIN, SUPER_ADMIN)
  - First-time user onboarding tutorial

- **CP Platform Integration**
  - Multi-platform support (Codeforces, CodeChef, AtCoder)
  - Automatic submission syncing
  - Profile verification system
  - Manual solve entry capability

- **Leaderboard & Rankings**
  - Weekly scoring system
  - Daily statistics tracking
  - Tier-based achievements
  - Admin exclusion from rankings

- **Achievement System**
  - Expandable achievement details
  - Achievement approval workflow
  - User achievement tracking
  - Achievement categories

- **Content Management**
  - Resource library
  - Job postings
  - Contest aggregation and calendar integration
  - Motivational profiles
  - Announcements system

- **Community Features**
  - Real-time chat with public/private rooms
  - Chat room moderation
  - User feedback collection
  - Prize payout tracking

- **Admin Dashboard**
  - User management
  - Achievement administration
  - Resource and job management
  - Contest visibility control
  - Scoring configuration
  - Analytics and statistics

- **Performance & UX**
  - Server-side caching for public content
  - Google Drive video embeds for tutorials
  - Responsive design
  - Dark/light theme support
  - Timezone-aware scheduling (Asia/Dhaka)

## Tech Stack

- **Frontend**: React 19, Next.js 15 (App Router)
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (Beta)
- **Styling**: CSS with design tokens
- **Type Safety**: TypeScript
- **Validation**: Zod
- **Security**: bcryptjs for password hashing, environment variables for secrets

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd cp-community-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration (see `.env.example`):
   ```env
   # Database
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/cp_community?schema=public"
   DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/cp_community"
   
   # Authentication
   NEXTAUTH_SECRET="generate-a-random-secret"
   NEXTAUTH_URL="http://localhost:3000"
  GOOGLE_CLIENT_ID="your-google-client-id"
  GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

4. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

6. **Seed initial data (optional)**
   ```bash
   npm run seed
   ```


7. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Create and apply migrations
npm run prisma:push      # Push schema changes (non-production)
npm run prisma:studio    # Open Prisma Studio UI

# Seeding & Utilities
npm run seed             # Seed database with initial data
npm run contests:backfill # Backfill contest visibility
```

## Project Structure

```
├── app/                        # Next.js App Router
│   ├── actions/               # Server actions
│   ├── api/                   # API routes
│   ├── admin/                 # Admin dashboard
│   ├── achievements/          # Achievement pages
│   ├── chat/                  # Chat pages
│   ├── contests/              # Contest pages
│   ├── dashboard/             # User dashboard
│   ├── leaderboard/           # Leaderboard page
│   ├── login/                 # Login page
│   ├── register/              # Registration page
│   ├── resources/             # Resources page
│   └── how-to/                # Tutorial pages
├── components/                 # Reusable React components
│   ├── ui/                    # Shared UI components
│   ├── admin/                 # Admin-specific components
│   └── chat/                  # Chat components
├── lib/                        # Utility functions
│   ├── validations/           # Zod schemas
│   ├── scoring/               # Scoring logic
│   ├── contests/              # Contest utilities
│   └── api/                   # API client helpers
├── prisma/                     # Database
│   ├── schema.prisma          # Data model
│   ├── seed.ts                # Seeding script
│   └── migrations/            # Migration history
├── scripts/                    # Utility scripts
├── server/                     # Server utilities
│   └── jobs/                  # Background job handlers
├── types/                      # TypeScript type definitions
├── public/                     # Static assets
└── middleware.ts              # Next.js middleware
```

## Database Schema

Key models:
- **User**: Stores user profiles, roles, and authentication data
- **CpProfile**: CP platform integrations (Codeforces, CodeChef, AtCoder)
- **Submission**: Synced competitive programming submissions
- **WeeklyScore**: Aggregated weekly user scores
- **Achievement**: User achievements and certifications
- **Resource**: Educational resources and tutorials
- **Contest**: Competitive programming contests
- **ChatRoom**: Community chat channels
- **Announcement**: Platform-wide announcements
- **Job**: Job postings for community

See `prisma/schema.prisma` for the complete schema.

## Dependencies

See `package.json` for all dependencies. Key packages:
- `next` - React framework
- `next-auth` - Authentication
- `@prisma/client` - ORM
- `bcryptjs` - Password hashing
- `zod` - Schema validation
- `nodemailer` - Email service
- `lucide-react` - Icons

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request
