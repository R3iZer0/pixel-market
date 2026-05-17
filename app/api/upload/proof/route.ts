import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  const slot = (form.get('slot') as string | null) || 'general'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${user.id}/${Date.now()}-${slot}-${crypto.randomUUID()}.${ext}`

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from('listing-proofs')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: pub } = admin.storage.from('listing-proofs').getPublicUrl(path)

  return NextResponse.json({ url: pub.publicUrl, path })
}
