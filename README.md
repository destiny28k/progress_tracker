# LEVEL UP — Progress Tracker

A personal growth dashboard for a fixed-length challenge across three areas: finance, communication and physique, plus a daily journal.

Built with Next.js 16 (App Router), Tailwind CSS 4, Recharts and Supabase (Postgres + Auth).

## Setup

1. `npm install`
2. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
3. `npm run dev` and open http://localhost:3000

## How it works

- **Auth:** Supabase email/password. `proxy.ts` refreshes the session and redirects signed-out visitors to `/login`. Email links land on `/auth/callback`.
- **Data:** `components/dashboard/store.tsx` loads the signed-in user's rows once and exposes typed actions (add transaction, log workout, save journal…). Toggles update the UI immediately and resync if a write fails.
- **Stats:** every number on screen is derived in `components/dashboard/metrics.ts` from stored data and today's date. Nothing is hard-coded.
- **Security:** every table has Row Level Security, so users can only read and write their own rows. A trigger creates a `profiles` row on sign-up.

## Database tables

| Table | Purpose |
|---|---|
| `profiles` | Name, challenge dates, daily targets, financial goals, currency |
| `activity_logs` | Communication practice status per day (completed / skipped / rest-day, with skip reason) |
| `practice_notes` | Optional daily practice note |
| `transactions` | Income and expenses |
| `clients` | Clients and leads with a next-step note |
| `workouts` | Workout sessions and rest days |
| `body_metrics` | Weight and body measurements (one entry per date) |
| `journal_entries` | Daily reflection (one entry per date) |

If you change the schema, update `lib/supabase/database.types.ts` to match.

## Scripts

- `npm run dev`: development server
- `npm run build`: production build (type errors fail the build)
- `npm run typecheck`: TypeScript only
