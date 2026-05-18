'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type AdAccount = { id: string; name: string }
type ListingInfo = { id: string; title: string; asset_type: string; price_cents: number; accepts_crypto: boolean | null }

export default function BuyPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const listingId = params?.id
  const offerId = searchParams.get('offer_id')
  const [offerAmount, setOfferAmount] = useState<number | null>(null)

  const [listing, setListing] = useState<ListingInfo | null>(null)
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [buyerAcct, setBuyerAcct] = useState('')
  const [buyerBM, setBuyerBM] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'coinbase'>('stripe')

  useEffect(() => {
    if (!listingId) return
    const promises: Promise<unknown>[] = [
      fetch(`/api/listings/public-info?id=${listingId}`).then(r => r.json()),
      fetch('/api/meta/assets').then(r => r.json()),
    ]
    if (offerId) {
      promises.push(fetch(`/api/messages/thread?listing_id=${listingId}&buyer_id=me`).then(() => null).catch(() => null))
    }
    Promise.all(promises).then(([listingDataRaw, assetsDataRaw]) => {
      const listingData = listingDataRaw as { listing?: ListingInfo; error?: string }
      const assetsData = assetsDataRaw as { error?: string; accounts?: Array<{ ad_account: AdAccount }> }
      if (listingData.error) setError(listingData.error)
      else if (listingData.listing) setListing(listingData.listing)

      if (assetsData.error) {
        setMetaConnected(false)
      } else {
        setMetaConnected(true)
        const accs: AdAccount[] = (assetsData.accounts || []).map(a => a.ad_account)
        setAccounts(accs)
      }
      setLoading(false)
    }).catch(e => { setError(String(e)); setLoading(false) })
  }, [listingId, offerId])

  // Fetch offer price if applicable
  useEffect(() => {
    if (!offerId) return
    // Fetch via thread or a direct endpoint
    fetch(`/api/messages/thread?listing_id=${listingId}&buyer_id=${''}`).then(() => {}).catch(() => {})
    // Simpler: pull all my pending/accepted offers via a small endpoint or rely on the user being shown the right price
    // For now, use the listing.price_cents as fallback and check at server-side
  }, [offerId, listingId])

  async function submit() {
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: listingId,
        buyer_ad_account_id: buyerAcct,
        buyer_business_id: buyerBM || undefined,
        payment_method: paymentMethod,
        offer_id: offerId || undefined,
      }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (d.error) { setError(d.error); return }
    // Pass BM through query string so order page can use at test-pay
    const q = buyerBM ? `?bm=${encodeURIComponent(buyerBM)}` : ''
    router.push(`/orders/${d.order.id}${q}`)
  }

  if (loading) return <div className="p-10 text-gray-500">Loading…</div>
  if (error && !listing) return (
    <div className="p-10">
      <p className="text-red-600 mb-4">{error}</p>
      <Link href="/browse" className="text-blue-600 hover:underline">← Browse</Link>
    </div>
  )

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <Link href={`/listings/${listingId}`} className="text-sm text-gray-600 hover:text-gray-900">← Back to listing</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Buy: {listing?.title}</h1>
        <p className="text-gray-500 mb-6">Asset type: <span className="text-gray-700">{listing?.asset_type}</span></p>

        {!metaConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mb-6">
            <p className="font-semibold text-gray-900 mb-2">Connect your Meta account first</p>
            <p className="text-sm text-gray-700 mb-3">Asset transfer happens via Meta Graph API. We need to know which ad account to send it to.</p>
            <a href="/api/auth/meta-connect" className="inline-block px-4 py-2 bg-[#1877F2] text-white text-sm font-medium rounded-lg">Connect Meta</a>
          </div>
        )}

        {metaConnected && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Receive in ad account</label>
              <select value={buyerAcct} onChange={e => setBuyerAcct(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                <option value="">— pick one —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
              </select>
            </div>

            {listing?.asset_type === 'pixel' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Your Business Manager ID (required for pixel)</label>
                <input value={buyerBM} onChange={e => setBuyerBM(e.target.value)} placeholder="1234567890" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">Find at business.facebook.com → Business Info.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Payment method</label>
              <div className="flex gap-2">
                <button onClick={() => setPaymentMethod('stripe')} className={`flex-1 px-3 py-2 border rounded-lg text-sm ${paymentMethod === 'stripe' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-700'}`}>Card (Stripe)</button>
                {listing?.accepts_crypto && (
                  <button onClick={() => setPaymentMethod('coinbase')} className={`flex-1 px-3 py-2 border rounded-lg text-sm ${paymentMethod === 'coinbase' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-700'}`}>Crypto (Coinbase)</button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">${((listing?.price_cents || 0) / 100).toFixed(2)}</p>
              </div>
              <button
                onClick={submit}
                disabled={!buyerAcct || submitting || (listing?.asset_type === 'pixel' && !buyerBM)}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >{submitting ? 'Creating order…' : 'Continue →'}</button>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
