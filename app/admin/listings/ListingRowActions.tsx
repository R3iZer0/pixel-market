'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ListingRowActions({ listingId, currentStatus }: { listingId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    setLoading(true)
    await fetch(`/api/admin/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setLoading(false)
    router.refresh()
  }

  async function deleteListing() {
    if (!confirm('Expire this listing?')) return
    setLoading(true)
    await fetch(`/api/admin/listings/${listingId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  if (loading) return <span className="text-xs text-gray-400">…</span>

  return (
    <div className="flex items-center gap-2">
      {(currentStatus === 'active' || currentStatus === 'paused') && (
        <button onClick={toggle} className="text-xs text-yellow-600 hover:underline">
          {currentStatus === 'active' ? 'Pause' : 'Unpause'}
        </button>
      )}
      <button onClick={deleteListing} className="text-xs text-red-600 hover:underline">
        Expire
      </button>
    </div>
  )
}
