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

## Phase 6 — Checkout & Payments (NEXT)
- [x] `POST /api/orders` — create pending_payment order (with buyer ad acct + payment method)
- [x] `/listings/[id]/buy` — buyer ad-account picker + BM picker for pixels, enforces Meta connected
- [x] **DEV** `POST /api/orders/[id]/test-pay` — simulate payment success + trigger transfer
- [ ] Stripe Connect
  - [ ] Seller onboarding flow (`/settings` → Connect Stripe)
  - [ ] Stripe Checkout session (card payment)
  - [ ] `POST /api/webhooks/stripe`
- [ ] Coinbase Commerce crypto
  - [ ] Checkout: QR + 15min countdown
  - [ ] `POST /api/webhooks/coinbase`
- [x] Order state machine: `pending_payment → paid → transferring → transferred → completed`
- [ ] Auto-cancel after 30min if no payment

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

## Phase 9 — Messaging
- [ ] `/messages/[threadId]` — order-based chat (Supabase Realtime)
- [ ] Unread count badge in nav

---

## Phase 10 — Settings & Profile
- [ ] `/settings` — profile edit, Meta connect/disconnect, Stripe Connect, crypto wallet
- [ ] `/profile/[username]` — public seller profile (listings, rating, reviews)
- [x] Meta token expiry banner on dashboard (basic)
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
- [x] Storage bucket `listing-proofs` + RLS-aware signed URL access
- [x] Force dark mode CSS overrides
- [x] DB trigger fix (`handle_new_user`) — collision-safe usernames, error-tolerant
- [x] Generated DB types from live schema (instead of hand-written)
