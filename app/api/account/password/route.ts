import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { current_password, new_password } = await request.json()
  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'Both current and new password required' }, { status: 400 })
  }
  if (new_password.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
  }

  // Verify current password by attempting sign-in
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  })
  if (verifyErr) return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 })

  // Update password
  const { error } = await supabase.auth.updateUser({ password: new_password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
