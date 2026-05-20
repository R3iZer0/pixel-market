import { createClient } from '@/lib/supabase/server'
import { stripe, getOrCreateCustomer } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const customerId = await getOrCreateCustomer(user.id, user.email)
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })

  return NextResponse.json({ url: session.url })
}
