'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Order = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  status: string
  payment_method: string
  amount_cents: number | null
  platform_fee_cents: number | null
  seller_payout_cents: number | null
  buyer_meta_ad_account_id: string | null
  meta_transfer_status: string | null
  meta_transfer_error: string | null
  buyer_confirmed_at: string | null
  completed_at: string | null
  created_at: string
  listings?: { title: string; asset_type: string; meta_asset_id: string }
}

const STAGES = ['pending_payment', 'paid', 'transferring', 'transferred', 'completed'] as const

function stageLabel(s: string) {
  return ({
    pending_payment: 'Pending payment',
    paid: 'Paid',
    transferring: 'Transferring',
    transferred: 'Transferred',
    completed: 'Completed',
    disputed: 'Disputed',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
  } as Record<string, string>)[s] || s
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const bmFromQuery = searchParams.get('bm') || ''

  const [me, setMe] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [transferResult, setTransferResult] = useState<unknown>(null)

  const reload = useCallback(() => {
    if (!params?.id) return Promise.resolve()
    return fetch(`/api/orders/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setOrder(d.order)
      })
      .catch(e => setError(String(e)))
  }, [params?.id])

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setMe(d.id || null)).catch(() => {})
    reload().finally(() => setLoading(false))
  }, [reload])

  async function testPay() {
    if (!order) return
    setBusy(true)
    setTransferResult(null)
    const res = await fetch(`/api/orders/${order.id}/test-pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer_business_id: bmFromQuery || undefined }),
    })
    const d = await res.json()
    setTransferResult(d.transfer)
    await reload()
    setBusy(false)
  }

  async function confirmReceipt() {
    if (!order) return
    setBusy(true)
    await fetch(`/api/orders/${order.id}/confirm`, { method: 'POST' })
    await reload()
    setBusy(false)
  }

  if (loading) return <div className="p-10 text-gray-500">Loading…</div>
  if (!order) return (
    <div className="p-10">
      <p className="text-red-600">{error || 'Order not found'}</p>
    </div>
  )

  const isBuyer = me === order.buyer_id
  const isSeller = me === order.seller_id
  const stageIdx = STAGES.indexOf(order.status as typeof STAGES[number])

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="flex gap-3 text-sm">
          {isBuyer && <Link href="/orders" className="text-gray-600 hover:text-gray-900">My orders</Link>}
          {isSeller && <Link href="/sales" className="text-gray-600 hover:text-gray-900">My sales</Link>}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{order.listings?.title || 'Order'}</h1>
        <p className="text-gray-500 text-sm mb-6">Order ID: {order.id}</p>

        {/* Status stepper */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            {STAGES.map((s, i) => (
              <div key={s} className="flex-1 flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                  i <= stageIdx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{i + 1}</div>
                {i < STAGES.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${i < stageIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-700">
            Current status: <strong>{stageLabel(order.status)}</strong>
          </p>
          {order.meta_transfer_status && (
            <p className="text-xs text-gray-500 mt-1">
              Meta transfer: <span className={order.meta_transfer_status === 'failed' ? 'text-red-600' : 'text-gray-700'}>{order.meta_transfer_status}</span>
              {order.meta_transfer_error && <span className="text-red-600"> — {order.meta_transfer_error}</span>}
            </p>
          )}
        </div>

        {/* Order details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Asset type</span><span className="text-gray-900">{order.listings?.asset_type}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="text-gray-900">${((order.amount_cents || 0) / 100).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Platform fee</span><span className="text-gray-900">${((order.platform_fee_cents || 0) / 100).toFixed(2)}</span></div>
          {isSeller && <div className="flex justify-between"><span className="text-gray-500">Your payout</span><span className="text-gray-900">${((order.seller_payout_cents || 0) / 100).toFixed(2)}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Payment method</span><span className="text-gray-900 capitalize">{order.payment_method}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Receiving ad account</span><span className="text-gray-900 font-mono text-xs">{order.buyer_meta_ad_account_id}</span></div>
          {(isBuyer || isSeller) && order.listings?.meta_asset_id && ['transferred', 'completed'].includes(order.status) && (
            <div className="flex justify-between"><span className="text-gray-500">Meta asset ID (revealed after transfer)</span><span className="text-gray-900 font-mono text-xs">{order.listings.meta_asset_id}</span></div>
          )}
        </div>

        {/* Actions */}
        {isBuyer && order.status === 'pending_payment' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
            <p className="font-semibold text-gray-900 mb-2">Payments not wired yet</p>
            <p className="text-sm text-gray-700 mb-3">Use the test button below to simulate payment + trigger Meta transfer immediately.</p>
            <button onClick={testPay} disabled={busy} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
              {busy ? 'Processing…' : 'Test: simulate payment + transfer'}
            </button>
          </div>
        )}

        {isBuyer && (order.status === 'transferred' || order.status === 'paid') && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="font-semibold text-gray-900 mb-2">Did you receive the asset?</p>
            <p className="text-sm text-gray-600 mb-3">Check your Meta Business Manager → Audiences/Pixels. Accept the share if prompted, then confirm here.</p>
            <button onClick={confirmReceipt} disabled={busy} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg disabled:opacity-50">
              {busy ? 'Confirming…' : 'Confirm I received it'}
            </button>
          </div>
        )}

        {order.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-sm">
            <p className="font-semibold text-gray-900 mb-1">Order completed ✓</p>
            <p className="text-gray-700">Completed at {order.completed_at ? new Date(order.completed_at).toLocaleString() : '—'}</p>
          </div>
        )}

        {transferResult != null && (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Transfer result (debug)</h3>
            <pre className="text-xs text-gray-700 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(transferResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
