import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// DEV: simulate payment success → trigger Meta transfer
// Body: { buyer_business_id? } (for pixel)

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { buyer_business_id } = body

  const admin = createAdminClient()
  const { data: order } = await admin.from('orders').select('*').eq('id', id).single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (order.status !== 'pending_payment') return NextResponse.json({ error: `Order is ${order.status}` }, { status: 400 })

  // Mark as paid
  await admin.from('orders').update({ status: 'paid' }).eq('id', id)

  // Trigger transfer
  const transferRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meta/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // forward auth cookie
      cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify({
      listing_id: order.listing_id,
      buyer_ad_account_id: order.buyer_meta_ad_account_id,
      buyer_business_id,
      buyer_user_id: user.id,
      order_id: id,
    }),
  })
  const transferData = await transferRes.json()

  // Re-read order to return current state
  const { data: updated } = await admin.from('orders').select('*').eq('id', id).single()

  return NextResponse.json({ order: updated, transfer: transferData })
}
