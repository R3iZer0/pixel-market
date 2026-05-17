import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH: pause/unpause/edit own listing
// DELETE: soft-delete (mark expired) own listing

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  const allowed = ['title', 'description', 'price_cents', 'accepts_crypto', 'status']
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) update[k] = body[k]
  if (update.status && !['active', 'paused'].includes(update.status as string)) {
    return NextResponse.json({ error: 'Status must be active or paused' }, { status: 400 })
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await supabase
    .from('listings')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(update as any)
    .eq('id', id)
    .eq('seller_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listing: data })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { error } = await supabase
    .from('listings')
    .update({ status: 'expired' })
    .eq('id', id)
    .eq('seller_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
