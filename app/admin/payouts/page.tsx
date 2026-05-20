import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import MarkSentButton from './MarkSentButton'

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    releasable: 'bg-blue-50 text-blue-700',
    sent: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
    on_hold: 'bg-yellow-50 text-yellow-700',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-500'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

const STATUSES = ['', 'pending', 'releasable', 'sent', 'failed', 'on_hold']

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  await requireAdmin()
  const supabase = createAdminClient()
  const params = await searchParams
  const status = params.status ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  let q = supabase
    .from('payouts')
    .select('id, order_id, seller_id, amount_cents, status, releasable_at, sent_at, payout_method, profiles!payouts_seller_id_fkey(username)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) q = q.eq('status', status)

  const { data: payouts } = await q

  const rows = (payouts ?? []) as unknown as Array<{
    id: string
    order_id: string
    seller_id: string
    amount_cents: number
    status: string
    releasable_at: string | null
    sent_at: string | null
    payout_method: string
    profiles: { username: string } | null
  }>

  // Total pending amount
  const { data: pendingData } = await supabase
    .from('payouts')
    .select('amount_cents')
    .in('status', ['pending', 'releasable'])
  const totalPending = (pendingData ?? []).reduce((s, p) => s + (p.amount_cents ?? 0), 0)

  const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-2 text-sm">
          <span className="text-yellow-700 font-medium">Total pending: {fmtMoney(totalPending)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <form method="GET" className="flex items-center gap-2">
          <select name="status" defaultValue={status} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700">Filter</button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Releasable at</th>
                <th className="px-4 py-3 font-medium">Sent at</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.order_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.profiles ? (
                      <Link href={`/admin/users/${p.seller_id}`} className="hover:text-blue-600">@{p.profiles.username}</Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{fmtMoney(p.amount_cents)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.payout_method}</td>
                  <td className="px-4 py-3"><Badge status={p.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.releasable_at ? new Date(p.releasable_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.sent_at ? new Date(p.sent_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.status !== 'sent' && (
                      <MarkSentButton payoutId={p.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`?status=${status}&page=${page - 1}`} className="text-blue-600 hover:underline">Previous</Link>
          )}
          <span className="text-gray-500">Page {page}</span>
          {rows.length === limit && (
            <Link href={`?status=${status}&page=${page + 1}`} className="text-blue-600 hover:underline">Next</Link>
          )}
        </div>
      </div>
    </div>
  )
}
