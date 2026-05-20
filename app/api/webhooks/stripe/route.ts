import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function getRawBody(request: Request): Promise<string> {
  return await request.text()
}

export async function POST(request: Request) {
  const body = await getRawBody(request)
  const signature = request.headers.get('stripe-signature') || ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    return NextResponse.json({ error: `Signature verification failed: ${(err as Error).message}` }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata || {}

        if (meta.type === 'order' && meta.order_id) {
          // Buyer paid for a listing
          await admin
            .from('orders')
            .update({
              status: 'paid',
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_checkout_session_id: session.id,
            })
            .eq('id', meta.order_id)

          // Trigger Meta transfer
          const { data: order } = await admin.from('orders').select('*').eq('id', meta.order_id).single()
          if (order) {
            const transferRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meta/transfer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-internal': 'webhook' },
              body: JSON.stringify({
                listing_id: order.listing_id,
                buyer_ad_account_id: order.buyer_meta_ad_account_id,
                buyer_user_id: order.buyer_id,
                order_id: order.id,
              }),
            }).catch(e => { console.error('Transfer trigger failed:', e); return null })
            if (transferRes) await transferRes.json().catch(() => null)
          }
        }
        // Subscription checkouts fire customer.subscription.created separately
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.user_id
        if (userId) {
          const currentPeriodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
          await admin
            .from('profiles')
            .update({
              subscription_status: sub.status,
              subscription_current_period_end: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : null,
              trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.user_id
        if (userId) {
          await admin
            .from('profiles')
            .update({ subscription_status: 'canceled' })
            .eq('id', userId)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const userId = account.metadata?.user_id
        if (userId) {
          await admin
            .from('profiles')
            .update({
              stripe_connect_charges_enabled: account.charges_enabled || false,
              stripe_connect_payouts_enabled: account.payouts_enabled || false,
            })
            .eq('id', userId)
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
