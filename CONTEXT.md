# PixelMarket — Project Context

> Source of truth. Read first when resuming.

Last updated: 2026-05-20

---

## What This Is

Peer-to-peer marketplace for **Meta advertising assets** (pixels, custom audiences, lookalikes, engagement audiences). Automated transfer via Meta Graph API. **Sale-only.** **No transaction fee** — revenue from **$30/mo subscription** (3-day free trial, both buyers and sellers required).

---

## Live URLs / IDs

| Resource | URL |
|---|---|
| Production | https://pixel-market-sable.vercel.app |
| GitHub | https://github.com/R3iZer0/pixel-market |
| Supabase project ref | `yonhlsdwvjpqoqrtxawb` |
| Vercel project | royy35653w234-7538s-projects/pixel-market |
| Meta App ID | `1856638428626320` |
| Storage bucket | `listing-proofs` (private) |
| Stripe mode | **TEST** (test keys configured) |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lang | TypeScript |
| Styling | Tailwind v4 + forced dark mode |
| Auth | Supabase Auth (email) + custom Meta OAuth |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (private, signed URLs) |
| Meta API | Graph API v19.0 |
| **Payments** | **Stripe** (Checkout, Connect Express, Subscriptions) |
| Hosting | Vercel |

### Important Next.js 16 + library gotchas
- `proxy.ts` not `middleware.ts`; export `proxy()` not `middleware()`
- Client components with env-dependent libs need **lazy init inside handlers** (Supabase + Stripe both Proxy-wrapped)
- `useSearchParams` requires `<Suspense>` wrapper at build time
- DB views (`public_listings`, `public_profiles`) not in generated types — cast with `(supabase as any)`

---

## Phase Status

| Phase | Status |
|---|---|
| 1 — Foundation | ✅ |
| 2 — Auth | ✅ |
| 2.5 — Legal | ✅ |
| 3 — Browse + Detail | ✅ |
| 4 — Listing Wizard (6 steps + proofs) | ✅ |
| 5 — Meta Transfer | 🟡 audiences confirmed, pixel untested, no token cron |
| **6 — Payments** | 🟡 **subscription works, buyer checkout works, payouts table tracks; cron/gating pending** |
| 7 — Orders Flow | ✅ mostly (dispute + 7-day auto-release pending) |
| 8 — Trade | ⏸ skipped |
| 9 — Messaging + Offers | ✅ |
| 10 — Settings + Profile | ✅ |
| 11 — Reviews | ❌ |
| 12 — Polish/Launch | ❌ |
| 13 — Meta App Review | ❌ |

---

## Payments Architecture (Phase 6)

### Subscription flow
```
User clicks "Start trial" on /billing
  → /api/billing/checkout creates Stripe Checkout (subscription mode, 3-day trial)
  → user pays via Stripe Checkout
  → webhook customer.subscription.created/updated → updates profile.subscription_status
  → fallback: /api/billing/sync called on /billing page load = pulls truth from Stripe
```

### Buy flow (no platform fee in test, sub funds the platform)
```
Buyer clicks "Buy now" on listing → /listings/[id]/buy
  → picks ad account + BM (if pixel)
  → POST /api/orders { listing_id, buyer_ad_account_id, payment_method: 'stripe' }
  → server creates pending_payment order + Stripe Checkout session
  → returns checkout_url → window.location redirects to Stripe
  → buyer pays
  → webhook checkout.session.completed → order = paid → triggers /api/meta/transfer
  → asset shared via Meta API → status = transferred
  → buyer clicks "Confirm I received it" → order = completed
  → payouts row created (status=pending, releasable_at=NOW+7days)
```

### Seller payout flow (NOT YET RUNNING)
```
Daily cron checks payouts where releasable_at <= now
  → flips status to 'releasable'
Admin or cron triggers payout:
  - Fiat: stripe.transfers.create({ amount, destination: stripe_account_id })
  - Crypto: manual send to profiles.crypto_wallet, save tx_hash
Mark status='sent'
```

### Stripe Connect (sellers receive USD)
- `POST /api/billing/connect/start` creates Express account + onboarding link
- Seller clicks "Set up Stripe payout account" on /billing
- Stripe-hosted KYC, ~5min
- `GET /api/billing/connect/return` syncs `charges_enabled` / `payouts_enabled` flags

### Webhook events handled at `/api/webhooks/stripe`
- `checkout.session.completed` — order paid (calls Meta transfer) OR subscription synced
- `customer.subscription.created/updated/deleted` — sub status to profiles
- `account.updated` — Connect status to profiles
- HMAC verified via `STRIPE_WEBHOOK_SECRET`
- Fallback: lookup user via `stripe_customer_id` when metadata missing

### Pending in Phase 6
- Subscription gating on listing creation + buying (block if no active sub)
- Daily cron: flip payouts to releasable + dispatch
- Coinbase Commerce crypto checkout + webhook
- Auto-cancel pending_payment orders after 30min

