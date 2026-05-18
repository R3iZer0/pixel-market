import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const admin = createAdminClient()

  // Cancel pending orders
  await admin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('buyer_id', user.id)
    .eq('status', 'pending_payment')

  // Mark all listings expired
  await admin
    .from('listings')
    .update({ status: 'expired' })
    .eq('seller_id', user.id)

  // Delete the user (cascades to profiles via FK)
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sign out client side
  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
