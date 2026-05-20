import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

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
    trialing: 'bg-green-50 text-green-700',
    pending: 'bg-yellow-50 text-yellow-700',
    sent: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
    on_hold: 'bg-yellow-50 text-yellow-700',
    sold: 'bg-gray-100 text-gray-500',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

export default async function AdminOverviewPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()

  // Fetch all stats in parallel
  const [
    { count: totalUsers },
    { count: newToday },
    { count: newThisWeek },
    { data: listings },
    { data: orders },
    { data: payouts },
    recentUsersRes,
    recentOrdersRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('listings').select('status'),
    supabase.from('orders').select('status, amount_cents'),
    supabase.from('payouts').select('status, amount_cents'),
    supabase.from('profiles').select('id, username, display_name, created_at, subscription_status').order('created_at', { ascending: false }).limit(10),
    supabase.from('orders').select('id, listing_id, buyer_id, seller_id, amount_cents, status, created_at, listings(title), buyer:profiles!orders_buyer_id_fkey(username), seller:profiles!orders_seller_id_fkey(username)').order('created_at', { ascending: false }).limit(10),
  ])

  // Listing breakdowns
  const listingActive = listings?.filter(l => l.status === 'active').length ?? 0
  const listingPaused = listings?.filter(l => l.status === 'paused').length ?? 0
  const listingSold = listings?.filter(l => l.status === 'sold' || l.status === 'expired').length ?? 0

  // Order breakdowns
  const orderByStatus: Record<string, number> = {}
  let totalRevenue = 0
  for (const o of orders ?? []) {
    orderByStatus[o.status] = (orderByStatus[o.status] ?? 0) + 1
    if (o.status === 'completed') totalRevenue += o.amount_cents ?? 0
  }

  // Payout stats
  const pendingPayouts = payouts?.filter(p => p.status === 'pending' || p.status === 'releasable') ?? []
  const pendingPayoutAmount = pendingPayouts.reduce((s, p) => s + (p.amount_cents ?? 0), 0)

  // Subscription stats — we need auth users for this but we can check profiles
  // profiles.subscription_status field
  const { data: subProfiles } = await supabase.from('profiles').select('subscription_status')
  const subsActive = subProfiles?.filter(p => p.subscription_status === 'active').length ?? 0
  const subsTrialing = subProfiles?.filter(p => p.subscription_status === 'trialing').length ?? 0
  const subsCanceled = subProfiles?.filter(p => p.subscription_status === 'canceled').length ?? 0

  const recentUsers = recentUsersRes.data ?? []
  const recentOrders = (recentOrdersRes.data ?? []) as unknown as Array<{
    id: string
    listing_id: string
    buyer_id: string
    seller_id: string
    amount_cents: number | null
    status: string
    created_at: string | null
    listings: { title: string } | null
    buyer: { username: string } | null
    seller: { username: string } | null
  }>

  const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={totalUsers ?? 0} sub={`+${newToday ?? 0} today · +${newThisWeek ?? 0} this week`} />
        <StatCard label="Total Listings" value={listings?.length ?? 0} sub={`${listingActive} active · ${listingPaused} paused · ${listingSold} expired/sold`} />
        <StatCard label="Total Orders" value={orders?.length ?? 0} sub={Object.entries(orderByStatus).map(([k,v]) => `${v} ${k}`).join(' · ')} />
        <StatCard label="Total Revenue" value={fmtMoney(totalRevenue)} sub="completed orders only" />
        <StatCard label="Pending Payouts" value={pendingPayouts.length} sub={`${fmtMoney(pendingPayoutAmount)} total`} />
        <StatCard label="Active Subs" value={subsActive} sub={`${subsTrialing} trialing · ${subsCanceled} canceled`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Users</h2>
            <Link href="/admin/users" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 text-left">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Sub</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        @{u.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.subscription_status ? <Badge status={u.subscription_status} /> : <span className="text-gray-400 text-xs">none</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 text-left">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Listing</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders?id=${o.id}`} className="font-mono text-xs text-gray-500 hover:text-blue-600">
                        {o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[120px] truncate">
                      {o.listings?.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {o.amount_cents ? fmtMoney(o.amount_cents) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
