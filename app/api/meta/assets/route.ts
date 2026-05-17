import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type AdAccount = { id: string; name: string; currency?: string; account_status?: number }

type Pixel = {
  id: string
  name: string
  creation_time?: string
  last_fired_time?: string
  is_unavailable?: boolean
  owner_ad_account?: { id: string; name: string }
  owner_business?: { id: string; name: string }
  code?: string
}

type Audience = {
  id: string
  name: string
  subtype: string  // CUSTOM, WEBSITE, APP, CLAIM, LOOKALIKE, ENGAGEMENT, PARTNER, MANAGED, VIDEO, BAG_OF_ACCOUNTS, STUDY_RULE_AUDIENCE, FOX, OFFLINE_CONVERSION, etc.
  approximate_count_lower_bound?: number
  approximate_count_upper_bound?: number
  retention_days?: number
  description?: string
  time_created?: number
  time_updated?: number
  data_source?: {
    type?: string
    sub_type?: string
    creation_params?: { event_name?: string; page_id?: string; video_id?: string; app_id?: string }
  }
  rule?: string  // JSON string for website audiences
  rule_aggregation?: string
  lookalike_spec?: {
    type?: string
    ratio?: number
    country?: string
    starting_ratio?: number
    origin?: Array<{ id: string; name: string; type: string }>
    origin_event_source_name?: string
  }
  operation_status?: { code: number; description: string }
  delivery_status?: { code: number; description: string }
}

async function fbGet<T>(path: string, token: string): Promise<T | { error: { message: string; code?: number } }> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`https://graph.facebook.com/v19.0${path}${sep}access_token=${token}`, { cache: 'no-store' })
  return await res.json()
}

const PIXEL_FIELDS = 'id,name,creation_time,last_fired_time'
const AUDIENCE_FIELDS = 'id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,retention_days,description,time_created,time_updated,data_source,lookalike_spec,operation_status'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('meta_access_token').eq('id', user.id).single()
  if (!profile?.meta_access_token) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  const token = profile.meta_access_token

  const adAccountsRes = await fbGet<{ data: AdAccount[] }>('/me/adaccounts?fields=id,name,currency,account_status', token)
  if ('error' in adAccountsRes) return NextResponse.json({ error: adAccountsRes.error.message }, { status: 400 })

  const adAccounts = adAccountsRes.data || []

  const results = await Promise.all(
    adAccounts.map(async (acc) => {
      const [pixelsRes, audiencesRes] = await Promise.all([
        fbGet<{ data: Pixel[] }>(`/${acc.id}/adspixels?fields=${PIXEL_FIELDS}`, token),
        fbGet<{ data: Audience[] }>(`/${acc.id}/customaudiences?fields=${AUDIENCE_FIELDS}&limit=200`, token),
      ])

      const pixels = ('data' in pixelsRes ? pixelsRes.data : []) || []
      const audiences = ('data' in audiencesRes ? audiencesRes.data : []) || []

      return {
        ad_account: acc,
        pixels: pixels.map(p => ({ ...p, ad_account_id: acc.id, ad_account_name: acc.name })),
        audiences: audiences.map(a => ({ ...a, ad_account_id: acc.id, ad_account_name: acc.name })),
      }
    })
  )

  return NextResponse.json({ accounts: results })
}
