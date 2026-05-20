import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  if (profile?.stripe_account_id) {
    const account = await stripe.accounts.retrieve(profile.stripe_account_id)
    await admin
      .from('profiles')
      .update({
        stripe_connect_charges_enabled: account.charges_enabled || false,
        stripe_connect_payouts_enabled: account.payouts_enabled || false,
      })
      .eq('id', user.id)
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/billing?status=connect_complete`)
}
