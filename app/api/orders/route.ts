import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, getOrCreateCustomer } from '@/lib/stripe'
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
  const { listing_id, buyer_ad_account_id, buyer_business_id, payment_method, offer_id } = body

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
  // Resolve price: offer override or listing price
  let finalPrice = listing.price_cents
  if (offer_id) {
    const { data: offer } = await admin.from('price_offers').select('*').eq('id', offer_id).single()
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    if (offer.buyer_id !== user.id) return NextResponse.json({ error: 'Offer not yours' }, { status: 403 })
    if (offer.listing_id !== listing.id) return NextResponse.json({ error: 'Offer/listing mismatch' }, { status: 400 })
    if (offer.status !== 'accepted') return NextResponse.json({ error: 'Offer not accepted' }, { status: 400 })
    finalPrice = offer.amount_cents
  }
  if (finalPrice == null) return NextResponse.json({ error: 'No price' }, { status: 400 })

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

  const platform_fee_cents = Math.round(finalPrice * 0.1)
  const seller_payout_cents = finalPrice - platform_fee_cents

  const { data: order, error: oerr } = await admin
    .from('orders')
    .insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      transaction_type: 'sale',
      payment_method,
      amount_cents: finalPrice,
      platform_fee_cents,
      seller_payout_cents,
      buyer_meta_ad_account_id: buyerAcct,
      status: 'pending_payment',
    })
    .select()
    .single()

  if (oerr) return NextResponse.json({ error: oerr.message }, { status: 500 })

  // Create Stripe Checkout session if Stripe selected
  let checkoutUrl: string | null = null
  if (payment_method === 'stripe' && user.email) {
    const customerId = await getOrCreateCustomer(user.id, user.email)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: finalPrice,
          product_data: {
            name: listing.title,
            description: `${listing.asset_type} listing on PixelMarket`,
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        metadata: { order_id: order.id, user_id: user.id },
      },
      metadata: {
        order_id: order.id,
        user_id: user.id,
        type: 'order',
        buyer_business_id: buyer_business_id || '',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?cancelled=1`,
    })
    checkoutUrl = session.url
    await admin
      .from('orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id)
  }

  return NextResponse.json({ order, buyer_business_id, checkout_url: checkoutUrl })
}
