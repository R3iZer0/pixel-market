import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

// Start Stripe Connect Express onboarding (for sellers to receive payouts)
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  let accountId = profile?.stripe_account_id
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: { user_id: user.id },
    })
    accountId = account.id
    await admin
      .from('profiles')
      .update({ stripe_account_id: accountId })
      .eq('id', user.id)
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/connect/start`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/connect/return`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: link.url })
}
