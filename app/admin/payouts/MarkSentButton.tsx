'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkSentButton({ payoutId }: { payoutId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleMarkSent() {
    if (!confirm('Mark this payout as sent?')) return
    setLoading(true)
    await fetch(`/api/admin/payouts/${payoutId}`, { method: 'PATCH' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleMarkSent}
      disabled={loading}
      className="text-xs text-green-700 hover:underline disabled:opacity-50"
    >
      {loading ? '…' : 'Mark sent'}
    </button>
  )
}
