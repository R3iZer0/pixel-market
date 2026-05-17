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

---

## Phase 2 — Auth ✅
- [x] `/login` page (email + Google button)
- [x] `/signup` page (email + Google button)
- [x] `/auth/callback` — Supabase OAuth redirect handler
- [x] `/api/auth/meta-connect` — direct FB OAuth (bypasses Supabase email scope conflict)
- [x] `/api/meta/callback` — FB OAuth callback, exchanges code → short token → long-lived token, stores in profiles
- [x] `/api/auth/signout`
- [x] Profile auto-created on signup (trigger fixed: collision-safe, RLS-safe, error-tolerant)
- [x] Test: Meta login works, FB ad accounts pulled live
- [x] Dashboard shows ALL pixels + custom audiences + lookalikes + engagement audiences from Meta
- [ ] Google OAuth button tested (works, untested end-to-end)
- [ ] Token refresh cron (60-day expiry — must build before launch)

---

## Phase 2.5 — Meta App Compliance (Legal) ✅
- [x] `/legal/privacy` — Privacy Policy (Meta-compliant, GDPR/CCPA)
- [x] `/legal/terms` — Terms of Service
- [x] `/legal/data-deletion` — User-facing deletion instructions
- [x] `/api/data-deletion` — Meta signed_request callback endpoint (HMAC-verified)
- [x] Footer links on landing page
- [ ] Paste URLs into Meta App Dashboard → Basic Settings (manual step)

---

## Phase 3 — Browse & Listings (PUBLIC)
- [ ] `/browse` — listings grid with filters
  - [ ] Filter: asset type, source type, event, retention range, category, geo, price range, audience size
  - [ ] Search bar
  - [ ] Sort: newest, price asc/desc, audience size
- [ ] `/listings/[id]` — listing detail page
  - [ ] Asset details, seller card, price, CTA (Buy / Make Trade Offer)
  - [ ] Seller rating + total sales

---

## Phase 4 — Listing Wizard (SELLER) ← **NEXT UP**
- [ ] `/listings/new` — 5-step wizard
  - [ ] Step 1: Pick asset from live Meta dropdown (pull from Meta API)
  - [ ] Step 2: Source details (dynamic fields per source type — 11 types)
  - [ ] Step 3: Categorize (primary + 2 secondary, geo, niche tags)
  - [ ] Step 4: Pricing (sale / trade / both, price, crypto toggle)
  - [ ] Step 5: Preview & publish
- [ ] `/my-listings` — seller manages own listings (edit, pause, delete)

---

## Phase 5 — Meta API Deep Integration
- [ ] `POST /api/meta/transfer` — share asset to buyer's ad account (called after payment)
- [ ] Lookalike workaround — share source audience + auto-recreate lookalike on buyer's account
- [ ] Token refresh cron (Vercel cron, daily) — refresh tokens expiring within 7 days
- [ ] Auto-pause listings on token failure + notify user

---

## Phase 6 — Checkout & Payments
- [ ] `POST /api/orders` — create order + checkout session
- [ ] Stripe Connect
  - [ ] Seller onboarding flow (`/settings` → Connect Stripe)
  - [ ] Stripe Checkout session (card payment)
  - [ ] `POST /api/webhooks/stripe` — handle `payment_intent.succeeded`, transfers, disputes
- [ ] Coinbase Commerce crypto
  - [ ] Checkout modal: Card tab / Crypto tab (QR + 15min countdown)
  - [ ] `POST /api/webhooks/coinbase` — handle `charge:confirmed`, `charge:failed`
- [ ] Order state machine: `pending_payment → paid → transferring → transferred → completed`
- [ ] Auto-cancel after 30min if no payment

---

## Phase 7 — Orders & Transfer Flow
- [ ] `/orders` — buyer order history
- [ ] `/sales` — seller incoming orders
- [ ] `/orders/[id]` — order detail
  - [ ] Status stepper
  - [ ] Meta transfer status badge
  - [ ] "Confirm receipt" button (buyer)
  - [ ] "Open dispute" button (buyer, within 7 days of transfer)
- [ ] `POST /api/orders/[id]/confirm` — buyer confirms receipt → triggers payout
- [ ] Auto-release payout after 7 days if no dispute
- [ ] `POST /api/orders/[id]/dispute` — open dispute

---

## Phase 8 — Trade Offers
- [ ] Trade offer flow on `/listings/[id]`
- [ ] Seller accepts/rejects trade offer
- [ ] Trade with cash top-up support
- [ ] Fee: 10% of lower asset's estimated value

---

## Phase 9 — Messaging
- [ ] `/messages/[threadId]` — order-based chat (Supabase Realtime)
- [ ] Unread count badge in nav

---

## Phase 10 — Settings & Profile
- [ ] `/settings` — profile edit, Meta connect/disconnect, Stripe Connect, crypto wallet
- [ ] `/profile/[username]` — public seller profile (listings, rating, reviews)
- [ ] Meta token expiry banner (shown when token expires < 7 days)

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
