import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: offer } = await admin.from('price_offers').select('*').eq('id', id).single()
  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  if (offer.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (offer.status !== 'pending') return NextResponse.json({ error: `Offer is ${offer.status}` }, { status: 400 })

  await admin.from('price_offers').update({ status: 'accepted' }).eq('id', id)

  await admin.from('messages').insert({
    sender_id: user.id,
    listing_id: offer.listing_id,
    body: `✅ Accepted offer of $${(offer.amount_cents / 100).toFixed(2)}. Buyer can now check out at this price.`,
  })

  return NextResponse.json({ success: true, offer_id: id, amount_cents: offer.amount_cents, listing_id: offer.listing_id })
}
