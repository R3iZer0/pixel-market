'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Listing = { id: string; title: string; asset_type: string; meta_asset_id: string }
type AdAccount = { id: string; name: string }

export default function TestTransferPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [listingId, setListingId] = useState('')
  const [buyerAcct, setBuyerAcct] = useState('')
  const [buyerBM, setBuyerBM] = useState('')
  const [buyerUserId, setBuyerUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load user's own listings (as seller)
    fetch('/api/listings/mine')
      .then(r => r.json())
      .then(d => setListings(d.listings || []))
      .catch(() => {})

    // Load user's own ad accounts (as buyer for testing)
    fetch('/api/meta/assets')
      .then(r => r.json())
      .then(d => {
        const accs: AdAccount[] = (d.accounts || []).map((a: { ad_account: AdAccount }) => a.ad_account)
        setAccounts(accs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function run() {
    setSubmitting(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/meta/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          buyer_ad_account_id: buyerAcct,
          buyer_business_id: buyerBM || undefined,
          buyer_user_id: buyerUserId || undefined,
          test_mode: true,
        }),
      })
      const d = await res.json()
      setResult(d)
      if (!res.ok) setError(d.error || 'Failed')
    } catch (e) {
      setError(String(e))
    }
    setSubmitting(false)
  }

  const selected = listings.find(l => l.id === listingId)

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="text-sm text-gray-500">Dev — Test Transfer</div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Meta transfer test</h1>
        <p className="text-gray-500 mb-6">Pick a listing you own + a buyer ad account (can be yours for testing). Triggers the actual Meta API. No payment, no order created.</p>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Listing (seller side)</label>
              <select value={listingId} onChange={e => setListingId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                <option value="">— pick one of your listings —</option>
                {listings.map(l => (
                  <option key={l.id} value={l.id}>{l.title} — {l.asset_type}</option>
                ))}
              </select>
              {selected && (
                <p className="text-xs text-gray-500 mt-1 font-mono">Meta asset ID: {selected.meta_asset_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Buyer ad account</label>
              <select value={buyerAcct} onChange={e => setBuyerAcct(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                <option value="">— pick one of your ad accounts (for test) —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">For real transfers this would be the buyer&apos;s ad account.</p>
            </div>

            {selected?.asset_type === 'pixel' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Buyer Business Manager ID (required for pixel)</label>
                <input value={buyerBM} onChange={e => setBuyerBM(e.target.value)} placeholder="e.g. 1234567890" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">Find at business.facebook.com → Business Info.</p>
              </div>
            )}

            {selected?.asset_type === 'lookalike_audience' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Buyer user ID (required for lookalike — to use buyer&apos;s token)</label>
                <input value={buyerUserId} onChange={e => setBuyerUserId(e.target.value)} placeholder="UUID from profiles.id" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">For self-test, paste your own user id.</p>
              </div>
            )}

            <button onClick={run} disabled={submitting || !listingId || !buyerAcct} className="w-full py-2.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {submitting ? 'Transferring…' : 'Trigger transfer'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result != null && (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Result</h3>
            <pre className="text-xs text-gray-700 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
