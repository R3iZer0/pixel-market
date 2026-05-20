import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertCircle, User, LogOut } from 'lucide-react'
import type { Profile } from '@/types/database'
import { Suspense } from 'react'

type AdAccount = { id: string; name: string; currency: string; account_status: number }

async function fbGet<T>(path: string, token: string): Promise<T | null> {
  try {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(
      `https://graph.facebook.com/v19.0${path}${sep}access_token=${token}`,
      { next: { revalidate: 60 } } // 60s cache — dashboard view doesn't need real-time
    )
    return await res.json()
  } catch { return null }
}

async function MetaPanel({ token }: { token: string }) {
  const [meRes, accsRes] = await Promise.all([
    fbGet<{ id: string; name: string }>('/me?fields=id,name', token),
    fbGet<{ data: AdAccount[] }>('/me/adaccounts?fields=id,name,account_status,currency&limit=50', token),
  ])

  const meErr = (meRes as { error?: { message: string; code?: number } } | null)?.error
  const accs = (accsRes && 'data' in (accsRes as object) ? (accsRes as { data: AdAccount[] }).data : []) || []

  return (
    <>
      {meErr ? (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 mb-6 text-sm text-red-700">
          <strong>Meta API error:</strong> {meErr.message}
          <br /><span className="text-xs text-red-500">Code: {meErr.code} — Token may need reconnect</span>
        </div>
      ) : meRes && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Meta account</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-gray-500 text-xs">FB Name</p>
              <p className="text-gray-900">{meRes.name}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-gray-500 text-xs">FB ID</p>
              <p className="text-gray-900 font-mono text-xs">{meRes.id}</p>
            </div>
          </div>
        </div>
      )}

      {accs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Ad accounts ({accs.length})</h2>
          <div className="space-y-1">
            {accs.map(acc => (
              <div key={acc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{acc.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{acc.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{acc.currency}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${acc.account_status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {acc.account_status === 1 ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData as Profile | null

  const tokenExpiresSoon = profile?.meta_token_expires
    ? new Date(profile.meta_token_expires) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{profile?.display_name || profile?.username || user.email}</span>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Profile card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Account</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-gray-900">{user.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Username</span><span className="text-gray-900">{profile?.username || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sales</span><span className="text-gray-900">{profile?.total_sales || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Verified</span><span className={profile?.is_verified ? 'text-green-600' : 'text-gray-400'}>{profile?.is_verified ? 'Yes' : 'No'}</span></div>
            </div>
          </div>

          {/* Meta connection */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <h2 className="font-semibold text-gray-900">Meta / Facebook</h2>
              {profile?.meta_access_token ? (
                <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
              ) : (
                <span className="ml-auto text-xs text-gray-400">Not connected</span>
              )}
            </div>

            {tokenExpiresSoon && profile?.meta_access_token && (
              <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 text-xs px-3 py-2 rounded-lg mb-4">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Token expires soon — reconnect to keep listings active
              </div>
            )}

            {profile?.meta_token_expires && (
              <div className="text-sm">
                <p className="text-gray-500 text-xs">Token expires</p>
                <p className="text-gray-900">{new Date(profile.meta_token_expires).toLocaleDateString()}</p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {profile?.meta_access_token ? (
                <Link href="/settings" className="text-xs text-blue-600 hover:underline">Manage in settings</Link>
              ) : (
                <a href="/api/auth/meta-connect" className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-[#1877F2] text-white text-sm font-medium rounded-lg">
                  Connect Meta Account
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Meta panel — async, doesn't block render */}
        {profile?.meta_access_token && (
          <Suspense fallback={<div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 text-sm text-gray-400">Loading Meta data…</div>}>
            <MetaPanel token={profile.meta_access_token} />
          </Suspense>
        )}

        {/* Quick links */}
        <div className="flex flex-wrap gap-3">
          <Link prefetch href="/listings/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">+ List an asset</Link>
          <Link prefetch href="/browse" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Browse marketplace</Link>
          <Link prefetch href="/my-listings" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">My listings</Link>
          <Link prefetch href="/orders" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">My orders</Link>
          <Link prefetch href="/sales" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">My sales</Link>
          <Link prefetch href="/messages" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Messages</Link>
          <Link prefetch href="/billing" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Billing</Link>
          <Link prefetch href="/settings" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Settings</Link>
        </div>
      </div>
    </div>
  )
}
