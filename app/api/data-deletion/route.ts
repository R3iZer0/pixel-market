import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Meta sends a signed_request POST when a user removes the app from their FB account.
// Spec: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
//
// Request format: POST with form body containing `signed_request` field.
// We verify the signature with our App Secret, extract the user_id, then schedule deletion.
// We must respond with JSON: { url, confirmation_code }

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(padded, 'base64')
}

function parseSignedRequest(signedRequest: string, secret: string): { user_id?: string } | null {
  const [encodedSig, payload] = signedRequest.split('.', 2)
  if (!encodedSig || !payload) return null

  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest()
  const providedSig = base64UrlDecode(encodedSig)

  if (!crypto.timingSafeEqual(providedSig, expectedSig)) return null

  try {
    return JSON.parse(base64UrlDecode(payload).toString('utf-8'))
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const form = await request.formData()
  const signedRequest = form.get('signed_request') as string | null

  if (!signedRequest) {
    return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
  }

  const data = parseSignedRequest(signedRequest, process.env.META_APP_SECRET!)
  if (!data?.user_id) {
    return NextResponse.json({ error: 'Invalid signed request' }, { status: 400 })
  }

  const fbUserId = data.user_id
  const confirmationCode = crypto.randomBytes(16).toString('hex')

  // Schedule deletion: find profiles with this fb user id and wipe their Meta data
  const admin = createAdminClient()
  await admin
    .from('profiles')
    .update({
      meta_access_token: null,
      meta_token_expires: null,
      meta_business_id: null,
      meta_ad_account_id: null,
    })
    .eq('meta_business_id', fbUserId)

  // Status URL where the user can check on deletion progress
  const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL}/legal/data-deletion?code=${confirmationCode}`

  return NextResponse.json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  })
}

export async function GET() {
  return NextResponse.json({ message: 'Meta Data Deletion endpoint. POST signed_request to delete user data.' })
}
