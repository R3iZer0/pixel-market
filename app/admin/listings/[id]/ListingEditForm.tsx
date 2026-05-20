'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Listing } from '@/types/database'

const STATUSES = ['active', 'paused', 'expired', 'sold']

export default function ListingEditForm({ listingId, listing }: { listingId: string; listing: Listing }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [fields, setFields] = useState({
    title: listing.title ?? '',
    description: listing.description ?? '',
    price_cents: listing.price_cents ?? 0,
    status: listing.status ?? 'active',
    primary_category: listing.primary_category ?? '',
    niche: listing.niche ?? '',
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    const res = await fetch(`/api/admin/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setMsg('Error: ' + (data.error ?? 'unknown'))
    } else {
      setMsg('Saved!')
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!confirm('Expire this listing?')) return
    setLoading(true)
    await fetch(`/api/admin/listings/${listingId}`, { method: 'DELETE' })
    setLoading(false)
    router.push('/admin/listings')
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Title</label>
        <input
          value={fields.title}
          onChange={e => setFields(f => ({ ...f, title: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Description</label>
        <textarea
          value={fields.description}
          onChange={e => setFields(f => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Price (cents)</label>
        <input
          type="number"
          value={fields.price_cents}
          onChange={e => setFields(f => ({ ...f, price_cents: parseInt(e.target.value) || 0 }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Status</label>
        <select
          value={fields.status}
          onChange={e => setFields(f => ({ ...f, status: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Category</label>
        <input
          value={fields.primary_category}
          onChange={e => setFields(f => ({ ...f, primary_category: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Niche</label>
        <input
          value={fields.niche}
          onChange={e => setFields(f => ({ ...f, niche: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      {msg && <p className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Saving…' : 'Save changes'}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="w-full border border-red-200 text-red-600 text-sm py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        Expire listing
      </button>
    </form>
  )
}
