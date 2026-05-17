import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()

  const required = ['title', 'asset_type', 'transaction_type', 'meta_asset_id', 'meta_ad_account_id']
  for (const f of required) {
    if (!body[f]) return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      title: body.title,
      description: body.description || null,
      asset_type: body.asset_type,
      transaction_type: body.transaction_type,
      price_cents: body.price_cents ?? null,
      estimated_value_cents: body.estimated_value_cents ?? null,
      accepts_crypto: !!body.accepts_crypto,
      meta_asset_id: body.meta_asset_id,
      meta_ad_account_id: body.meta_ad_account_id,
      audience_source: body.audience_source || null,
      source_event: body.source_event || null,
      source_url: body.source_url || null,
      source_name: body.source_name || null,
      source_platform: body.source_platform || null,
      source_extra: body.source_extra || null,
      audience_size: body.audience_size ?? null,
      retention_days: body.retention_days ?? null,
      geo: body.geo || null,
      niche: body.niche || null,
      primary_category: body.primary_category || null,
      secondary_categories: body.secondary_categories || null,
      pixel_age_days: body.pixel_age_days ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ listing: data })
}
