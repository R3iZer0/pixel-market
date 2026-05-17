'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ListingActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    const next = status === 'paused' ? 'active' : 'paused'
    setBusy(true)
    await fetch(`/api/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    router.refresh()
    setBusy(false)
  }

  async function del() {
    if (!confirm('Delete this listing? It will be marked expired and removed from browse.')) return
    setBusy(true)
    await fetch(`/api/listings/${id}`, { method: 'DELETE' })
    router.refresh()
    setBusy(false)
  }

  return (
    <div className="flex gap-2 justify-end">
      {(status === 'active' || status === 'paused') && (
        <button onClick={toggle} disabled={busy} className="text-xs text-blue-600 hover:underline disabled:opacity-50">
          {status === 'paused' ? 'Resume' : 'Pause'}
        </button>
      )}
      {status !== 'expired' && (
        <button onClick={del} disabled={busy} className="text-xs text-red-500 hover:underline disabled:opacity-50">Delete</button>
      )}
    </div>
  )
}
