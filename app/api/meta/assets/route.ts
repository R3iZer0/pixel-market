import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type AdAccount = { id: string; name: string; currency?: string; account_status?: number }
type Pixel = { id: string; name: string; creation_time?: string; last_fired_time?: string }
type Audience = {
  id: string
  name: string
  subtype: string
  approximate_count_lower_bound?: number
  approximate_count_upper_bound?: number
  retention_days?: number
  description?: string
  data_source?: { type?: string; sub_type?: string }
}

async function fbGet<T>(path: string, token: string): Promise<T | { error: { message: string; code?: number } }> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`https://graph.facebook.com/v19.0${path}${sep}access_token=${token}`, { cache: 'no-store' })
  return await res.json()
}

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
        fbGet<{ data: Pixel[] }>(`/${acc.id}/adspixels?fields=id,name,creation_time,last_fired_time`, token),
        fbGet<{ data: Audience[] }>(`/${acc.id}/customaudiences?fields=id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,retention_days,description,data_source&limit=200`, token),
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
