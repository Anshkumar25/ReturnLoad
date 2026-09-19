# ReturnLoad

A two-sided smart **return-load** logistics marketplace for India. Transporters with trucks that run empty on the way back after a delivery find return cargo; shippers get affordable, verified haulage instead of paying the one-way rate.

**The landmark flow:** a truck delivers *Delhi → Jaipur*, then discovers a *Jaipur → Delhi* return load, gets booked, and earns on the return leg it used to run for free.

## Features

- **Landing page** — the problem (up to 30–40% empty running), the solution, benefits, and how it works.
- **Auth** — signup / login / logout with role selection (transporter or shipper). Admins are provisioned in the database.
- **Transporter dashboard** — register vehicles, publish return trips with available capacity, review booking requests, mark delivered.
- **Shipper dashboard** — post loads, search return trips, request bookings, track status.
- **Smart matching** — weighted ranking on *return-route alignment, estimated detour, closest-fit capacity, timing, and cargo restrictions*:
  - Route fit is judged against the truck's **actual return leg**, not just the destination city.
  - Detour is tiered *none / minor / moderate / substantial* with a clearly-labelled estimate.
  - Capacity is **closest-fit** (capacity ≥ weight but minimal leftover ranks highest); restricted cargo and overcapacity are hard blocks.
  - Est. detour, route overlap %, and illustrative earnings are always marked as estimates — no fake live routing, GPS, or pricing.
- **Booking workflow** — `requested → accepted → rejected / cancelled → completed`, with cancellation reasons and reviews unlocked on completion.
- **Trust scaffold** — profiles + company/GSTIN, vehicle register, admin verification, ratings & reviews, booking history, and reported-issue moderation.
- **Admin** — moderate users (verify / suspend), archive listings, and handle reported issues.
- **Notifications** — booking events, new matches, reviews, verification, and issue alerts (in-app).
- **Responsive** and polished from mobile to desktop, with loading/empty states, validation, and toast notifications.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling | Tailwind CSS v4 (CSS-first config) |
| Forms | zod v4 validation shared across all forms |
| Database & auth | Supabase (PostgreSQL + RLS), or a browser-local **Demo Mode** |
| Geometry | Built-in city co-ordinate table + haversine corridor projection (estimates) |
| Tests | Vitest |

## Two data backends

ReturnLoad runs out of the box with **no credentials**:

- **Demo Mode** (`APP_MODE = "demo"`, the default) — a fully-functioning marketplace stored in `localStorage`, seeded with fictional-but-realistic Indian data. Every screen works, and the matching engine runs against real seeded trips and loads. Demo data is clearly labelled.
- **Supabase** (`APP_MODE = "supabase"`) — the same UI against a real PostgreSQL database with row-level security. Enabled automatically when the two env vars below are set.

## Getting started

```bash
npm install          # see the note below if devDeps are missing
npm run dev          # http://localhost:3000
```

> **Windows / CI note:** if your shell exports `NODE_ENV=production`, npm skips devDependencies. Run
> `export NODE_ENV=development && npm install --include=dev` once so vitest/eslint are present.

### Environment variables (`.env.local`)

All keys are read from environment variables — nothing is hardcoded. Copy `.env.local.example` to `.env.local`:

| Variable | Purpose | Required? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | For Supabase mode |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key | For Supabase mode |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Live routing (optional enhancement) | No |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Live routing (optional enhancement) | No |

If Supabase credentials are present, the app runs against the real backend; otherwise it falls back to Demo Mode. Routing keys are optional — without them, matching uses the built-in city table and labels everything as an estimate.

### Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of [`sql/schema.sql`](sql/schema.sql) → **Run**. This creates all tables, row-level security policies, triggers (profile-on-signup + notifications), and indexes.
3. Go to **Project Settings → API** and copy the **Project URL** and **anon/public** key into `.env.local`.
4. Create the first admin: in Supabase SQL Editor, run
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

### Demo accounts

Sign up on the login page, or use the one-click demo accounts shown on the login screen (a transporter **"Lakshmi Narain Transport Lines"** and a shipper **"Sharma"** persona). In Supabase mode, admins can verify profiles from the Admin → Users screen.

## Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (Turbopack) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (`tests/`) |

## Project structure

```
src/app/(public)      Landing page, auth pages
src/app/(app)/dashboard
  ├─ transporter/     vehicles, trips, matches, bookings
  ├─ shipper/         loads, search, bookings
  ├─ admin/           users, listings, issues
  ├─ profile/         profile, company, ratings
  └─ notifications/   notification centre
src/lib
  ├─ data.ts          unified data facade (Supabase | Demo)
  ├─ supabase.ts      lazy Supabase client
  ├─ demo/store.ts    localStorage-backed demo backend (same operations)
  ├─ matching.ts      weighted matching engine
  ├─ geo.ts           city co-ordinate table + corridor math (estimates)
  └─ validation.ts    zod schemas shared by every form
src/components         reusable UI + feature components
tests/                 vitest suites for matching, validation, formatting
sql/schema.sql         Supabase schema + RLS + triggers + indexes
```

## Honesty notes

Per the product requirements, **nothing is faked**:

- There are **no** fake booking/payment/tracking confirmations — every workflow state is real.
- There is **no** claimed live GPS, live pricing, or real-time availability. Without a routing key, all distances/detours are **estimates** derived from the built-in city table and are labelled as such (`Est.`, `≈`, and "illustrative").
- Sample data is fictional and clearly branded **Demo data**.

## Tests

`npm test` runs 38 unit tests covering the matching engine (route alignment, closest-fit capacity, detour tiers, timing, cargo blocks, sort order), all zod schemas, economics, and formatting.

## License

Private/learning project — not for production use without hardening (rate limiting, abuse protection, payments).