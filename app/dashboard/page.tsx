import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertCircle, User, LogOut } from 'lucide-react'
import type { Profile } from '@/types/database'

async function getMetaAdAccounts(token: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${token}`,
      { cache: 'no-store' }
    )
    return await res.json()
  } catch {
    return null
  }
}

async function getMetaUserInfo(token: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture&access_token=${token}`,
      { cache: 'no-store' }
    )
    return await res.json()
  } catch {
    return null
  }
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

  let metaUser = null
  let adAccounts = null

  if (profile?.meta_access_token) {
    [metaUser, adAccounts] = await Promise.all([
      getMetaUserInfo(profile.meta_access_token),
      getMetaAdAccounts(profile.meta_access_token),
    ])
  }

  const tokenExpiresSoon = profile?.meta_token_expires
    ? new Date(profile.meta_token_expires) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
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

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Profile card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Account</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Username</span>
                <span className="text-gray-900">{profile?.username || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Provider</span>
                <span className="text-gray-900 capitalize">{user.app_metadata?.provider || 'email'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verified</span>
                <span className={profile?.is_verified ? 'text-green-600' : 'text-gray-400'}>
                  {profile?.is_verified ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Meta connection card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
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

            {metaUser && !metaUser.error ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">FB Name</span>
                  <span className="text-gray-900">{metaUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">FB ID</span>
                  <span className="text-gray-900 font-mono text-xs">{metaUser.id}</span>
                </div>
                {profile?.meta_token_expires && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Token expires</span>
                    <span className="text-gray-900">
                      {new Date(profile.meta_token_expires).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                Connect your Meta account to list or receive assets.
              </p>
            )}

            {!profile?.meta_access_token && (
              <a
                href="/api/auth/meta-connect"
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-4 bg-[#1877F2] text-white text-sm font-medium rounded-lg hover:bg-[#166FE5] transition-colors"
              >
                Connect Meta Account
              </a>
            )}
          </div>

          {/* Ad accounts */}
          {adAccounts && !adAccounts.error && adAccounts.data?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 md:col-span-2">
              <h2 className="font-semibold text-gray-900 mb-4">
                Meta Ad Accounts ({adAccounts.data.length})
              </h2>
              <div className="space-y-2">
                {adAccounts.data.map((acc: { id: string; name: string; currency: string; account_status: number }) => (
                  <div key={acc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{acc.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{acc.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{acc.currency}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        acc.account_status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {acc.account_status === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta API error */}
          {adAccounts?.error && (
            <div className="bg-red-50 rounded-xl border border-red-100 p-4 md:col-span-2 text-sm text-red-700">
              <strong>Meta API error:</strong> {adAccounts.error.message}
              <br />
              <span className="text-xs text-red-500">Code: {adAccounts.error.code} — Token may need reconnect</span>
            </div>
          )}

        </div>

        {/* Quick links */}
        <div className="mt-8 flex gap-3">
          <Link href="/listings/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + List an asset
          </Link>
          <Link href="/browse" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Browse marketplace
          </Link>
        </div>
      </div>
    </div>
  )
}
