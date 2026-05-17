# PixelMarket — Project Context

> Source of truth for what's built, decided, and what's next. Read this first when resuming work.

Last updated: 2026-05-17

---

## What This Is

Peer-to-peer marketplace for **Meta advertising assets**:
- Meta Pixels (event history)
- Custom Audiences (website, app, CRM, lead form, page engagement, etc.)
- Lookalike Audiences
- Engagement Audiences (page, IG, video, etc.)

Fully automated transfers via **Meta Graph API** (Marketing API). Sellers list, buyers pay (Stripe or crypto), assets transfer automatically to buyer's ad account. **10% platform fee** on all transactions.

---

## Live URLs

| Resource | URL |
|---|---|
| Production | https://pixel-market-sable.vercel.app |
| GitHub | https://github.com/R3iZer0/pixel-market |
| Supabase project | https://supabase.com/dashboard/project/yonhlsdwvjpqoqrtxawb |
| Vercel project | https://vercel.com/royy35653w234-7538s-projects/pixel-market |
| Meta App ID | `1856638428626320` |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Auth | Supabase Auth (email + OAuth) |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime (planned for messages) |
| Payments (fiat) | Stripe Connect (planned) |
| Payments (crypto) | Coinbase Commerce (planned) |
| Meta API | Meta Graph API v19.0 (Marketing API) |
| Hosting | Vercel |

### Next.js 16 Gotchas
- **`middleware.ts` → `proxy.ts`** with `export async function proxy()` not `middleware()`
- Client components that touch env vars need lazy init inside event handlers, NOT at component scope (otherwise prerender fails). See `app/login/page.tsx` `getClient()` pattern.

---

## Database Schema

7 tables in `public` schema, all with RLS enabled:

| Table | Purpose |
|---|---|
| `profiles` | User profile, Meta token, Stripe Connect ID, crypto wallet, rating |
| `listings` | Asset listings (pixel/audience/lookalike/engagement) |
| `orders` | Purchase orders with state machine + payment IDs |
| `trade_offers` | Asset-for-asset trade proposals |
| `messages` | Per-order chat |
| `reviews` | Post-completion 1-5 star reviews |
| `disputes` | Buyer/seller disputes |

Full schema in `supabase/migrations/20260517000001_initial_schema.sql`. Generated TS types in `types/database.ts`.

### Critical Trigger Fix
`handle_new_user()` was patched to handle:
- Username collisions (appends counter)
- NULL email / metadata edge cases
- RLS bypass for profile auto-creation
- Error swallowing so auth never fails on DB error

See `Phase 2 — DB Trigger Fix` note below for the SQL applied (run manually in Supabase SQL editor — not committed as migration).

---

## Auth Flow

**Two separate flows — important distinction:**

### 1. App Login (Supabase Auth)
- Email + password (works now)
- Google OAuth (set up but not tested)
- ~~Facebook OAuth~~ — **REMOVED from login UI**
  - Reason: Supabase's FB provider auto-adds `email` scope, which conflicts with Marketing API app type. Got "Invalid Scopes: email" error.

### 2. Meta Connect (Custom OAuth, bypasses Supabase)
After login, user clicks "Connect Meta Account" on dashboard:
- `/api/auth/meta-connect` → direct redirect to `facebook.com/dialog/oauth`
- Scopes: `ads_read,ads_management,business_management` (NO email)
- `/api/meta/callback` → exchanges code → short token → long-lived (60-day) token
- Stores `meta_access_token`, `meta_token_expires`, `meta_business_id` in profiles via admin client

**Why custom flow:** Supabase always adds `email` scope to FB OAuth. Meta app rejects it when combined with marketing scopes. Direct OAuth lets us request only what we need.

---

## What's Built (File Map)

```
pixel-market/
├── app/
│   ├── layout.tsx            # Root layout, Inter font
│   ├── page.tsx              # Landing (hero, features, asset types)
│   ├── globals.css           # Tailwind v4 import
│   ├── login/page.tsx        # Email login (lazy supabase init)
│   ├── signup/page.tsx       # Email signup
│   ├── dashboard/page.tsx    # Profile + Meta status + ALL pixels/audiences from Meta
│   ├── auth/callback/route.ts        # Supabase OAuth callback
│   ├── api/
│   │   ├── auth/signout/route.ts
│   │   ├── auth/meta-connect/route.ts # Initiates direct FB OAuth
│   │   └── meta/callback/route.ts     # FB OAuth callback, exchanges + stores token
├── lib/
│   ├── supabase/client.ts    # Browser client
│   ├── supabase/server.ts    # Server client (with cookies)
│   ├── supabase/admin.ts     # Service role client (bypasses RLS)
│   └── utils.ts              # cn(), formatPrice(), formatNumber(), platformFee()
├── proxy.ts                  # Auth middleware (NOT middleware.ts — Next.js 16)
├── types/database.ts         # Generated from Supabase schema
├── supabase/migrations/      # SQL migrations
├── TASKS.md                  # Phase-by-phase task list
└── CONTEXT.md                # This file
```

---

## Phase Status

### ✅ Phase 1 — Foundation
- Next.js 16 scaffold + Tailwind v4
- Full DB schema (7 tables + RLS + triggers)
- TS types generated from schema
- Supabase clients (browser/server/admin)
- Auth proxy with protected routes
- Landing page
- Deployed to Vercel production