---

## Database

### Tables
- `profiles` — user + Meta token + Stripe customer + Stripe Connect + sub status
- `listings`, `orders`, `messages` (listing OR order scoped), `price_offers`, `trade_offers`, `reviews`, `disputes`
- **`payouts`** — what's owed to each seller per order (status: pending/releasable/sent/failed/on_hold, releasable_at, sent_at)
- **`system_settings`** — k/v for Stripe product/price IDs (lazy-created on first checkout)

### Views (with `security_invoker = off`)
- `public_profiles` — strips email/token/business_id
- `public_listings` — strips Meta IDs from `source_extra`, joins seller fields

### Critical SQL applied via dashboard (not in migrations)
- `handle_new_user` trigger fixed (collision-safe, RLS-safe)
- `public_profiles` + `public_listings` views with `security_invoker = off`
- Tightened profile RLS (dropped blanket read)
- `messages.listing_id` nullable + new RLS for thread parties
- `price_offers` table
- Subscription columns + `payouts` + `system_settings` tables

---

## Env Vars (set in all 3 Vercel envs)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Meta
META_APP_ID
META_APP_SECRET
NEXT_PUBLIC_META_APP_ID

# Stripe (TEST mode)
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET

# App
NEXT_PUBLIC_APP_URL

# Not yet wired
COINBASE_COMMERCE_API_KEY
COINBASE_COMMERCE_WEBHOOK_SECRET
```

---

## File Map (latest)

```
pixel-market/
├── app/
│   ├── billing/page.tsx                # subscription + Connect + earnings
│   ├── dashboard/page.tsx
│   ├── browse/, listings/[id]/, listings/[id]/buy/, listings/new/
│   ├── orders/, orders/[id]/, sales/, my-listings/
│   ├── messages/, messages/[threadId]/
│   ├── profile/[username]/, settings/, legal/{privacy,terms,data-deletion}/
│   ├── auth/callback/
│   ├── dev/test-transfer/
│   └── api/
│       ├── billing/{checkout,portal,sync}/, billing/connect/{start,return}/
│       ├── webhooks/stripe/
│       ├── orders/, orders/[id]/, orders/[id]/{confirm,test-pay}/
│       ├── listings/, listings/mine/, listings/public-info/, listings/[id]/
│       ├── messages/, messages/thread/, offers/, offers/[id]/{accept,reject,withdraw}/
│       ├── meta/{assets,asset-details,callback,transfer}/
│       ├── auth/{signout,meta-connect,meta-disconnect}/
│       ├── account/{email,password,delete}/
│       ├── payouts/, profile/, proof/sign/, upload/proof/
│       ├── me/, data-deletion/
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   ├── stripe.ts                       # lazy Proxy-wrapped client + product/price helpers
│   ├── listing-constants.ts, utils.ts
├── proxy.ts
├── types/{database,public-listing}.ts
├── TASKS.md, CONTEXT.md
```

---

## How to Resume

1. Read CONTEXT.md + TASKS.md
2. `cd /Users/reinexhipi/pixel-market && npm run dev`
3. Deploy: `vercel --prod --yes`
4. Schema changes: edit `supabase/migrations/*.sql` AND apply via SQL editor
5. Regen types: `SUPABASE_ACCESS_TOKEN=... supabase gen types typescript --project-id yonhlsdwvjpqoqrtxawb > types/database.ts` + re-append aliases

---

## Open Tech Debt / Bugs

- Token refresh cron not built (60-day Meta expiry)
- Pixel transfer untested (requires BM both sides)
- Subscription gating not enforced anywhere yet
- Payout dispatcher (cron + sender) not built
- Auto-cancel orders not built
- Coinbase Commerce not wired
- No retry logic on Meta API transient failures
- `current_period_end` moved from subscription root → `items.data[0]` in newer Stripe API; code handles both via fallback

---

## Decisions Log

| Decision | Reason |
|---|---|
| No transaction fee, $30/mo sub | User decision, simpler model |
| Stripe Connect Express for seller payouts | Stripe handles KYC + bank + tax |
| Subscription required for both sides | Pricing model — both buyer and seller pay |
| 3-day free trial | User decision |
| /api/billing/sync as belt-and-suspenders | Don't rely on webhook timing for sub state |
| Proxy-wrapped lazy Stripe client | Env vars not present at Next.js build collect-data step |
| Custom Meta OAuth (not Supabase FB) | Email scope conflict with marketing scopes |
| Lookalike share = direct (not recreation) | Recreation needs BM-to-BM perms |
| Adaccounts API needs numeric ID in array, `act_` prefix in path | Meta quirk |
| `security_invoker = off` on public views | Cross-user reads need to bypass profile RLS |
| Force dark mode globally | OS dark mode + Tailwind defaults = unreadable |
| Sale-only v1 | No trade — simpler payment flow |
| Lazy-created Stripe product/price | Cached in `system_settings` so no manual setup step |
