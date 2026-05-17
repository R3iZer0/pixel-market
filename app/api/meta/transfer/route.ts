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
      // Two-step:
      // 1. Share source audience to buyer's account (seller's token)
      // 2. Recreate lookalike on buyer's account (buyer's token)

      type LookalikeExtra = {
        origin_audiences?: Array<{ id: string; name?: string; type?: string }>
        lookalike_country?: string
        lookalike_ratio?: number
      }
      const extra = (listing.source_extra as LookalikeExtra) || {}
      const originAudienceId = extra.origin_audiences?.[0]?.id
      if (!originAudienceId) {
        return NextResponse.json({ error: 'Lookalike source audience ID missing from listing' }, { status: 400 })
      }

      // Need buyer's token for step 2
      let buyerToken: string | null = null
      if (body.buyer_user_id) {
        const { data: buyer } = await admin
          .from('profiles')
          .select('meta_access_token')
          .eq('id', body.buyer_user_id)
          .single()
        buyerToken = buyer?.meta_access_token || null
      }
      if (!buyerToken) {
        return NextResponse.json({ error: 'Lookalike transfer requires buyer Meta connection (buyer_user_id missing or buyer not connected)' }, { status: 400 })
      }

      // Step 1: share source audience to buyer's account
      const shareRes = await fbCall('POST', `/${originAudienceId}/adaccounts`, seller.meta_access_token, {
        adaccount_id: buyerAcct,
      })
      if (shareRes.error) {
        return NextResponse.json({ error: `Source audience share failed: ${shareRes.error.message}`, step: 'share_source' }, { status: 400 })
      }

      // Step 2: create lookalike on buyer's account
      const createRes = await fbCall('POST', `/${buyerAcct}/customaudiences`, buyerToken, {
        name: `[Bought] ${listing.title}`,
        subtype: 'LOOKALIKE',
        origin_audience_id: originAudienceId,
        lookalike_spec: JSON.stringify({
          type: 'custom_ratio',
          ratio: extra.lookalike_ratio || 0.01,
          country: extra.lookalike_country || 'US',
        }),
      })
      transferResult = { share: shareRes, create: createRes }
      if (createRes.error) { transferStatus = 'failed'; transferError = createRes.error.message }
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
