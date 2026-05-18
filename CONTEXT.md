# PixelMarket — Project Context

> Source of truth for what's built, decided, and what's next. Read this first when resuming work.

Last updated: 2026-05-18

---

## What This Is

Peer-to-peer marketplace for **Meta advertising assets** (pixels, custom audiences, lookalikes, engagement audiences). Fully automated transfer via Meta Graph API. **Sale-only** (trade deprioritized for v1). **10% platform fee.**

---

## Live URLs

| Resource | URL |
|---|---|
| Production | https://pixel-market-sable.vercel.app |
| GitHub | https://github.com/R3iZer0/pixel-market |
| Supabase project | https://supabase.com/dashboard/project/yonhlsdwvjpqoqrtxawb |
| Vercel project | https://vercel.com/royy35653w234-7538s-projects/pixel-market |
| Meta App ID | `1856638428626320` |
| Storage bucket | `listing-proofs` (PRIVATE) |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lang | TypeScript |
| Styling | Tailwind v4 — forced dark mode via globals.css overrides |
| Icons | lucide-react |
| Auth | Supabase Auth (email; custom Meta OAuth separate) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (private bucket, signed URLs) |
| Meta API | Graph API v19.0 |
| Hosting | Vercel |
| Payments | Stripe Connect + Coinbase Commerce — **NOT YET WIRED**, test-pay stub in place |

### Next.js 16 Gotchas
- `middleware.ts` → `proxy.ts` with `export async function proxy()` not `middleware()`
- Client components that touch env-dependent code must **lazy-init inside event handlers** (`app/login/page.tsx` `getClient()` pattern) — `force-dynamic` doesn't stop prerender of `'use client'` shells
- Database views (`public_listings`, `public_profiles`) NOT in generated types — cast with `(supabase as any)`

---

## Database

7 tables (profiles, listings, orders, trade_offers, messages, reviews, disputes) + 2 public views.

### Public views (anonymity layer)
- `public_profiles` — username, display_name, avatar, bio, is_verified, rating, total_sales, created_at (NO email/token/business_id)
- `public_listings` — full listing data + seller fields, BUT `source_extra` strips `origin_pixel`, `origin_details`, `data_source` to hide pixel IDs from non-buyers

### Critical fixes applied via SQL editor (not in migrations)
1. **`handle_new_user` trigger rewritten** — collision-safe usernames, RLS bypass, error-tolerant
2. **`public_profiles` + `public_listings` views** for anonymity
3. **Dropped "Public read profiles" RLS policy** (replaced by view)
4. **Storage bucket `listing-proofs` created via Dashboard** (initially public, then switched to private)
5. **Storage policies** for upload/delete/read

---

## Auth Flows

**Two separate:**

1. **App Login (Supabase Auth)** — email/password works. Google button untested. Facebook removed from login (scope conflict).
2. **Meta Connect (custom OAuth)** — `/api/auth/meta-connect` → `facebook.com/dialog/oauth` directly → `/api/meta/callback` → exchanges for 60-day long-lived token → stores via admin client. Scopes: `ads_read,ads_management,business_management`. **Reminder: add `public_profile,email` flow** to pull FB name+email for verification.

---

## Phase Status (see TASKS.md for full detail)

| Phase | Status |
|---|---|
| 1 — Foundation | ✅ |
| 2 — Auth | ✅ |
| 2.5 — Legal pages | ✅ |
| 3 — Browse + Detail | ✅ |
| 4 — Listing Wizard (6 steps + proofs) | ✅ |
| 5 — Meta Transfer | 🟡 partial — audiences confirmed working, pixel untested, no token cron |
| 6 — Payments | 🔜 **next** — test-pay stub works, Stripe+Coinbase not wired |
| 7 — Orders flow | ✅ mostly (dispute + 7-day auto-release not yet) |
| 8 — Trade offers | ⏸ deprioritized (sale-only v1) |
| 9 — Messaging | ❌ |
| 10 — Settings/Profile | ❌ (token banner only) |
| 11 — Reviews | ❌ |
| 12 — Polish/Launch | ❌ |
| 13 — Meta App Review | ❌ (legal pages + endpoint ready) |

---

## File Map

```
pixel-market/
├── app/
│   ├── layout.tsx, page.tsx (landing), globals.css (dark mode)
│   ├── login/, signup/, dashboard/
│   ├── auth/callback/route.ts                 # Supabase OAuth handler
│   ├── browse/page.tsx                        # public grid + filters
│   ├── listings/
│   │   ├── [id]/page.tsx                      # public detail w/ proofs
│   │   ├── [id]/buy/page.tsx                  # buyer picks ad acct/BM/payment
│   │   └── new/page.tsx                       # 6-step wizard
│   ├── my-listings/                           # seller dashboard + actions
│   ├── orders/                                # buyer list + /[id] detail (stepper, test-pay, confirm)
│   ├── sales/                                 # seller incoming orders
│   ├── dev/test-transfer/                     # manual transfer trigger
│   ├── legal/                                 # privacy, terms, data-deletion
│   └── api/
│       ├── auth/                              # signout, meta-connect
│       ├── me/                                # current user
│       ├── meta/
│       │   ├── assets/                        # list pixels + audiences
│       │   ├── asset-details/                 # deep enrichment per asset
│       │   ├── callback/                      # FB OAuth callback
│       │   └── transfer/                      # share asset to buyer
│       ├── listings/                          # POST create, mine, public-info, [id] PATCH/DELETE
│       ├── orders/                            # POST create, [id] GET, test-pay, confirm
│       ├── upload/proof/                      # private storage upload
│       ├── proof/sign/                        # signed URL for owner or active-listing viewers
│       └── data-deletion/                     # Meta signed_request callback
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   ├── listing-constants.ts                   # CATEGORIES, SOURCE_TYPES, GEO_OPTIONS
│   └── utils.ts
├── proxy.ts                                   # auth middleware (Next.js 16 naming)
├── types/{database,public-listing}.ts
├── supabase/migrations/
├── TASKS.md
└── CONTEXT.md (this file)
```

