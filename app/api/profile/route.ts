import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_FIELDS = ['display_name', 'bio', 'avatar_url', 'crypto_wallet', 'preferred_chain', 'username']

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  const update: Record<string, unknown> = {}
  for (const k of ALLOWED_FIELDS) if (k in body) update[k] = body[k]
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  // Validate username if provided
  if (typeof update.username === 'string') {
    const u = (update.username as string).trim().toLowerCase()
    if (!/^[a-z0-9_]{3,30}$/.test(u)) {
      return NextResponse.json({ error: 'Username must be 3–30 chars, a–z 0–9 _' }, { status: 400 })
    }
    update.username = u
  }

  const { data, error } = await supabase
    .from('profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(update as any)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ profile: data })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
