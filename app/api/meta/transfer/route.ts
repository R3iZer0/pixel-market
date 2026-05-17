import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Transfer a listed Meta asset from seller → buyer.
// Body: {
//   listing_id: uuid,
//   buyer_user_id?: uuid,          // user id of buyer (to fetch their token if needed for lookalike)
//   buyer_ad_account_id: string,   // act_XXXX
//   buyer_business_id?: string,    // required for pixel transfers (Business Manager id)
//   order_id?: uuid                // optional — if provided, will update order status fields
//   test_mode?: boolean            // if true, don't update orders table
// }

type TransferBody = {
  listing_id: string
  buyer_user_id?: string
  buyer_ad_account_id: string
  buyer_business_id?: string
  order_id?: string
  test_mode?: boolean
}

async function fbCall(method: 'GET' | 'POST', path: string, token: string, body?: Record<string, unknown>) {
  const url = `https://graph.facebook.com/v19.0${path}`
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(body)) params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
    params.set('access_token', token)
    init.body = params.toString()
    init.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
  }
  const finalUrl = method === 'GET' ? `${url}${path.includes('?') ? '&' : '?'}access_token=${token}` : url
  const res = await fetch(finalUrl, init)
  return await res.json()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = (await request.json()) as TransferBody
  if (!body.listing_id || !body.buyer_ad_account_id) {
    return NextResponse.json({ error: 'Missing listing_id or buyer_ad_account_id' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Load listing
  const { data: listing, error: lerr } = await admin
    .from('listings')
    .select('*')
    .eq('id', body.listing_id)
    .single()
  if (lerr || !listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  // Load seller's Meta token
  const { data: seller } = await admin
    .from('profiles')
    .select('meta_access_token, meta_token_expires')
    .eq('id', listing.seller_id)
    .single()
  if (!seller?.meta_access_token) {
    return NextResponse.json({ error: 'Seller has not connected Meta' }, { status: 400 })
  }
  if (seller.meta_token_expires && new Date(seller.meta_token_expires) < new Date()) {
    return NextResponse.json({ error: 'Seller Meta token expired' }, { status: 400 })
  }

  // Buyer ad account must be prefixed with act_
  const buyerAcct = body.buyer_ad_account_id.startsWith('act_') ? body.buyer_ad_account_id : `act_${body.buyer_ad_account_id}`

  let transferResult: Record<string, unknown> = {}
  let transferStatus: 'sent' | 'failed' = 'sent'
  let transferError: string | null = null

  try {
    if (listing.asset_type === 'pixel') {
      // Requires buyer Business Manager ID
      if (!body.buyer_business_id) {
        return NextResponse.json({ error: 'Pixel transfer requires buyer_business_id' }, { status: 400 })
      }
      const res = await fbCall('POST', `/${listing.meta_asset_id}/shared_accounts`, seller.meta_access_token, {
        business: body.buyer_business_id,
        account_id: buyerAcct,
      })
      transferResult = res
      if (res.error) { transferStatus = 'failed'; transferError = res.error.message }
    }
    else if (listing.asset_type === 'custom_audience' || listing.asset_type === 'engagement_audience') {
      const res = await fbCall('POST', `/${listing.meta_asset_id}/adaccounts`, seller.meta_access_token, {
        adaccount_id: buyerAcct,
        relationship_type: ['IN_BUSINESS'],
        permissions: ['CAN_EDIT'],
      })
      transferResult = res
      if (res.error) {
        // Try simpler form
        const retry = await fbCall('POST', `/${listing.meta_asset_id}/adaccounts`, seller.meta_access_token, {
          adaccount_id: buyerAcct,
        })
        transferResult = retry
        if (retry.error) { transferStatus = 'failed'; transferError = retry.error.message }
      }
    }
    else if (listing.asset_type === 'lookalike_audience') {
      // Lookalikes ARE custom audiences (subtype=LOOKALIKE) — share directly.
      // Buyer uses it as-is for targeting. Can't refresh, but doesn't need to.
      const res = await fbCall('POST', `/${listing.meta_asset_id}/adaccounts`, seller.meta_access_token, {
        adaccount_id: buyerAcct,
      })
      transferResult = res
      if (res.error) { transferStatus = 'failed'; transferError = res.error.message }
    }
    else {
      return NextResponse.json({ error: `Unknown asset_type: ${listing.asset_type}` }, { status: 400 })
    }
  } catch (e) {
    transferStatus = 'failed'
    transferError = (e as Error).message
    transferResult = { exception: transferError }
  }

  // Update order if provided
  if (body.order_id && !body.test_mode) {
    await admin
      .from('orders')
      .update({
        meta_transfer_status: transferStatus,
        meta_transfer_error: transferError,
        status: transferStatus === 'sent' ? 'transferred' : 'paid',
      })
      .eq('id', body.order_id)
  }

  return NextResponse.json({
    success: transferStatus === 'sent',
    status: transferStatus,
    error: transferError,
    result: transferResult,
  })
}
