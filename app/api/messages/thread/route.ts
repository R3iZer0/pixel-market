import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/messages/thread?listing_id=X&buyer_id=Y  OR  ?order_id=X
// Returns messages + offers for a thread
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const listing_id = searchParams.get('listing_id')
  const buyer_id = searchParams.get('buyer_id')
  const order_id = searchParams.get('order_id')

  if (!order_id && !(listing_id && buyer_id)) {
    return NextResponse.json({ error: 'Provide order_id OR listing_id+buyer_id' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify membership
  if (order_id) {
    const { data: order } = await admin.from('orders').select('buyer_id, seller_id').eq('id', order_id).single()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id && order.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let listingMeta: { id: string; title: string; seller_id: string; asset_type: string; price_cents: number | null } | null = null
  if (listing_id) {
    const { data: l } = await admin.from('listings').select('id, title, seller_id, asset_type, price_cents').eq('id', listing_id).single()
    if (!l) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (l.seller_id !== user.id && buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    listingMeta = l
  }

  let messagesQuery = admin.from('messages').select('*').order('created_at', { ascending: true })
  if (order_id) {
    messagesQuery = messagesQuery.eq('order_id', order_id)
  } else if (listing_id && buyer_id) {
    // listing thread between this buyer + seller. seller is owner of listing.
    messagesQuery = messagesQuery.eq('listing_id', listing_id).in('sender_id', [listingMeta!.seller_id, buyer_id])
  }
  const { data: messages, error } = await messagesQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark as read (messages from peer)
  if (messages && messages.length) {
    const unreadIds = messages.filter(m => !m.read_at && m.sender_id !== user.id).map(m => m.id)
    if (unreadIds.length) {
      await admin.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    }
  }

  // Offers for this listing+buyer pair (if listing-scoped thread)
  let offers: unknown[] = []
  if (listing_id && buyer_id) {
    const { data } = await admin.from('price_offers').select('*').eq('listing_id', listing_id).eq('buyer_id', buyer_id).order('created_at', { ascending: true })
    offers = data || []
  }

  // Peer profile (anonymized via public_profiles)
  let peer = null
  if (listing_id && buyer_id) {
    const peerId = user.id === listingMeta!.seller_id ? buyer_id : listingMeta!.seller_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: p } = await (admin as any).from('public_profiles').select('id, username, display_name, avatar_url, is_verified').eq('id', peerId).single()
    peer = p
  }

  return NextResponse.json({ messages, offers, peer, listing: listingMeta })
}
