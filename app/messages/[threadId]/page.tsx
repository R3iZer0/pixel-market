'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Message = { id: string; sender_id: string; body: string; created_at: string | null; listing_id: string | null; order_id: string | null }
type Offer = { id: string; buyer_id: string; seller_id: string; amount_cents: number; message: string | null; status: string; created_at: string }
type Peer = { id: string; username: string; display_name: string | null; avatar_url: string | null; is_verified: boolean }
type ListingInfo = { id: string; title: string; seller_id: string; asset_type: string; price_cents: number | null }

export default function ThreadPage() {
  const params = useParams<{ threadId: string }>()
  const router = useRouter()
  const threadId = params?.threadId || ''
  const isOrderThread = threadId.startsWith('order-')
  const isListingThread = threadId.startsWith('listing-')

  const orderId = isOrderThread ? threadId.slice('order-'.length) : null
  let listingId: string | null = null
  let buyerId: string | null = null
  if (isListingThread) {
    const rest = threadId.slice('listing-'.length)
    // listing-{uuid}-{uuid}: split at last dash group of 5
    // UUID format: 8-4-4-4-12
    // Simpler: peer is last 36 chars
    if (rest.length > 37) {
      buyerId = rest.slice(-36)
      listingId = rest.slice(0, rest.length - 37)
    }
  }

  const [me, setMe] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [peer, setPeer] = useState<Peer | null>(null)
  const [listing, setListing] = useState<ListingInfo | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Offer modal
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerAmt, setOfferAmt] = useState('')
  const [offerNote, setOfferNote] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (orderId) params.set('order_id', orderId)
    else if (listingId && buyerId) { params.set('listing_id', listingId); params.set('buyer_id', buyerId) }
    else return
    const res = await fetch(`/api/messages/thread?${params}`)
    const d = await res.json()
    if (d.error) { setError(d.error); return }
    setMessages(d.messages || [])
    setOffers(d.offers || [])
    setPeer(d.peer || null)
    setListing(d.listing || null)
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
  }, [orderId, listingId, buyerId])

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setMe(d.id || null)).catch(() => {})
    load().finally(() => setLoading(false))
    const interval = setInterval(() => {
      if (!document.hidden) load()
    }, 10000)
    return () => clearInterval(interval)
  }, [load])

  async function send() {
    if (!body.trim()) return
    setSending(true)
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: listingId,
        order_id: orderId,
        body: body.trim(),
      }),
    })
    setBody('')
    setSending(false)
    await load()
  }

  async function submitOffer() {
    if (!offerAmt || !listingId) return
    const cents = Math.round(parseFloat(offerAmt) * 100)
    if (isNaN(cents) || cents <= 0) return
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, amount_cents: cents, message: offerNote || undefined }),
    })
    const d = await res.json()
    if (d.error) setError(d.error)
    setOfferAmt('')
    setOfferNote('')
    setShowOfferForm(false)
    await load()
  }

  async function offerAction(id: string, action: 'accept' | 'reject' | 'withdraw') {
    const res = await fetch(`/api/offers/${id}/${action}`, { method: 'POST' })
    const d = await res.json()
    if (d.error) { setError(d.error); return }
    if (action === 'accept' && d.amount_cents && listingId) {
      // Buyer is taken to /buy with offer_id so checkout uses agreed price
      // But this is the SELLER acting. Inform them seller side. Buyer gets notified via the message.
    }
    await load()
  }

  async function checkoutAcceptedOffer(offerId: string) {
    if (!listingId) return
    router.push(`/listings/${listingId}/buy?offer_id=${offerId}`)
  }

  if (loading) return <div className="p-10 text-gray-500">Loading…</div>
  if (error && !messages.length) return (
    <div className="p-10">
      <p className="text-red-600 mb-4">{error}</p>
      <Link href="/messages" className="text-blue-600">← Back to messages</Link>
    </div>
  )

  const isSeller = me === listing?.seller_id
  const isBuyer = isListingThread && me === buyerId

  // Merge messages + offers into a single timeline
  type TimelineItem = ({ kind: 'msg' } & Message) | ({ kind: 'offer' } & Offer)
  const timeline: TimelineItem[] = [
    ...messages.map(m => ({ kind: 'msg' as const, ...m })),
    ...offers.map(o => ({ kind: 'offer' as const, ...o })),
  ].sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime())

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/messages" className="text-sm text-gray-600 hover:text-gray-900">← Messages</Link>
        <div className="text-sm text-gray-700">
          {peer && <Link href={`/profile/${peer.username}`} className="hover:text-blue-600">@{peer.username}</Link>}
          {isOrderThread && <span className="text-gray-400 ml-2">(order)</span>}
        </div>
      </nav>

      {listing && (
        <div className="border-b border-gray-100 px-6 py-3 bg-gray-50">
          <Link href={`/listings/${listing.id}`} className="text-sm text-gray-700 hover:text-blue-600">
            <span className="text-gray-500">Listing:</span> <span className="font-medium">{listing.title}</span>
            <span className="text-gray-400 ml-2 text-xs">({listing.asset_type} — list price ${((listing.price_cents || 0) / 100).toFixed(2)})</span>
          </Link>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-4 space-y-3 max-w-3xl mx-auto w-full">
        {timeline.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">No messages yet. Start the conversation.</p>
        ) : timeline.map(item => {
          if (item.kind === 'msg') {
            const mine = item.sender_id === me
            return (
              <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-4 py-2 rounded-lg text-sm ${
                  mine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'
                }`}>
                  <p className="whitespace-pre-wrap">{item.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                    {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            )
          }
          // offer card
          const o = item
          const mine = o.buyer_id === me
          return (
            <div key={o.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] border-2 rounded-lg p-3 text-sm ${
                o.status === 'accepted' ? 'border-green-400 bg-green-50'
                : o.status === 'rejected' ? 'border-red-300 bg-red-50'
                : o.status === 'withdrawn' || o.status === 'expired' ? 'border-gray-200 bg-gray-50'
                : 'border-blue-400 bg-blue-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900">💰 Offer: ${(o.amount_cents / 100).toFixed(2)}</span>
                  <span className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-700 capitalize">{o.status}</span>
                </div>
                {o.message && <p className="text-gray-700 text-xs mb-2 whitespace-pre-wrap">{o.message}</p>}
                {o.status === 'pending' && isSeller && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => offerAction(o.id, 'accept')} className="px-3 py-1 bg-green-600 text-white text-xs rounded">Accept</button>
                    <button onClick={() => offerAction(o.id, 'reject')} className="px-3 py-1 bg-red-600 text-white text-xs rounded">Reject</button>
                  </div>
                )}
                {o.status === 'pending' && mine && (
                  <button onClick={() => offerAction(o.id, 'withdraw')} className="px-3 py-1 border border-gray-200 text-gray-700 text-xs rounded">Withdraw</button>
                )}
                {o.status === 'accepted' && mine && (
                  <button onClick={() => checkoutAcceptedOffer(o.id)} className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded">
                    Check out at this price →
                  </button>
                )}
                <p className="text-[10px] text-gray-400 mt-2">{new Date(o.created_at).toLocaleString()}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 max-w-3xl mx-auto w-full">
        {isBuyer && isListingThread && (
          <div className="mb-2">
            {showOfferForm ? (
              <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 space-y-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={offerAmt}
                  onChange={e => setOfferAmt(e.target.value)}
                  placeholder={`Your offer (list: $${((listing?.price_cents || 0) / 100).toFixed(2)})`}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                />
                <textarea
                  value={offerNote}
                  onChange={e => setOfferNote(e.target.value)}
                  placeholder="Note (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={submitOffer} disabled={!offerAmt} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50">Send offer</button>
                  <button onClick={() => setShowOfferForm(false)} className="px-3 py-1.5 border border-gray-200 text-gray-700 text-sm rounded">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowOfferForm(true)} className="text-xs text-blue-600 hover:underline">+ Make a price offer</button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <button onClick={send} disabled={sending || !body.trim()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
