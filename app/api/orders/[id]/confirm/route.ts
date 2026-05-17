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

  // Mark listing as sold
  await admin.from('listings').update({ status: 'sold' }).eq('id', order.listing_id)

  // Increment seller total_sales
  const { data: seller } = await admin.from('profiles').select('total_sales').eq('id', order.seller_id).single()
  await admin.from('profiles').update({ total_sales: (seller?.total_sales || 0) + 1 }).eq('id', order.seller_id)

  return NextResponse.json({ success: true })
}
