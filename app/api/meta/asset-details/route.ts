import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function fbGet<T>(path: string, token: string): Promise<T | { error: { message: string; code?: number } }> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`https://graph.facebook.com/v19.0${path}${sep}access_token=${token}`, { cache: 'no-store' })
  return await res.json()
}

const DAY = 24 * 60 * 60
const WINDOW_28D = 28 * DAY

async function getPixelDetails(pixelId: string, token: string) {
  const now = Math.floor(Date.now() / 1000)
  const start = now - WINDOW_28D

  const [base, statsByEvent, statsByHost, sharedAccounts, audiencesBuilt] = await Promise.all([
    fbGet<Record<string, unknown>>(
      `/${pixelId}?fields=id,name,creation_time,last_fired_time,code,data_use_setting,enable_automatic_matching,first_party_cookie_status`,
      token
    ),
    fbGet<{ data: Array<{ value: Array<[string, number]>; aggregation: string }> }>(
      `/${pixelId}/stats?aggregation=event&start_time=${start}&end_time=${now}`,
      token
    ),
    fbGet<{ data: Array<{ value: Array<[string, number]>; aggregation: string }> }>(
      `/${pixelId}/stats?aggregation=host&start_time=${start}&end_time=${now}`,
      token
    ),
    fbGet<{ data: Array<{ id: string; name?: string }> }>(`/${pixelId}/shared_accounts`, token),
    fbGet<{ data: Array<{ id: string; name: string; subtype?: string }> }>(`/${pixelId}/audiences?fields=id,name,subtype&limit=50`, token),
  ])

  const eventCounts: Array<{ event: string; count: number }> = []
  if (statsByEvent && 'data' in statsByEvent && statsByEvent.data?.[0]?.value) {
    for (const [event, count] of statsByEvent.data[0].value) {
      eventCounts.push({ event, count })
    }
  }
  eventCounts.sort((a, b) => b.count - a.count)

  const hostCounts: Array<{ host: string; count: number }> = []
  if (statsByHost && 'data' in statsByHost && statsByHost.data?.[0]?.value) {
    for (const [host, count] of statsByHost.data[0].value) {
      hostCounts.push({ host, count })
    }
  }
  hostCounts.sort((a, b) => b.count - a.count)

  return {
    base: 'error' in base ? null : base,
    events_28d: eventCounts,
    hosts_28d: hostCounts,
    shared_accounts: ('data' in sharedAccounts ? sharedAccounts.data : []) || [],
    audiences_built: ('data' in audiencesBuilt ? audiencesBuilt.data : []) || [],
    window_start: start,
    window_end: now,
  }
}

async function getAudienceDetails(audienceId: string, token: string) {
  const base = await fbGet<Record<string, unknown> & {
    subtype?: string
    lookalike_spec?: { origin?: Array<{ id: string; name: string; type: string }>; country?: string; ratio?: number }
    data_source?: { type?: string; sub_type?: string; creation_params?: Record<string, unknown> }
    rule?: string
  }>(
    `/${audienceId}?fields=id,name,subtype,description,approximate_count_lower_bound,approximate_count_upper_bound,retention_days,time_created,time_updated,data_source,rule,rule_aggregation,lookalike_spec,operation_status,delivery_status`,
    token
  )

  if ('error' in base) return { base: null, origin: null, origin_pixel: null }

  // If lookalike, fetch origin audience details
  let origin: Record<string, unknown> | null = null
  let originPixel: Record<string, unknown> | null = null
  const originRef = base.lookalike_spec?.origin?.[0]
  if (base.subtype === 'LOOKALIKE' && originRef?.id) {
    const originRes = await fbGet<Record<string, unknown> & {
      data_source?: { creation_params?: { pixel_id?: string } }
      subtype?: string
    }>(
      `/${originRef.id}?fields=id,name,subtype,description,approximate_count_lower_bound,approximate_count_upper_bound,retention_days,data_source,time_created`,
      token
    )
    if (!('error' in originRes)) {
      origin = originRes
      // If origin is pixel-based, fetch the pixel
      const pixelId = originRes.data_source?.creation_params?.pixel_id
      if (pixelId) {
        const pxRes = await fbGet<Record<string, unknown>>(
          `/${pixelId}?fields=id,name,creation_time,last_fired_time`,
          token
        )
        if (!('error' in pxRes)) originPixel = pxRes
      }
    }
  }

  // If website audience, parse rule for context
  let parsedRule: unknown = null
  if (base.rule) {
    try { parsedRule = JSON.parse(base.rule) } catch {}
  }

  return {
    base,
    origin,
    origin_pixel: originPixel,
    parsed_rule: parsedRule,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'pixel' | 'audience'
  const id = searchParams.get('id')

  if (!type || !id) return NextResponse.json({ error: 'Missing type or id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('meta_access_token').eq('id', user.id).single()
  if (!profile?.meta_access_token) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  const token = profile.meta_access_token

  try {
    if (type === 'pixel') {
      const details = await getPixelDetails(id, token)
      return NextResponse.json(details)
    } else if (type === 'audience') {
      const details = await getAudienceDetails(id, token)
      return NextResponse.json(details)
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
