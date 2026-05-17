import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const providerToken = data.session.provider_token
      const user = data.user

      if (providerToken && user?.app_metadata?.provider === 'facebook') {
        const admin = createAdminClient()
        await admin
          .from('profiles')
          .update({
            meta_access_token: providerToken,
            meta_token_expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', user.id)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
