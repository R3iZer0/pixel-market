import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const admin = createAdminClient()

  // Pause all active listings (token will be gone, can't transfer)
  await admin
    .from('listings')
    .update({ status: 'paused' })
    .eq('seller_id', user.id)
    .eq('status', 'active')

  await admin
    .from('profiles')
    .update({
      meta_access_token: null,
      meta_token_expires: null,
      meta_business_id: null,
      meta_ad_account_id: null,
    })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
