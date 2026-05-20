import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: order } = await admin.from('orders').select('*').eq('id', id).single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['transferred', 'paid'].includes(order.status)) {
    return NextResponse.json({ error: `Cannot confirm order in status ${order.status}` }, { status: 400 })
  }

  await admin.from('orders').update({
    status: 'completed',
    buyer_confirmed_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }).eq('id', id)

  await admin.from('listings').update({ status: 'sold' }).eq('id', order.listing_id)

  const { data: seller } = await admin.from('profiles').select('total_sales, crypto_wallet').eq('id', order.seller_id).single()
  await admin.from('profiles').update({ total_sales: (seller?.total_sales || 0) + 1 }).eq('id', order.seller_id)

  // Create payout row — releasable 7 days from now
  // Since user model is sub-based (no platform fee), seller gets 100% of order amount
  const releasableAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const payoutMethod = order.payment_method === 'coinbase' ? 'crypto' : 'stripe'

  await admin.from('payouts').insert({
    seller_id: order.seller_id,
    order_id: order.id,
    amount_cents: order.amount_cents || 0,
    payout_method: payoutMethod,
    status: 'pending',
    releasable_at: releasableAt,
  })

  return NextResponse.json({ success: true })
}
