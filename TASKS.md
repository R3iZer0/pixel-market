# PixelMarket — Build Tasks

## Phase 1 — Foundation ✅
- [x] Next.js 16 scaffold
- [x] Supabase schema (all 7 tables + RLS + triggers)
- [x] TypeScript DB types (generated from schema)
- [x] Supabase browser / server / admin clients
- [x] Auth proxy / middleware (protected routes)
- [x] Landing page
- [x] GitHub repo
- [x] Vercel production deployment

**Extras:**
- [x] Force dark mode globally (legibility)
- [x] `/api/me` endpoint (current user id/email)

---

## Phase 2 — Auth ✅
- [x] `/login` page (email + Google button)
- [x] `/signup` page (email + Google button)
- [x] `/auth/callback` — Supabase OAuth redirect handler
- [x] `/api/auth/meta-connect` — direct FB OAuth (bypasses Supabase email scope conflict)
- [x] `/api/meta/callback` — exchanges code → short token → long-lived token, stores in profiles
- [x] `/api/auth/signout`
- [x] Profile auto-created on signup (trigger fixed: collision-safe, RLS-safe, error-tolerant)
- [x] Dashboard shows ALL pixels + custom audiences + lookalikes + engagement audiences from Meta
- [ ] Google OAuth tested end-to-end (button present)
- [ ] Token refresh cron (60-day expiry — must build before launch)

---

## Phase 2.5 — Meta App Compliance (Legal) ✅
- [x] `/legal/privacy` — Privacy Policy
- [x] `/legal/terms` — Terms of Service
- [x] `/legal/data-deletion` — User-facing deletion instructions
- [x] `/api/data-deletion` — Meta signed_request callback (HMAC-verified)
- [x] Footer links on landing page

**Pending manual:**
- [ ] Paste URLs into Meta App Dashboard → Basic Settings

---

## Phase 3 — Browse & Listings (PUBLIC) ✅
- [x] `/browse` — listings grid with filters
  - [x] Filter: asset type, category, geo
  - [x] Search bar (title)
  - [x] Sort: newest, price asc/desc, audience size
- [x] `/listings/[id]` — listing detail page
  - [x] Asset details, seller card, price, Buy CTA
  - [x] Anonymous seller display (username only, no real PII)
  - [x] Proof screenshots rendered via signed URLs
  - [x] Seller rating + total sales
- [x] **Public views** for anonymity (`public_listings`, `public_profiles`) — Meta IDs stripped

---

## Phase 4 — Listing Wizard (SELLER) ✅
- [x] `/listings/new` — 6-step wizard
  - [x] Step 1: Pick asset from live Meta dropdown
  - [x] Step 2: Smart per-asset details
    - [x] Pixel: events firing (+ counts from `/stats`), websites firing, age
    - [x] Lookalike: country, similarity %, source audience deep chain
    - [x] Custom/Engagement: source pixel/page/video, rule
    - [x] Tag input for websites (Enter to add)
    - [x] Manual event entry fallback
    - [x] Data source explanation (required for lookalike/customer-list/website)
  - [x] Step 3: Categorize (primary + 2 secondary, geo, niche)
  - [x] **Step 4: Proof screenshots** — per-asset slots, multi-file upload
  - [x] Step 5: Pricing (sale only, USD, crypto toggle)
  - [x] Step 6: Preview & publish
- [x] `/my-listings` — pause / resume / delete actions
- [x] Supabase Storage bucket (`listing-proofs`, private) + signed URL endpoint

---

## Phase 5 — Meta API Deep Integration (partial)
- [x] `POST /api/meta/transfer` — share asset to buyer's ad account
  - [x] Custom audience: `POST /{audience_id}/adaccounts` with `adaccounts: [numeric_id]`
  - [x] Engagement audience: same as custom
  - [x] Lookalike: same as custom (lookalikes ARE custom audiences)
  - [x] Pixel: `POST /{pixel_id}/shared_accounts` (requires BM on both sides) — code done, untested
- [x] `/dev/test-transfer` — manual trigger UI for testing
- [x] `/api/meta/assets` — list pixels + audiences per ad account
- [x] `/api/meta/asset-details` — deep enrichment per asset (pixel /stats, audience lookalike_spec recursion)
- [ ] Token refresh cron (Vercel cron, daily)
- [ ] Auto-pause listings on token failure + notify user
- [ ] Seller pre-flight: warn if pixel not BM-attached

---

