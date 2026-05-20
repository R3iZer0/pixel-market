import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import BanButton from './BanButton'

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    trialing: 'bg-green-50 text-green-700',
    canceled: 'bg-gray-100 text-gray-500',
    past_due: 'bg-red-50 text-red-700',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-500'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  await requireAdmin()
  const supabase = createAdminClient()
  const params = await searchParams
  const query = params.q ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  // Get all auth users with email
  const { data: authData } = await supabase.auth.admin.listUsers({ page, perPage: limit })
  const authUsers = authData?.users ?? []

  // Build email map
  const emailMap: Record<string, string> = {}
  for (const u of authUsers) {
    emailMap[u.id] = u.email ?? ''
  }

  // Get profiles
  let profileQuery = supabase
    .from('profiles')
    .select('id, username, display_name, created_at, subscription_status, total_sales, is_verified, meta_access_token, stripe_account_id')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (query) {
    profileQuery = profileQuery.ilike('username', `%${query}%`)
  }

  const { data: profiles } = await profileQuery

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <form method="GET">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by username…"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64"
          />
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Sub</th>
                <th className="px-4 py-3 font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">Verified</th>
                <th className="px-4 py-3 font-medium">Meta</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      @{p.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {emailMap[p.id] ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.subscription_status ? <Badge status={p.subscription_status} /> : <span className="text-gray-400 text-xs">none</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.total_sales ?? 0}</td>
                  <td className="px-4 py-3">
                    {p.is_verified ? (
                      <span className="text-green-700 text-xs">Yes</span>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.meta_access_token ? (
                      <span className="text-green-700 text-xs">Connected</span>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/users/${p.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                      <BanButton userId={p.id} username={p.username} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`?q=${query}&page=${page - 1}`} className="text-blue-600 hover:underline">Previous</Link>
          )}
          <span className="text-gray-500">Page {page}</span>
          {(profiles?.length ?? 0) === limit && (
            <Link href={`?q=${query}&page=${page + 1}`} className="text-blue-600 hover:underline">Next</Link>
          )}
        </div>
      </div>
    </div>
  )
}
