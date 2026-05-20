import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertCircle, LogOut, BarChart3, ShoppingBag, MessageSquare, Layers, Settings, CreditCard, Star, List, TrendingUp } from 'lucide-react'
import type { Profile } from '@/types/database'
import { Suspense } from 'react'

type AdAccount = { id: string; name: string; currency: string; account_status: number }

async function fbGet<T>(path: string, token: string): Promise<T | null> {
  try {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(
      `https://graph.facebook.com/v19.0${path}${sep}access_token=${token}`,
      { next: { revalidate: 60 } }
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
    <div className="space-y-4">
      {meErr ? (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-sm text-red-700">
          <strong>Meta API error:</strong> {meErr.message}
          <br /><span className="text-xs text-red-500 mt-1 block">Code: {meErr.code} — Reconnect your account</span>
        </div>
      ) : meRes && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 flex-shrink-0" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <h3 className="font-semibold text-gray-900 text-sm">Connected as {meRes.name}</h3>
            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
          </div>

          {accs.length > 0 && (
            <>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-medium">Ad accounts ({accs.length})</p>
              <div className="space-y-1">
                {accs.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 text-sm">
                    <div>
                      <p className="font-medium text-gray-900 text-xs">{acc.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{acc.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{acc.currency}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${acc.account_status === 1 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {acc.account_status === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const NAV_LINKS = [
  { href: '/browse',       icon: <Layers className="w-4 h-4" />,       label: 'Marketplace' },
  { href: '/listings/new', icon: <TrendingUp className="w-4 h-4" />,   label: 'List an asset' },
  { href: '/my-listings',  icon: <List className="w-4 h-4" />,         label: 'My listings' },
  { href: '/orders',       icon: <ShoppingBag className="w-4 h-4" />,  label: 'My orders' },
  { href: '/sales',        icon: <BarChart3 className="w-4 h-4" />,    label: 'My sales' },
  { href: '/messages',     icon: <MessageSquare className="w-4 h-4" />,label: 'Messages' },
  { href: '/billing',      icon: <CreditCard className="w-4 h-4" />,   label: 'Billing' },
  { href: '/settings',     icon: <Settings className="w-4 h-4" />,     label: 'Settings' },
]

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

  const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User'
  const initials = displayName.substring(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="flex items-center gap-4">
          <Link href="/browse" className="text-sm text-gray-600 hover:text-gray-900">Browse</Link>
          <Link href="/listings/new" className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">+ List asset</Link>
          <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{initials}</div>
            <span className="text-sm text-gray-700 font-medium hidden sm:block">{displayName}</span>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            {/* Profile card */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initials}</div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
                  <p className="text-xs text-gray-400 truncate">@{profile?.username || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-lg font-bold text-gray-900">{profile?.total_sales || 0}</p>
                  <p className="text-xs text-gray-400">Sales</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-lg font-bold text-gray-900">
                    {profile?.rating != null ? (
                      <span className="text-yellow-500">★ {profile.rating.toFixed(1)}</span>
                    ) : '—'}
                  </p>
                  <p className="text-xs text-gray-400">Rating</p>
                </div>
              </div>
              {profile?.is_verified && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-green-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Verified seller
                </div>
              )}
            </div>

            {/* Nav links */}
            <nav className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {NAV_LINKS.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${i < NAV_LINKS.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <span className="text-gray-400">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-3 space-y-5">
            {/* Alerts */}
            {tokenExpiresSoon && profile?.meta_access_token && (
              <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-sm text-yellow-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Meta token expires soon — reconnect to keep listings active.</span>
                <a href="/api/auth/meta-connect" className="ml-auto text-yellow-700 font-medium underline whitespace-nowrap">Reconnect</a>
              </div>
            )}

            {/* Meta connection */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  <h2 className="font-semibold text-gray-900">Meta / Facebook Ads</h2>
                </div>
                {profile?.meta_access_token ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold px-2 py-1 bg-green-50 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-full">Not connected</span>
                )}
              </div>

              {!profile?.meta_access_token ? (
                <div>
                  <p className="text-sm text-gray-500 mb-4">Connect your Meta account to list ad assets and enable automated transfers.</p>
                  <a href="/api/auth/meta-connect" className="flex items-center justify-center gap-2 w-full max-w-xs py-2.5 px-4 bg-[#1877F2] text-white text-sm font-medium rounded-lg hover:bg-[#166fe5] transition-colors">
                    <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Connect Meta Account
                  </a>
                </div>
              ) : (
                <Suspense fallback={<p className="text-sm text-gray-400">Loading Meta data…</p>}>
                  <MetaPanel token={profile.meta_access_token} />
                </Suspense>
              )}

              {profile?.meta_token_expires && (
                <p className="text-xs text-gray-400 mt-3">
                  Token expires: {new Date(profile.meta_token_expires).toLocaleDateString()}
                  {' · '}<Link href="/settings" className="text-blue-600 hover:underline">Manage in settings</Link>
                </p>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { href: '/listings/new', label: 'List an asset', desc: 'Sell a pixel or audience', icon: <TrendingUp className="w-5 h-5 text-blue-600" />, primary: true },
                { href: '/browse',       label: 'Browse market', desc: 'Find assets to buy',      icon: <Layers className="w-5 h-5 text-purple-600" /> },
                { href: '/my-listings',  label: 'My listings',   desc: 'Manage what you sell',    icon: <List className="w-5 h-5 text-green-600" /> },
                { href: '/orders',       label: 'My orders',     desc: 'Track purchases',          icon: <ShoppingBag className="w-5 h-5 text-orange-600" /> },
                { href: '/sales',        label: 'My sales',      desc: 'View your earnings',       icon: <BarChart3 className="w-5 h-5 text-blue-600" /> },
                { href: '/messages',     label: 'Messages',      desc: 'Chat with buyers/sellers', icon: <MessageSquare className="w-5 h-5 text-gray-600" /> },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`bg-white border rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all group ${a.primary ? 'border-blue-200' : 'border-gray-100'}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${a.primary ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    {a.icon}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{a.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
