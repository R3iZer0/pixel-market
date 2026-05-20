import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return null
  }
  return user
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const adminUser = await checkAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const supabase = createAdminClient()
  const body = await request.json()

  const allowed = ['display_name', 'username', 'bio', 'is_verified', 'subscription_status']
  const update: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) update[k] = body[k]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const adminUser = await checkAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const supabase = createAdminClient()
  const url = new URL(request.url)
  const action = url.searchParams.get('action') ?? 'ban'

  if (action === 'ban') {
    // Cancel subscription + expire all listings
    await supabase
      .from('profiles')
      .update({ subscription_status: 'canceled' } as never)
      .eq('id', id)

    await supabase
      .from('listings')
      .update({ status: 'expired' } as never)
      .eq('seller_id', id)
      .in('status', ['active', 'paused'])

    return NextResponse.json({ success: true, action: 'banned' })
  }

  if (action === 'delete') {
    // Expire all listings first
    await supabase
      .from('listings')
      .update({ status: 'expired' } as never)
      .eq('seller_id', id)

    // Delete the auth user (cascades to profile if FK set up, else profile stays)
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Also delete profile directly
    await supabase.from('profiles').delete().eq('id', id)

    return NextResponse.json({ success: true, action: 'deleted' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
