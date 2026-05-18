import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/messages — send a message
// Body: { listing_id?, order_id?, body }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { listing_id, order_id, body } = await request.json()
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'Body required' }, { status: 400 })
  }
  if (!listing_id && !order_id) {
    return NextResponse.json({ error: 'Provide listing_id or order_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.id,
      listing_id: listing_id || null,
      order_id: order_id || null,
      body: body.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}

// GET /api/messages — list user's threads (latest message per thread)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const admin = createAdminClient()

  // All messages where user is sender OR involved in the listing/order
  // Simpler: pull messages where sender_id = user, plus any where listing.seller_id = user
  // To get full threads, query via raw SQL would be cleaner. Workaround: fetch ALL messages tied to listings user owns or messages user sent + responses.

  // Fetch:
  // 1. Messages I sent (any listing_id or order_id)
  // 2. Messages on listings I sell
  // 3. Messages on orders where I'm buyer or seller
  const { data: myListings } = await admin.from('listings').select('id').eq('seller_id', user.id)
  const myListingIds = (myListings || []).map(l => l.id)
  const { data: myOrders } = await admin.from('orders').select('id').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
  const myOrderIds = (myOrders || []).map(o => o.id)

  const conditions: string[] = [`sender_id.eq.${user.id}`]
  if (myListingIds.length) conditions.push(`listing_id.in.(${myListingIds.join(',')})`)
  if (myOrderIds.length) conditions.push(`order_id.in.(${myOrderIds.join(',')})`)

  const { data: messages, error } = await admin
    .from('messages')
    .select('*')
    .or(conditions.join(','))
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by thread key: listing_id+buyer or order_id
  type Msg = (typeof messages)[number]
  const threads = new Map<string, { key: string; listing_id: string | null; order_id: string | null; peer_id: string; last_message: Msg; unread: number }>()

  // For each message we need to know who the "peer" is from the user's perspective
  // For listing-scoped threads: peer = seller (if buyer is asking) or buyer (if seller is responding)
  //   thread key = `L:{listing_id}:{buyer_user_id}`
  // For order-scoped: peer = the other party
  //   thread key = `O:{order_id}`

  // Need listing seller_ids + order buyer/seller ids
  const listingMap = new Map<string, { seller_id: string }>()
  if (myListingIds.length || messages.some(m => m.listing_id)) {
    const ids = Array.from(new Set(messages.map(m => m.listing_id).filter(Boolean) as string[]))
    if (ids.length) {
      const { data: ls } = await admin.from('listings').select('id, seller_id').in('id', ids)
      ;(ls || []).forEach(l => listingMap.set(l.id, { seller_id: l.seller_id }))
    }
  }
  const orderMap = new Map<string, { buyer_id: string; seller_id: string }>()
  {
    const ids = Array.from(new Set(messages.map(m => m.order_id).filter(Boolean) as string[]))
    if (ids.length) {
      const { data: os } = await admin.from('orders').select('id, buyer_id, seller_id').in('id', ids)
      ;(os || []).forEach(o => orderMap.set(o.id, { buyer_id: o.buyer_id, seller_id: o.seller_id }))
    }
  }

  for (const m of messages || []) {
    let key: string
    let peer_id: string | null = null
    if (m.order_id) {
      const o = orderMap.get(m.order_id)
      if (!o) continue
      key = `O:${m.order_id}`
      peer_id = o.buyer_id === user.id ? o.seller_id : o.buyer_id
    } else if (m.listing_id) {
      const l = listingMap.get(m.listing_id)
      if (!l) continue
      // buyer is whoever isn't the seller
      const buyerInThread = m.sender_id === l.seller_id
        ? // we need to figure out who the buyer is — look at all messages in this thread to find a non-seller sender
          (messages.find(x => x.listing_id === m.listing_id && x.sender_id !== l.seller_id)?.sender_id) || m.sender_id
        : m.sender_id
      key = `L:${m.listing_id}:${buyerInThread}`
      peer_id = user.id === l.seller_id ? buyerInThread : l.seller_id
    } else {
      continue
    }
    if (!peer_id) continue
    if (!threads.has(key)) {
      threads.set(key, {
        key,
        listing_id: m.listing_id,
        order_id: m.order_id,
        peer_id,
        last_message: m,
        unread: 0,
      })
    }
    const t = threads.get(key)!
    if (!m.read_at && m.sender_id !== user.id) t.unread++
  }

  return NextResponse.json({ threads: Array.from(threads.values()) })
}
