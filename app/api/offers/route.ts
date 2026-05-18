import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/offers — buyer creates an offer on a listing
// Body: { listing_id, amount_cents, message? }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { listing_id, amount_cents, message } = await request.json()
  if (!listing_id || !amount_cents) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (typeof amount_cents !== 'number' || amount_cents <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const admin = createAdminClient()
  const { data: listing } = await admin.from('listings').select('id, seller_id, status').eq('id', listing_id).single()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (listing.status !== 'active') return NextResponse.json({ error: 'Listing not active' }, { status: 400 })
  if (listing.seller_id === user.id) return NextResponse.json({ error: 'Cannot offer on your own listing' }, { status: 400 })

  // Withdraw any prior pending offer from same buyer on this listing
  await admin
    .from('price_offers')
    .update({ status: 'withdrawn' })
    .eq('listing_id', listing_id)
    .eq('buyer_id', user.id)
    .eq('status', 'pending')

  const { data, error } = await admin.from('price_offers').insert({
    listing_id,
    buyer_id: user.id,
    seller_id: listing.seller_id,
    amount_cents,
    message: message || null,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also send a message in the thread describing the offer
  await admin.from('messages').insert({
    sender_id: user.id,
    listing_id,
    body: `💰 Made an offer: $${(amount_cents / 100).toFixed(2)}${message ? `\n\n${message}` : ''}`,
  })

  return NextResponse.json({ offer: data })
}
