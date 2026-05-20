import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import OrderRowActions from './OrderRowActions'

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    paused: 'bg-yellow-50 text-yellow-700',
    expired: 'bg-gray-100 text-gray-500',
    canceled: 'bg-gray-100 text-gray-500',
    completed: 'bg-blue-50 text-blue-700',
    pending_payment: 'bg-yellow-50 text-yellow-700',
    paid: 'bg-blue-50 text-blue-700',
    transferring: 'bg-purple-50 text-purple-600',
    transferred: 'bg-blue-50 text-blue-700',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-500'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

const STATUSES = ['', 'pending_payment', 'paid', 'transferring', 'transferred', 'completed', 'canceled']

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  await requireAdmin()
  const supabase = createAdminClient()
  const params = await searchParams
  const query = params.q ?? ''
  const status = params.status ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  let q = supabase
    .from('orders')
    .select(`
      id, status, amount_cents, payment_method, created_at,
      listing_id, buyer_id, seller_id,
      listings(title),
      buyer:profiles!orders_buyer_id_fkey(username),
      seller:profiles!orders_seller_id_fkey(username)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) q = q.eq('status', status)

  const { data: orders } = await q

  const rows = (orders ?? []) as unknown as Array<{
    id: string
    status: string
    amount_cents: number | null
    payment_method: string
    created_at: string | null
    listing_id: string
    buyer_id: string
    seller_id: string
    listings: { title: string } | null
    buyer: { username: string } | null
    seller: { username: string } | null
  }>

  const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
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
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(o => (
                <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 max-w-[150px] truncate">
                    <Link href={`/admin/listings/${o.listing_id}`} className="hover:text-blue-600">{o.listings?.title ?? '—'}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {o.buyer ? <Link href={`/admin/users/${o.buyer_id}`} className="hover:text-blue-600">@{o.buyer.username}</Link> : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {o.seller ? <Link href={`/admin/users/${o.seller_id}`} className="hover:text-blue-600">@{o.seller.username}</Link> : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">{o.amount_cents ? fmtMoney(o.amount_cents) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.payment_method}</td>
                  <td className="px-4 py-3"><Badge status={o.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <OrderRowActions orderId={o.id} currentStatus={o.status} />
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
