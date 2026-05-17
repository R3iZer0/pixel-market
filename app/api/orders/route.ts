import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Create a pending_payment order
// Body: {
//   listing_id, buyer_ad_account_id, buyer_business_id? (for pixel),
//   payment_method: 'stripe' | 'coinbase'
// }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  const { listing_id, buyer_ad_account_id, buyer_business_id, payment_method } = body

  if (!listing_id || !buyer_ad_account_id || !payment_method) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['stripe', 'coinbase'].includes(payment_method)) {
    return NextResponse.json({ error: 'Invalid payment_method' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Load listing
  const { data: listing, error: lerr } = await admin
    .from('listings')
    .select('*')
    .eq('id', listing_id)
    .single()
  if (lerr || !listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (listing.status !== 'active') return NextResponse.json({ error: 'Listing not active' }, { status: 400 })
  if (listing.seller_id === user.id) return NextResponse.json({ error: 'Cannot buy your own listing' }, { status: 400 })
  if (listing.price_cents == null) return NextResponse.json({ error: 'Listing has no price' }, { status: 400 })

  // Buyer must have Meta connected
  const { data: buyerProfile } = await admin
    .from('profiles')
    .select('meta_access_token')
    .eq('id', user.id)
    .single()
  if (!buyerProfile?.meta_access_token) {
    return NextResponse.json({ error: 'Connect your Meta account before buying' }, { status: 400 })
  }

  // For pixel, require BM id
  if (listing.asset_type === 'pixel' && !buyer_business_id) {
    return NextResponse.json({ error: 'Pixel purchases require a Business Manager ID' }, { status: 400 })
  }

  const buyerAcct = buyer_ad_account_id.startsWith('act_') ? buyer_ad_account_id : `act_${buyer_ad_account_id}`

  const platform_fee_cents = Math.round(listing.price_cents * 0.1)
  const seller_payout_cents = listing.price_cents - platform_fee_cents

  const { data: order, error: oerr } = await admin
    .from('orders')
    .insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      transaction_type: 'sale',
      payment_method,
      amount_cents: listing.price_cents,
      platform_fee_cents,
      seller_payout_cents,
      buyer_meta_ad_account_id: buyerAcct,
      status: 'pending_payment',
    })
    .select()
    .single()

  if (oerr) return NextResponse.json({ error: oerr.message }, { status: 500 })

  // Store buyer_business_id in order if pixel (reuse seller_wallet_address temporarily? no — add it to a comment for now via stripe_transfer_id field? Better: skip persisting, pass at transfer time)
  // For pixel transfers, we'll need buyer_business_id at transfer. Store it on the order via update.
  if (buyer_business_id) {
    // Put buyer BM in a free-text-ish field. orders table doesn't have one for this, use a side effect: store in profile? No.
    // Simplest: add to coinbase_charge_code field (we won't use this for pixel orders) — gross. Better: just look it up at transfer time from a buyer hint.
    // Pragmatic: pass it through the test-pay endpoint. Skip persisting now.
  }

  return NextResponse.json({ order, buyer_business_id })
}
