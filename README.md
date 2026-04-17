# CP Community Web App

Initial Next.js + Prisma boilerplate for the university competitive programming community platform.

## Stack
- Next.js 15
- React 19
- TypeScript
- Prisma
- PostgreSQL

## Getting started

1. Copy env file:

```bash
cp .env.example .env
```

2. Set a real PostgreSQL connection in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/cp_community?schema=public"
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Create your first migration:

```bash
npm run prisma:migrate -- --name init
```

6. Seed starter data:

```bash
npm run seed
```

7. Start the app:

```bash
npm run dev
```

## Current project files
- `prisma/schema.prisma` → main schema
- `prisma/seed.ts` → initial seed script
- `lib/prisma.ts` → Prisma client singleton
- `app/` → App Router pages and styles

## Auth.js setup added
This project now includes:
- credentials-based login
- registration form
- protected `/dashboard` route
- Prisma adapter integration
- password hashing with `bcryptjs`

If you already installed dependencies before auth was added, run:

```bash
npm install
```

Then make sure your `.env` includes:

```env
NEXTAUTH_SECRET="a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

You can re-run the seed to get a test admin account:

```bash
npm run seed
```

Default seeded admin:
- email: `admin@example.com`
- password: `admin123456`

Change that immediately if you keep using it.

## Recommended next steps
- replace placeholder dashboard with real user stats
- implement CP handle linking
- add submission sync jobs
- build leaderboard page
- add role-based admin guards
