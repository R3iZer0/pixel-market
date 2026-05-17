# PixelMarket — Build Tasks

## Phase 1 — Foundation ✅
- [x] Next.js 14 scaffold
- [x] Supabase schema (all 7 tables + RLS + triggers)
- [x] TypeScript DB types
- [x] Supabase browser / server / admin clients
- [x] Auth middleware (protected routes)
- [x] Landing page
- [x] GitHub repo

---

## Phase 2 — Auth
- [ ] `/login` page (email + Google + Meta OAuth)
- [ ] `/signup` page
- [ ] `/auth/callback` — Supabase OAuth redirect handler
- [ ] `/auth/meta/callback` — Meta OAuth callback (separate from login Meta connect)
- [ ] Profile auto-created on signup (trigger already in DB)
- [ ] Test: login with Meta, verify token stored, verify FB data pulled

---

## Phase 3 — Browse & Listings (Public)
- [ ] `/browse` — listings grid with filters
  - [ ] Filter: asset type, source type, event, retention range, category, geo, price range, audience size
  - [ ] Search bar
  - [ ] Sort: newest, price asc/desc, audience size
- [ ] `/listings/[id]` — listing detail page
  - [ ] Asset details, seller card, price, CTA (Buy / Make Trade Offer)
  - [ ] Seller rating + total sales

---

## Phase 4 — Listing Creation Wizard (Seller)
- [ ] `/listings/new` — 5-step wizard
  - [ ] Step 1: Connect Meta + select asset from live dropdown (pull from Meta API)
  - [ ] Step 2: Source details (dynamic fields per source type — 11 types)
  - [ ] Step 3: Categorize (primary + 2 secondary, geo, niche tags)
  - [ ] Step 4: Pricing (sale / trade / both, price, crypto toggle)
  - [ ] Step 5: Preview & publish
- [ ] `/my-listings` — seller manages own listings (edit, pause, delete)

---

## Phase 5 — Meta API Integration
- [ ] `GET /api/meta/assets` — fetch user's pixels + audiences from Meta
- [ ] `POST /api/meta/connect` — exchange Meta OAuth code → store long-lived token
- [ ] `POST /api/meta/transfer` — share asset to buyer's ad account (internal, called after payment)
- [ ] Token refresh cron (daily, Vercel cron) — refresh tokens expiring within 7 days
- [ ] Auto-pause listings on token failure + notify user

---

## Phase 6 — Checkout & Payments
- [ ] `POST /api/orders` — create order + checkout session
- [ ] Stripe Connect setup
  - [ ] Seller onboarding flow (`/settings` → Connect Stripe)
  - [ ] Stripe Checkout session (card payment)
  - [ ] `POST /api/webhooks/stripe` — handle `payment_intent.succeeded`, transfers, disputes
- [ ] Coinbase Commerce crypto checkout
  - [ ] Checkout modal: Card tab / Crypto tab (QR + 15min countdown)
  - [ ] `POST /api/webhooks/coinbase` — handle `charge:confirmed`, `charge:failed`
- [ ] Order state machine: `pending_payment → paid → transferring → transferred → completed`
- [ ] Auto-cancel after 30min if no payment

---

## Phase 7 — Orders & Transfer Flow
- [ ] `/orders` — buyer order history
- [ ] `/sales` — seller incoming orders
- [ ] `/orders/[id]` — order detail
  - [ ] Status stepper (pending → paid → transferring → transferred → completed)
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

## Phase 10 — Seller Settings & Profile
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
- [ ] Vercel deploy + env vars
- [ ] Supabase: enable email auth + configure OAuth providers in dashboard
