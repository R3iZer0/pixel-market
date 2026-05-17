import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Returns a signed URL for a proof image.
// Access rules:
//   - The file's owner (path prefix = user.id) can always view
//   - Anyone authenticated can view if the path appears in source_extra.proofs of an ACTIVE listing
//     (proofs back the listing claims, so viewable while listing is live)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const isOwner = path.startsWith(`${user.id}/`)

  if (!isOwner) {
    // Check whether the path is in an active listing's proofs
    const { data: listings } = await supabase
      .from('listings')
      .select('source_extra, status')
      .eq('status', 'active')
      .filter('source_extra->>proofs', 'not.is', null)

    const inActiveListing = (listings || []).some(l => {
      const proofs = (l.source_extra as { proofs?: Record<string, string[]> } | null)?.proofs
      if (!proofs) return false
      return Object.values(proofs).flat().includes(path)
    })

    if (!inActiveListing) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: signed, error } = await admin.storage
    .from('listing-proofs')
    .createSignedUrl(path, 3600)

  if (error || !signed) return NextResponse.json({ error: error?.message || 'Sign failed' }, { status: 500 })

  return NextResponse.json({ url: signed.signedUrl })
}
