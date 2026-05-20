import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

const VALID_STATUSES = ['pending_payment', 'paid', 'transferring', 'transferred', 'completed', 'canceled']

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const adminUser = await checkAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const supabase = createAdminClient()
  const body = await request.json()

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const update: Record<string, unknown> = { status: body.status }
  if (body.status === 'completed') {
    update.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('orders')
    .update(update as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ order: data })
}
