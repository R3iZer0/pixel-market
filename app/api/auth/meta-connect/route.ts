import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      scopes: 'ads_read,business_management,ads_management',
      queryParams: { auth_type: 'reauthenticate' },
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=meta_connect_failed`)
  }

  return NextResponse.redirect(data.url)
}