## Phase 6 — Checkout & Payments (in progress)
> Business model: **no transaction fee**, $30/mo subscription, both sides pay. Buyer pays platform via Stripe Checkout. Platform holds 7 days then pays seller via Stripe Connect (fiat) or manual crypto.
- [x] `POST /api/orders` — create pending_payment order + Stripe Checkout session if stripe payment_method
- [x] `/listings/[id]/buy` — buyer ad-account picker + BM picker, redirects to Stripe Checkout
- [x] **DEV** `POST /api/orders/[id]/test-pay` — simulate payment success + trigger transfer (still useful for crypto fallback)
- [x] **Subscription** ($30/mo, 3-day trial)
  - [x] `lib/stripe.ts` — lazy Stripe client, lazy-create product/price on first use, cached in `system_settings`
  - [x] `POST /api/billing/checkout` — subscription Checkout session
  - [x] `POST /api/billing/portal` — Stripe customer portal
  - [x] `POST /api/billing/sync` — pulls truth from Stripe (fallback if webhook missed)
- [x] **Stripe Connect Express** for seller payouts
  - [x] `POST /api/billing/connect/start` — creates Express account + onboarding link
  - [x] `GET /api/billing/connect/return` — return URL handler, syncs charges_enabled/payouts_enabled
- [x] **Stripe Webhook** `/api/webhooks/stripe` — HMAC verified, handles:
  - [x] `checkout.session.completed` → order paid + Meta transfer fired, OR subscription synced
  - [x] `customer.subscription.created/updated/deleted` → subscription status to profiles
  - [x] `account.updated` → Connect charges/payouts enabled
  - [x] Fallback: customer-id lookup when metadata.user_id missing
- [x] `/billing` page UI — subscription mgmt, Connect onboarding, earnings + payout history
- [x] DB: `profiles.stripe_customer_id`, `subscription_status`, `subscription_current_period_end`, `trial_ends_at`, `stripe_connect_charges_enabled`, `stripe_connect_payouts_enabled`
- [x] DB: `system_settings` (k/v for Stripe product/price IDs), `payouts` table, `orders.stripe_checkout_session_id`
- [ ] Coinbase Commerce crypto
  - [ ] Checkout: QR + 15min countdown
  - [ ] `POST /api/webhooks/coinbase`
- [ ] **Subscription gating** — block listing creation + buying if no active sub
- [ ] **Daily cron** — flip payouts from pending → releasable after `releasable_at` passes
- [ ] **Payout dispatcher** — Stripe transfers for fiat sellers; manual UI for crypto
- [ ] Auto-cancel orders after 30min if no payment
- [x] Order state machine: `pending_payment → paid → transferring → transferred → completed`

---

## Phase 7 — Orders & Transfer Flow ✅ (mostly)
- [x] `/orders` — buyer order history
- [x] `/sales` — seller incoming orders
- [x] `/orders/[id]` — order detail
  - [x] Status stepper
  - [x] Meta transfer status badge + error display
  - [x] "Confirm receipt" button (buyer)
  - [x] "Test pay" button (dev — simulates payment + transfer)
  - [x] Meta asset ID revealed only after transfer
- [x] `POST /api/orders/[id]/confirm` — buyer confirms → marks completed, listing sold, total_sales++
- [ ] Auto-release payout after 7 days if no dispute
- [ ] `POST /api/orders/[id]/dispute` — open dispute
- [ ] "Open dispute" button (buyer, within 7 days of transfer)

---

## Phase 8 — Trade Offers (DEPRIORITIZED)
> User decision: sale-only platform for v1. Trade flow removed from wizard.
- [ ] (skipped for v1)

---

## Phase 9 — Messaging ✅
- [x] `/messages` — thread list with last-message preview, unread badges, polling every 8s
- [x] `/messages/[threadId]` — chat view (`order-{uuid}` OR `listing-{listing_uuid}-{buyer_uuid}` route patterns)
  - [x] Auto-marks peer messages read on open
  - [x] Enter to send, Shift+Enter newline
  - [x] Polls for new messages every 8s
- [x] `/api/messages` GET (threads list, grouped) + POST (send)
- [x] `/api/messages/thread` GET — messages + offers + peer + listing meta
- [x] Schema extended: `messages.listing_id` nullable column, `messages.order_id` nullable, new RLS allowing thread parties
- [x] **Price offers** — separate `price_offers` table
  - [x] `/api/offers` POST — create offer (auto-withdraws prior pending from same buyer)
  - [x] `/api/offers/[id]/accept` — seller accepts → message posted, buyer can checkout at offer price
  - [x] `/api/offers/[id]/reject` — seller rejects
  - [x] `/api/offers/[id]/withdraw` — buyer withdraws
  - [x] Offer cards rendered inline in chat timeline (mixed with messages, color-coded by status)
  - [x] Checkout uses offer price when `offer_id` in /buy querystring + `/api/orders` body
