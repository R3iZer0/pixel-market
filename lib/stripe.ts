import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const SUBSCRIPTION_PRICE_USD = 30
export const SUBSCRIPTION_TRIAL_DAYS = 3
const PRODUCT_KEY = 'subscription_product_id'
const PRICE_KEY = 'subscription_price_id'

// Lazy create + cache subscription product/price
export async function getOrCreateSubscriptionPrice(): Promise<{ productId: string; priceId: string }> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (admin as any)
    .from('system_settings')
    .select('key, value')
    .in('key', [PRODUCT_KEY, PRICE_KEY])

  const map = new Map<string, string>((settings || []).map((r: { key: string; value: string }) => [r.key, r.value]))
  let productId = map.get(PRODUCT_KEY) || null
  let priceId = map.get(PRICE_KEY) || null

  if (!productId) {
    const product = await stripe.products.create({
      name: 'PixelMarket Subscription',
      description: 'Monthly access to the PixelMarket marketplace.',
    })
    productId = product.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('system_settings').upsert({ key: PRODUCT_KEY, value: productId })
  }

  if (!priceId) {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: SUBSCRIPTION_PRICE_USD * 100,
      currency: 'usd',
      recurring: { interval: 'month' },
    })
    priceId = price.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('system_settings').upsert({ key: PRICE_KEY, value: priceId })
  }

  return { productId: productId!, priceId: priceId! }
}

export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) return profile.stripe_customer_id

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  })

  await admin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

export function hasActiveSubscription(profile: { subscription_status: string | null }): boolean {
  return ['trialing', 'active'].includes(profile.subscription_status || '')
}
