import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import ListingRowActions from './ListingRowActions'

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    paused: 'bg-yellow-50 text-yellow-700',
    expired: 'bg-gray-100 text-gray-500',
    sold: 'bg-gray-100 text-gray-500',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-500'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    pixel: 'bg-blue-50 text-blue-700',
    custom_audience: 'bg-purple-50 text-purple-600',
    lookalike: 'bg-green-50 text-green-700',
    ad_account: 'bg-yellow-50 text-yellow-700',
  }
  const cls = map[type] ?? 'bg-gray-100 text-gray-500'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{type}</span>
}

const STATUSES = ['', 'active', 'paused', 'sold', 'expired']
const TYPES = ['', 'pixel', 'custom_audience', 'lookalike', 'ad_account']

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; asset_type?: string; page?: string }>
}) {
  await requireAdmin()
  const supabase = createAdminClient()
  const params = await searchParams
  const query = params.q ?? ''
  const status = params.status ?? ''
  const assetType = params.asset_type ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  let q = supabase
    .from('listings')
    .select('id, title, asset_type, status, price_cents, created_at, audience_size, seller_id, profiles!listings_seller_id_fkey(username)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (query) q = q.ilike('title', `%${query}%`)
  if (status) q = q.eq('status', status)
  if (assetType) q = q.eq('asset_type', assetType)

  const { data: listings } = await q

  const rows = (listings ?? []) as unknown as Array<{
    id: string
    title: string
    asset_type: string
    status: string
    price_cents: number | null
    created_at: string | null
    audience_size: number | null
    seller_id: string
    profiles: { username: string } | null
  }>

  const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
        <form method="GET" className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search title…"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48"
          />
          <select name="status" defaultValue={status} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <select name="asset_type" defaultValue={assetType} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {TYPES.map(t => <option key={t} value={t}>{t || 'All types'}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700">Filter</button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(l => (
                <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-[200px]">
                    <Link href={`/admin/listings/${l.id}`} className="text-gray-900 hover:text-blue-600 text-xs font-medium truncate block">
                      {l.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={l.asset_type} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {l.profiles ? (
                      <Link href={`/admin/users/${l.seller_id}`} className="hover:text-blue-600">@{l.profiles.username}</Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">{l.price_cents ? fmtMoney(l.price_cents) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{l.audience_size ? l.audience_size.toLocaleString() : '—'}</td>
                  <td className="px-4 py-3"><Badge status={l.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/listings/${l.id}`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                      <ListingRowActions listingId={l.id} currentStatus={l.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`?q=${query}&status=${status}&asset_type=${assetType}&page=${page - 1}`} className="text-blue-600 hover:underline">Previous</Link>
          )}
          <span className="text-gray-500">Page {page}</span>
          {(rows.length) === limit && (
            <Link href={`?q=${query}&status=${status}&asset_type=${assetType}&page=${page + 1}`} className="text-blue-600 hover:underline">Next</Link>
          )}
        </div>
      </div>
    </div>
  )
}
