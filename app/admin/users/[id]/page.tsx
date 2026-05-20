import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import UserEditForm from './UserEditForm'

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    paused: 'bg-yellow-50 text-yellow-700',
    expired: 'bg-gray-100 text-gray-500',
    canceled: 'bg-gray-100 text-gray-500',
    completed: 'bg-blue-50 text-blue-700',
    pending_payment: 'bg-yellow-50 text-yellow-700',
    paid: 'bg-blue-50 text-blue-700',
    trialing: 'bg-green-50 text-green-700',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-500'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const supabase = createAdminClient()

  const [profileRes, listingsRes, ordersRes, authUserRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('listings').select('id, title, asset_type, status, price_cents, created_at').eq('seller_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('orders').select('id, status, amount_cents, created_at, listing_id, listings(title)').or(`buyer_id.eq.${id},seller_id.eq.${id}`).order('created_at', { ascending: false }).limit(10),
    supabase.auth.admin.getUserById(id),
  ])

  const profile = profileRes.data
  const listings = listingsRes.data ?? []
  const orders = (ordersRes.data ?? []) as unknown as Array<{
    id: string
    status: string
    amount_cents: number | null
    created_at: string | null
    listing_id: string
    listings: { title: string } | null
  }>
  const authUser = authUserRes.data?.user

  if (!profile) {
    return <div className="text-gray-500">User not found.</div>
  }

  const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-700">Users</Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-xl font-bold text-gray-900">@{profile.username}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Profile info */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Profile Info</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Email</dt>
              <dd className="text-gray-900 font-mono text-xs">{authUser?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">User ID</dt>
              <dd className="text-gray-900 font-mono text-xs truncate">{profile.id}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Joined</dt>
              <dd className="text-gray-900 text-xs">{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Subscription</dt>
              <dd>{profile.subscription_status ? <Badge status={profile.subscription_status} /> : <span className="text-gray-400 text-xs">none</span>}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Stripe Customer</dt>
              <dd className="text-gray-900 font-mono text-xs">{profile.stripe_customer_id ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Stripe Connect</dt>
              <dd className="text-xs">
                {profile.stripe_account_id ? (
                  <span>
                    <span className="font-mono">{profile.stripe_account_id}</span>
                    {profile.stripe_connect_charges_enabled && <span className="ml-2 text-green-700">charges ✓</span>}
                    {profile.stripe_connect_payouts_enabled && <span className="ml-1 text-green-700">payouts ✓</span>}
                  </span>
                ) : <span className="text-gray-400">not connected</span>}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Meta Connected</dt>
              <dd className="text-xs">
                {profile.meta_access_token ? (
                  <span className="text-green-700">
                    Yes {profile.meta_token_expires && `· expires ${new Date(profile.meta_token_expires).toLocaleDateString()}`}
                  </span>
                ) : <span className="text-gray-400">No</span>}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Total Sales</dt>
              <dd className="text-gray-900 text-xs">{profile.total_sales ?? 0}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Rating</dt>
              <dd className="text-gray-900 text-xs">{profile.rating != null ? `★ ${profile.rating}` : '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Sub Period End</dt>
              <dd className="text-gray-900 text-xs">{profile.subscription_current_period_end ? new Date(profile.subscription_current_period_end).toLocaleDateString() : '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Edit form */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Edit Profile</h2>
          <UserEditForm userId={id} profile={profile} />
        </div>
      </div>

      {/* Listings */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Listings</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 text-left">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {listings.map(l => (
              <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 text-xs max-w-[200px] truncate">{l.title}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.asset_type}</td>
                <td className="px-4 py-3 text-xs text-gray-700">{l.price_cents ? fmtMoney(l.price_cents) : '—'}</td>
                <td className="px-4 py-3"><Badge status={l.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/listings/${l.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-xs">No listings</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 text-left">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Listing</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-xs text-gray-700 max-w-[180px] truncate">{o.listings?.title ?? '—'}</td>
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
