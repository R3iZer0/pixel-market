'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_FLOW: Record<string, string> = {
  pending_payment: 'paid',
  paid: 'transferred',
  transferred: 'completed',
}

export default function OrderRowActions({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const nextStatus = STATUS_FLOW[currentStatus]

  async function advance() {
    if (!nextStatus) return
    setLoading(true)
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    setLoading(false)
    router.refresh()
  }

  async function cancel() {
    if (!confirm('Cancel this order?')) return
    setLoading(true)
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'canceled' }),
    })
    setLoading(false)
    router.refresh()
  }

  if (loading) return <span className="text-xs text-gray-400">…</span>

  return (
    <div className="flex items-center gap-2">
      {nextStatus && (
        <button onClick={advance} className="text-xs text-blue-600 hover:underline">
          → {nextStatus}
        </button>
      )}
      {currentStatus !== 'completed' && currentStatus !== 'canceled' && (
        <button onClick={cancel} className="text-xs text-red-600 hover:underline">Cancel</button>
      )}
    </div>
  )
}
