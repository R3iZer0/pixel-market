import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import ListingEditForm from './ListingEditForm'

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    paused: 'bg-yellow-50 text-yellow-700',
    expired: 'bg-gray-100 text-gray-500',
    sold: 'bg-gray-100 text-gray-500',
    completed: 'bg-blue-50 text-blue-700',
    pending_payment: 'bg-yellow-50 text-yellow-700',
    paid: 'bg-blue-50 text-blue-700',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-500'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

export default async function AdminListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const supabase = createAdminClient()

  const [listingRes, ordersRes] = await Promise.all([
    supabase.from('listings').select('*, profiles!listings_seller_id_fkey(id, username)').eq('id', id).single(),
    supabase.from('orders').select('id, status, amount_cents, created_at, buyer_id, profiles!orders_buyer_id_fkey(username)').eq('listing_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  const listing = listingRes.data as unknown as (typeof listingRes.data & { profiles: { id: string; username: string } | null }) | null
  const orders = (ordersRes.data ?? []) as unknown as Array<{
    id: string
    status: string
    amount_cents: number | null
    created_at: string | null
    buyer_id: string
    profiles: { username: string } | null
  }>

  if (!listing) return <div className="text-gray-500">Listing not found.</div>

  const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/listings" className="text-sm text-gray-500 hover:text-gray-700">Listings</Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-xl font-bold text-gray-900 truncate max-w-lg">{listing.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Listing details */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Listing Info</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">ID</dt>
              <dd className="font-mono text-xs text-gray-900">{listing.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Seller</dt>
              <dd className="text-xs">
                {listing.profiles ? (
                  <Link href={`/admin/users/${listing.profiles.id}`} className="text-blue-600 hover:underline">
                    @{listing.profiles.username}
                  </Link>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Asset type</dt>
              <dd className="text-xs text-gray-900">{listing.asset_type}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Status</dt>
              <dd><Badge status={listing.status} /></dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Price</dt>
              <dd className="text-xs text-gray-900">{listing.price_cents ? fmtMoney(listing.price_cents) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Audience size</dt>
              <dd className="text-xs text-gray-900">{listing.audience_size ? listing.audience_size.toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Niche</dt>
              <dd className="text-xs text-gray-900">{listing.niche ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Category</dt>
              <dd className="text-xs text-gray-900">{listing.primary_category ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Created</dt>
              <dd className="text-xs text-gray-900">{listing.created_at ? new Date(listing.created_at).toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Meta asset ID</dt>
              <dd className="font-mono text-xs text-gray-900">{listing.meta_asset_id ?? '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-gray-500 mb-0.5">Description</dt>
              <dd className="text-xs text-gray-900 whitespace-pre-line">{listing.description ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Edit form */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Edit Listing</h2>
          <ListingEditForm listingId={id} listing={listing} />
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Linked Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 text-left">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Buyer</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-xs text-gray-700">
                  {o.profiles ? (
                    <Link href={`/admin/users/${o.buyer_id}`} className="hover:text-blue-600">@{o.profiles.username}</Link>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{o.amount_cents ? fmtMoney(o.amount_cents) : '—'}</td>
                <td className="px-4 py-3"><Badge status={o.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-xs">No orders</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
