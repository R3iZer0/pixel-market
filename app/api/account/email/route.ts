import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { email } = await request.json()
  if (!email || typeof email !== 'string') return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  // Supabase sends a confirmation email to BOTH old and new addresses
  const { error } = await supabase.auth.updateUser({ email })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true, message: 'Confirmation links sent to both old and new email addresses.' })
}
