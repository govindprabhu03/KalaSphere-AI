# Architecture

The digital platform for **Ravindra Bhavan Sankhali, Goa** — a full cultural-institution
ERP, not just event management. One codebase serves many Ravindra Bhavans (multi-tenant).

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js 16 (App Router) + TypeScript, PWA-first (installable, mobile-optimized) |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI) + Framer Motion |
| Data (client) | TanStack Query + Supabase Realtime |
| Backend / DB | Supabase — Postgres + Row-Level Security + Storage + Realtime + Edge Functions |
| Auth | Supabase Auth (email, Google, phone OTP) |
| Payments | Razorpay (webhook-confirmed) — Phase 2 |
| AI | Google Gemini, tool-calling scoped by RLS (never writes SQL) — Phase 8 |
| Hosting | Vercel (web) + Supabase; native mobile via Expo later |

## Core principles

1. **Multi-tenancy in the database.** Every domain table carries `organization_id`, and
   RLS guarantees one org can never read another's data. Proven by
   `scripts/verify-tenant-isolation.mjs`.
2. **Writes go through SECURITY DEFINER RPCs**, each encoding one legal state transition.
   Tables are otherwise locked down.
3. **Append-only ledgers** for money and attendance; **immutable audit log**.
4. **Seven roles:** `super_admin` (platform), and org roles `admin`, `faculty`, `parent`,
   `student`, `artist`; `public` = no membership.

## Roles

- `super_admin` — platform-wide, stored as `profiles.is_platform_admin`.
- Org roles live on `organization_members.role`, scoping a user to one Ravindra Bhavan.
- RLS uses SECURITY DEFINER helpers (`is_platform_admin`, `is_org_member`, `has_org_role`,
  `user_org_role`) so policies never recurse on the membership table.

## Phased roadmap

| Phase | Delivers |
|---|---|
| 0 | Foundation: repo, Supabase wiring, tenancy + RBAC schema, RLS, design system, app shell |
| 1 | Auth + 7 roles, parent–child linking, org switching |
| 2 | Public site + full event flow (register → pay → QR → attendance → certificate → feedback) |
| 3 | Workshops + cultural classes |
| 4 | Student growth + parent & faculty portals |
| 5 | Venue booking (live calendar, conflicts, facilities, approval, receipts) |
| 6 | Canteen (menu → order → pay → kitchen board → QR pickup) |
| 7 | Community + gallery/news |
| 8 | AI layer (assistant, generation, predictions) |
| 9 | Multi-tenant branding + native mobile + hardening |

## Directory layout (evolving)

```
src/
  app/                     routes (App Router)
  components/
    ui/                    shadcn/ui components
    site/                  public marketing chrome
    providers.tsx          TanStack Query + theme
  lib/
    supabase/              client.ts, server.ts, admin.ts, middleware.ts
    auth/                  context.ts (requireContext), roles.ts
    types/                 database.ts
    env.ts
  proxy.ts                 Next 16 proxy (session refresh)
supabase/migrations/       versioned SQL
scripts/                   verify-tenant-isolation.mjs, verify-rls.mjs
```