---

## End-to-End Flow (working today, no real payments)

1. Seller signs up (email)
2. Seller connects Meta (long-lived token stored)
3. Seller creates listing via 6-step wizard:
   - Pick asset (live from Meta)
   - Smart per-asset details (events, hosts, lookalike origin, etc.)
   - Categorize
   - Upload proof screenshots (private storage, signed URLs)
   - Set price (sale only)
   - Publish
4. Buyer signs up + connects Meta
5. Buyer browses → opens listing → "Buy now"
6. Buy page: picks buyer ad account (+ BM for pixels), payment method (Stripe/Coinbase)
7. Creates order (`pending_payment`)
8. Order detail page → "Test: simulate payment + transfer" button → marks paid → `/api/meta/transfer` fires → status `transferred`
9. Buyer clicks "Confirm I received it" → status `completed`, listing → `sold`, seller `total_sales++`

---

## Meta Transfer API Behavior

| Asset | Endpoint | Notes |
|---|---|---|
| `custom_audience` / `engagement_audience` / `lookalike_audience` | `POST /{audience_id}/adaccounts` body `{adaccounts: [numeric_id]}` (no `act_` prefix in array, but path uses `act_`) | Confirmed working. Same-FB-user shares may silently no-op (`sharing_data: []`). |
| `pixel` | `POST /{pixel_id}/shared_accounts` body `{business: BM_ID, account_id: act_XXX}` | Untested. Requires BM on both seller and buyer. |

Lookalikes share **directly** (they ARE custom audience subtype) — no recreation flow needed. Earlier attempt at recreating via `origin_audience_id` failed with `#2654 Audience Permission Needed`.

---

## Privacy Model

- Bucket `listing-proofs` = **private**
- Files at `{user_id}/{timestamp}-{slot}-{uuid}.ext`
- DB stores paths only
- `/api/proof/sign` issues signed URLs (1h) — checks: owner OR path appears in active listing's `source_extra.proofs`
- Public views strip Meta IDs, payment IDs, tokens
- Anonymous seller display on browse/detail: only `@username`, rating, sales count
- Real names/emails NEVER shown to other users

---

## Env Vars (set in all 3 Vercel envs)

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

## Meta App Setup (must stay configured)

**Valid OAuth Redirect URIs** (Facebook Login → Settings):
- `https://yonhlsdwvjpqoqrtxawb.supabase.co/auth/v1/callback`
- `https://pixel-market-sable.vercel.app/api/meta/callback`

**App Settings → Basic** (when going Live):
- Privacy URL: `https://pixel-market-sable.vercel.app/legal/privacy`
- ToS URL: `https://pixel-market-sable.vercel.app/legal/terms`
- Data Deletion URL: `https://pixel-market-sable.vercel.app/legal/data-deletion`
- Data Deletion Callback: `https://pixel-market-sable.vercel.app/api/data-deletion`
- App Domains: `yonhlsdwvjpqoqrtxawb.supabase.co`, `pixel-market-sable.vercel.app`

**Dev mode constraint:** marketing scopes only available to app admins/testers until App Review approved.

---

## Open Tech Debt / Bugs

- Token refresh cron not built — tokens silently expire at 60 days
- Google OAuth untested end-to-end
- Pixel transfer untested (requires BM on both sides)
- Some Meta API responses returning `sharing_data: []` for same-FB-user shares — real cross-user shares may behave differently
- No error boundary on Meta API failures
- No rate limit handling
- `public_listings` view + Supabase types: cast with `(client as any)` (no view types generated)
- Buyer Business Manager ID for pixel orders not persisted (passed through query string)

---

## How to Resume

1. Read this file
2. Read `TASKS.md` for granular phase tasks
3. Run `npm run dev` from `/Users/reinexhipi/pixel-market`
4. Deploy: `vercel --prod --yes`
5. Schema changes: edit `supabase/migrations/*.sql` AND apply manually in Supabase SQL editor
6. Regenerate types: `SUPABASE_ACCESS_TOKEN=<tok> supabase gen types typescript --project-id yonhlsdwvjpqoqrtxawb > types/database.ts` then append aliases
7. Manual storage bucket setup is required for fresh projects

---

## Decisions Log

| Decision | Reason |
|---|---|
| Custom Meta OAuth (not Supabase FB provider) | Supabase auto-adds `email` scope → conflicts with Marketing API |
| Lazy supabase client init in client components | Next.js 16 Turbopack prerenders `'use client'` shells |
| `proxy.ts` not `middleware.ts` | Next.js 16 renamed convention |
| 60-day long-lived token | FB max; refresh cron needed before expiry |
| Admin client for token writes | RLS-safe server-only updates |
| Username auto-generated + collision handled | Email-prefix collisions broke first signup |
| Sale-only v1 (no trade) | User decision — simplifies wizard + payment flow |
| Storage bucket private + signed URLs | Proof screenshots contain business info |
| Lookalike share = direct audience share (not recreation) | Recreation flow needed BM-to-BM permissions |
| Adaccounts API wants raw numeric ID in array | Meta's quirk — `act_` prefix in path, numeric in array body |
| Force dark mode globally via CSS overrides | User OS in dark mode + Tailwind defaulting to light = unreadable |
| Public views over RLS-tightening | Easier to maintain than column-level grants |
