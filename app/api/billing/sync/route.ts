import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, getOrCreateCustomer } from '@/lib/stripe'
import { NextResponse } from 'next/server'

// Pulls subscription + connect status from Stripe and writes to profile.
// Belt-and-suspenders alongside webhook (works even if webhook missed an event).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const admin = createAdminClient()
  const customerId = await getOrCreateCustomer(user.id, user.email)

  // Find any subscription for this customer
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
  // Pick the most relevant one (active/trialing first, then most recent)
  const active = subs.data.find(s => ['active', 'trialing'].includes(s.status))
  const sub = active || subs.data[0] || null

  const updates: Record<string, unknown> = {}
  if (sub) {
    updates.subscription_status = sub.status
    const cpe = (sub.items.data[0] as unknown as { current_period_end?: number })?.current_period_end
      || (sub as unknown as { current_period_end?: number }).current_period_end
    updates.subscription_current_period_end = cpe ? new Date(cpe * 1000).toISOString() : null
    updates.trial_ends_at = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
  } else {
    updates.subscription_status = null
  }

  // Also sync Stripe Connect status
  const { data: prof } = await admin.from('profiles').select('stripe_account_id').eq('id', user.id).single()
  if (prof?.stripe_account_id) {
    try {
      const account = await stripe.accounts.retrieve(prof.stripe_account_id)
      updates.stripe_connect_charges_enabled = account.charges_enabled || false
      updates.stripe_connect_payouts_enabled = account.payouts_enabled || false
    } catch (e) {
      // ignore
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await admin.from('profiles').update(updates as any).eq('id', user.id)

  return NextResponse.json({ updated: updates, subscription: sub ? { id: sub.id, status: sub.status } : null })
}
