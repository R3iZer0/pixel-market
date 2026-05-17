import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorReason = searchParams.get('error_reason')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=${errorReason || error}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=missing_params`)
  }

  // Verify logged-in user matches state
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  try {
    // Step 1: exchange code for short-lived token
    const shortRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: `${baseUrl}/api/meta/callback`,
        code,
      })
    )
    const shortData = await shortRes.json()

    if (shortData.error) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=token_exchange_failed&msg=${encodeURIComponent(shortData.error.message)}`)
    }

    const shortToken = shortData.access_token

    // Step 2: exchange short-lived for long-lived (60-day) token
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        fb_exchange_token: shortToken,
      })
    )
    const longData = await longRes.json()

    if (longData.error) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=long_token_failed&msg=${encodeURIComponent(longData.error.message)}`)
    }

    const longToken = longData.access_token
    const expiresIn = longData.expires_in || 60 * 24 * 60 * 60 // default 60 days

    // Step 3: fetch Meta user info to get FB user ID
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${longToken}`)
    const meData = await meRes.json()
    const fbUserId = meData.id || null

    // Step 4: store in profile via admin client (bypasses RLS)
    const admin = createAdminClient()
    await admin
      .from('profiles')
      .update({
        meta_access_token: longToken,
        meta_token_expires: new Date(Date.now() + expiresIn * 1000).toISOString(),
        meta_business_id: fbUserId,
      })
      .eq('id', user.id)

    return NextResponse.redirect(`${baseUrl}/dashboard?meta_connected=1`)
  } catch (err) {
    console.error('Meta callback error:', err)
    return NextResponse.redirect(`${baseUrl}/dashboard?error=callback_failed`)
  }
}
