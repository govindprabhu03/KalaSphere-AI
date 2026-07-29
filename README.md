# KalaSphere AI

The AI-powered, multi-tenant platform for **cultural institutions** — events,
workshops, cultural classes, student growth, venue booking, canteen, community
and more. One platform serves many institutions, each with its own branding,
users and data, kept strictly separate at the database level.

Multi-tenant · role-based · AI-assisted · PWA-first.

> **Status:** Phase 0 (foundation) + Phase 1 (auth, roles, org management) complete;
> Phase 2 (public microsites + events) in progress. See
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full plan.

## Tech stack

Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion · TanStack Query ·
Supabase (Postgres + RLS + Auth + Storage + Realtime) · Razorpay · Gemini.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the keys from **Settings → API**
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) plus the `DATABASE_URL` (Session pooler).
3. Apply migrations: `npm run db:migrate supabase/migrations/<file>.sql` (run each in order).
4. Verify security & flows:
   ```bash
   npm run verify:rls
   npm run verify:isolation
   npm run verify:phase1
   ```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` | Dev server / production build |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:migrate <file>` | Apply a SQL migration over the DB connection |
| `npm run verify:rls` | Anonymous access denied |
| `npm run verify:isolation` | Tenant isolation (org A ≠ org B) |
| `npm run verify:phase1` | Auth/roles/org flow end-to-end |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the directory layout and roadmap.