### ✅ Phase 2 — Auth (partial)
- ✅ Email signup/login
- ✅ Supabase auth callback
- ✅ Dashboard with profile
- ✅ Custom Meta OAuth (direct, bypasses Supabase)
- ✅ Long-lived token storage (60-day)
- ✅ Live dashboard lists ALL pixels + custom audiences + lookalikes + engagement audiences from Meta
- ⏳ Token refresh cron (not built)
- ⏳ Google OAuth (button present, not tested)

### 🔜 Phase 3 — Browse & Listings (PUBLIC)
- `/browse` — grid + filters (asset type, source, event, retention, category, geo, price, size)
- Search + sort
- `/listings/[id]` — detail page with Buy/Trade CTA, seller rating

### 🔜 Phase 4 — Listing Wizard (SELLER) ← **NEXT UP**
5-step wizard at `/listings/new`:
1. Pick asset from live Meta dropdown
2. Source details (dynamic per source type, 11 types)
3. Categorize (1 primary + up to 2 secondary, geo, niche)
4. Pricing (sale/trade/both, USD price, crypto toggle)
5. Preview + publish
+ `/my-listings` — manage own listings (edit, pause, delete)

### 🔜 Phase 5 — Meta API Integration (deeper)
- `POST /api/meta/transfer` — share asset to buyer's account
- Token refresh cron (daily, expires within 7 days)
- Auto-pause listings on token failure + notify
- Lookalike sharing workaround (share source + auto-recreate on buyer)

### 🔜 Phase 6 — Checkout & Payments
- Stripe Connect onboarding + escrow checkout
- Coinbase Commerce crypto checkout (15min QR window)
- `/api/webhooks/stripe` + `/api/webhooks/coinbase`
- Order state machine

### 🔜 Phase 7 — Orders & Transfer Flow
- `/orders`, `/sales`, `/orders/[id]`
- Status stepper, transfer badge, confirm/dispute buttons
- 7-day auto-release of escrow

### 🔜 Phase 8 — Trade Offers
- Trade flow + cash top-up support
- Seller accept/reject

### 🔜 Phase 9 — Messaging
- Order-based chat via Supabase Realtime
- Unread badge

### 🔜 Phase 10 — Settings & Profile
- `/settings` — edit profile, manage Meta/Stripe/crypto wallet
- `/profile/[username]` — public seller profile
- Token expiry banner

### 🔜 Phase 11 — Reviews
- Post-completion review prompt
- Rating aggregation

### 🔜 Phase 12 — Polish & Launch
- Error pages, loading skeletons
- SEO + OG images
- robots.txt + sitemap

---

## Key Decisions Log

| Decision | Reason |
|---|---|
| Custom Meta OAuth (not Supabase FB provider) | Supabase auto-adds `email` scope → conflicts with Marketing API app type |
| Lazy Supabase client init in client components | Next.js 16 Turbopack prerenders `'use client'` shells; env-dependent init at module/render scope crashes prerender |
| `proxy.ts` not `middleware.ts` | Next.js 16 renamed convention |
| 60-day long-lived token (default) | FB long-lived tokens last 60 days max; refresh cron needed before expiry |
| Admin client (service_role) for token storage | Trigger/RLS can't update profiles cross-user; admin bypasses RLS safely in server-only routes |
| Username auto-generated + collision handled | Email-prefix collisions broke first signup attempt |
| 10% platform fee on lower asset's value (trades) | Simpler than negotiating per-trade |
| Meta app stays in Dev mode until launch | Marketing API scopes need App Review for general users |

---

## Env Vars (Vercel + .env.local)

Set in all 3 envs (production, preview, development):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
META_APP_ID
META_APP_SECRET
NEXT_PUBLIC_META_APP_ID
NEXT_PUBLIC_APP_URL

# Not yet wired:
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
COINBASE_COMMERCE_API_KEY
COINBASE_COMMERCE_WEBHOOK_SECRET
```

---

## Meta Setup Notes

App settings that must stay configured:

**Valid OAuth Redirect URIs** (Facebook Login → Settings):
- `https://yonhlsdwvjpqoqrtxawb.supabase.co/auth/v1/callback` (for any future Supabase FB use)
- `https://pixel-market-sable.vercel.app/api/meta/callback` (current direct flow)

**App Domains** (App Settings → Basic):
- `yonhlsdwvjpqoqrtxawb.supabase.co`
- `pixel-market-sable.vercel.app`

**Required scopes (need App Review for prod users):**
- `ads_read`
- `ads_management`
- `business_management`

**Dev mode:** Only app admins + testers can grant these scopes. Add testers via App Roles → Roles before they can sign in.

---

## How to Resume Work

1. Read this file
2. Read `TASKS.md` for granular phase tasks
3. Check current phase status above
4. Run `npm run dev` from `/Users/reinexhipi/pixel-market`
5. Production deploys: `vercel --prod --yes`
6. Schema changes: edit `supabase/migrations/*.sql` AND apply manually in Supabase SQL editor (CLI migration push is finicky due to pre-existing tables)
7. Re-generate types after schema change: `SUPABASE_ACCESS_TOKEN=<token> supabase gen types typescript --project-id yonhlsdwvjpqoqrtxawb > types/database.ts` (then re-append convenience aliases at end)

---

## Open Bugs / Tech Debt

- Token refresh job not built — tokens will silently expire at 60 days
- Google OAuth button shown but untested
- `app/dashboard/page.tsx` uses `any` types for Meta API responses — should add proper interfaces
- No error boundary on Meta API failures (just shows error inline)
- No rate limit on Meta API calls in dashboard — could hit limits if user has many ad accounts
- `audience.subtype` is a free-text string in current code — should be an enum
