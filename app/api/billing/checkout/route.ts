import { createClient } from '@/lib/supabase/server'
import { stripe, getOrCreateCustomer, getOrCreateSubscriptionPrice, SUBSCRIPTION_TRIAL_DAYS } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const customerId = await getOrCreateCustomer(user.id, user.email)
  const { priceId } = await getOrCreateSubscriptionPrice()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: SUBSCRIPTION_TRIAL_DAYS,
      metadata: { user_id: user.id },
    },
    metadata: { user_id: user.id, type: 'subscription' },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
