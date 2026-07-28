# Ravindra Bhavan Sankhali — Platform

The digital home of **Ravindra Bhavan Sankhali, Goa**: events, workshops, cultural
classes, student growth, venue booking, canteen, community and more — a full
cultural-institution platform, built to expand to every Ravindra Bhavan in Goa.

Multi-tenant · role-based · AI-assisted · PWA-first.

> **Status:** Phase 0 (foundation) complete. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
> for the full plan and phased roadmap.

## Tech stack

Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion · TanStack Query ·
Supabase (Postgres + RLS + Auth + Storage + Realtime) · Razorpay (later) · Gemini (later).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app runs with placeholder credentials — Supabase
features stay disabled until you connect a project (below).

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in, from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the browser)
3. Apply the schema: run `supabase/migrations/0001_init_tenancy.sql` in the Supabase
   **SQL Editor** (or `supabase db push` with the Supabase CLI).
4. Verify security:
   ```bash
   npm run verify:rls         # anon cannot read protected tables
   npm run verify:isolation   # two orgs cannot see each other's data
   ```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint |
| `npm run verify:rls` | RLS smoke test (anonymous access denied) |
| `npm run verify:isolation` | Tenant-isolation proof (org A ≠ org B) |

## Project layout

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