- [ ] Realtime (Supabase Realtime instead of 8s polling)
- [ ] Unread count badge in main nav

---

## Phase 10 — Settings & Profile ✅
- [x] `/settings` — profile edit, Meta connect/disconnect, crypto wallet
  - [x] Public profile: username (validated 3–30 chars a–z 0–9 _), display name, avatar URL, bio
  - [x] Meta connection: status, FB user ID, token expiry warn (<7d), Reconnect, **Disconnect** (pauses active listings)
  - [x] Payout: Stripe Connect button (disabled placeholder), crypto wallet + chain
  - [x] Account stats: total sales, rating, verified
  - [x] **Login credentials:** change email (Supabase double-confirm flow), change password (verifies current via re-sign-in)
  - [x] **Danger zone:** delete account (cancels pending orders, expires listings, wipes user via admin API)
- [x] `/profile/[username]` — public seller profile (avatar, bio, sales, rating, member since, active listings grid)
- [x] Meta token expiry banner on dashboard (basic)
- [x] Stripe Connect placeholder (button disabled until Phase 6)
- [ ] **Reminder: add `public_profile,email` Meta scope flow** to pull FB name+email for verification (split from marketing scope flow)

---

## Phase 11 — Reviews & Ratings
- [ ] Post-completion review prompt (both parties)
- [ ] `POST /api/reviews` — submit review
- [ ] Rating aggregation on profiles

---

## Phase 12 — Polish & Launch Prep
- [ ] `.env` validation on startup
- [ ] Error pages (404, 500)
- [ ] Loading skeletons on browse + listing detail
- [ ] SEO: meta tags, OG image per listing
- [ ] `robots.txt` + sitemap
- [ ] Custom domain on Vercel (e.g. pixelmarket.io)
- [ ] Update `NEXT_PUBLIC_APP_URL` + Meta redirect URIs to custom domain
- [ ] Supabase: configure email templates (signup confirmation, password reset)

---

## Phase 13 — Meta App Review / Go Live
- [ ] Meta Business Verification (legal docs, 2–7 days)
- [ ] App Icon (1024×1024)
- [ ] Screencast video (1–3 min) per scope: `ads_read`, `ads_management`, `business_management`
- [ ] Test FB credentials for reviewers
- [ ] Step-by-step reproduction guide
- [ ] Submit App Review (5–10 business days)
- [ ] Switch Meta app from Dev mode → Live

---

## Extras built (not in original phases)
- [x] `/dev/test-transfer` — manual transfer trigger UI for debugging
- [x] `/api/listings/mine` — current user's listings (used by test-transfer)
- [x] `/api/listings/public-info` — minimal public listing data (used by /buy page)
- [x] `/api/listings/[id]` PATCH (pause/unpause) + DELETE (soft delete → expired)
- [x] `/api/me` — current user id + email
- [x] `/api/proof/sign` — generate signed URLs for private storage paths
- [x] `/api/profile` GET/PATCH — own profile read/write
- [x] `/api/account/email` — change email via Supabase double-confirm
- [x] `/api/account/password` — change password with current-password verify
- [x] `/api/account/delete` — wipe user via admin API
- [x] `/api/auth/meta-disconnect` — null Meta token + pause active listings
- [x] Public views fixed with `security_invoker = off` so cross-user reads work despite tight profile RLS
- [x] `/api/messages` + `/api/messages/thread` + `/api/offers/*` — full messaging + offers backend
- [x] Schema: `messages.listing_id` + nullable `order_id` + `price_offers` table
- [x] `/api/payouts` — seller's payout history
- [x] `/api/billing/sync` — Stripe truth sync (works even if webhook missed)
- [x] Stripe `subscription_data.metadata.user_id` flows through to subscription metadata + we have customer-id fallback
- [x] Perf: dashboard stripped to shell + Suspense, parallel signed URLs on listing detail, 60s Meta API cache, polling skips when tab hidden
- [x] Storage bucket `listing-proofs` + RLS-aware signed URL access
- [x] Force dark mode CSS overrides
- [x] DB trigger fix (`handle_new_user`) — collision-safe usernames, error-tolerant
- [x] Generated DB types from live schema (instead of hand-written)
