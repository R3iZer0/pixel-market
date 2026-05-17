import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertCircle, User, LogOut, Target, Users, Sparkles } from 'lucide-react'
import type { Profile } from '@/types/database'

type AdAccount = { id: string; name: string; currency: string; account_status: number }
type Pixel = { id: string; name: string; creation_time?: string; last_fired_time?: string }
type Audience = {
  id: string
  name: string
  subtype: string
  approximate_count_lower_bound?: number
  approximate_count_upper_bound?: number
  retention_days?: number
  description?: string
  time_created?: number
}

async function fbGet<T>(path: string, token: string): Promise<T | { error: { message: string; code?: number } }> {
  try {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(
      `https://graph.facebook.com/v19.0${path}${sep}access_token=${token}`,
      { cache: 'no-store' }
    )
    return await res.json()
  } catch (e) {
    return { error: { message: (e as Error).message } }
  }
}

async function getMetaUserInfo(token: string) {
  return fbGet<{ id: string; name: string; email?: string }>('/me?fields=id,name,email,picture', token)
}

async function getAdAccounts(token: string) {
  return fbGet<{ data: AdAccount[] }>('/me/adaccounts?fields=id,name,account_status,currency', token)
}

async function getPixelsForAccount(accountId: string, token: string) {
  return fbGet<{ data: Pixel[] }>(
    `/${accountId}/adspixels?fields=id,name,creation_time,last_fired_time`,
    token
  )
}

async function getAudiencesForAccount(accountId: string, token: string) {
  return fbGet<{ data: Audience[] }>(
    `/${accountId}/customaudiences?fields=id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,retention_days,description,time_created&limit=200`,
    token
  )
}

function formatCount(lo?: number, hi?: number) {
  if (lo == null && hi == null) return '—'
  if (lo === hi) return lo!.toLocaleString()
  return `${(lo ?? 0).toLocaleString()}–${(hi ?? 0).toLocaleString()}`
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

  let metaUser: any = null
  let adAccountsRes: any = null
  const allPixels: Array<{ accountName: string; accountId: string; pixel: Pixel }> = []
  const allCustomAudiences: Array<{ accountName: string; accountId: string; audience: Audience }> = []
  const allLookalikes: Array<{ accountName: string; accountId: string; audience: Audience }> = []
  const allEngagement: Array<{ accountName: string; accountId: string; audience: Audience }> = []

  if (profile?.meta_access_token) {
    metaUser = await getMetaUserInfo(profile.meta_access_token)
    adAccountsRes = await getAdAccounts(profile.meta_access_token)

    if (adAccountsRes?.data?.length) {
      // fetch pixels + audiences for each ad account in parallel
      const results = await Promise.all(
        adAccountsRes.data.map(async (acc: AdAccount) => {
          const [pixelsRes, audiencesRes] = await Promise.all([
            getPixelsForAccount(acc.id, profile.meta_access_token!),
            getAudiencesForAccount(acc.id, profile.meta_access_token!),
          ])
          return { acc, pixelsRes, audiencesRes }
        })
      )

      for (const { acc, pixelsRes, audiencesRes } of results) {
        if (pixelsRes && 'data' in pixelsRes && Array.isArray(pixelsRes.data)) {
          for (const px of pixelsRes.data) {
            allPixels.push({ accountName: acc.name, accountId: acc.id, pixel: px })
          }
        }
        if (audiencesRes && 'data' in audiencesRes && Array.isArray(audiencesRes.data)) {
          for (const aud of audiencesRes.data) {
            const bucket =
              aud.subtype === 'LOOKALIKE' ? allLookalikes
              : aud.subtype === 'ENGAGEMENT' ? allEngagement
              : allCustomAudiences
            bucket.push({ accountName: acc.name, accountId: acc.id, audience: aud })
          }
        }
      }
    }
  }

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

      <div className="max-w-6xl mx-auto px-6 py-10">
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
              <div className="flex justify-between"><span className="text-gray-500">Provider</span><span className="text-gray-900 capitalize">{user.app_metadata?.provider || 'email'}</span></div>
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

            {metaUser && !metaUser.error ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">FB Name</span><span className="text-gray-900">{metaUser.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">FB ID</span><span className="text-gray-900 font-mono text-xs">{metaUser.id}</span></div>
                {profile?.meta_token_expires && (
                  <div className="flex justify-between"><span className="text-gray-500">Token expires</span><span className="text-gray-900">{new Date(profile.meta_token_expires).toLocaleDateString()}</span></div>
                )}
                <div className="pt-2">
                  <a href="/api/auth/meta-connect" className="text-xs text-blue-600 hover:underline">Reconnect</a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">Connect your Meta account to list or receive assets.</p>
            )}

            {!profile?.meta_access_token && (
              <a href="/api/auth/meta-connect" className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-4 bg-[#1877F2] text-white text-sm font-medium rounded-lg hover:bg-[#166FE5] transition-colors">
                Connect Meta Account
              </a>
            )}
          </div>
        </div>

        {/* Ad accounts */}
        {adAccountsRes?.data?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Meta Ad Accounts ({adAccountsRes.data.length})</h2>
            <div className="space-y-2">
              {adAccountsRes.data.map((acc: AdAccount) => (
                <div key={acc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{acc.name}</p>
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

        {adAccountsRes?.error && (
          <div className="bg-red-50 rounded-xl border border-red-100 p-4 mb-6 text-sm text-red-700">
            <strong>Meta API error:</strong> {adAccountsRes.error.message}<br />
            <span className="text-xs text-red-500">Code: {adAccountsRes.error.code} — Token may need reconnect</span>
          </div>
        )}

        {/* Pixels */}
        {profile?.meta_access_token && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Pixels ({allPixels.length})</h2>
            </div>
            {allPixels.length === 0 ? (
              <p className="text-sm text-gray-400">No pixels found across your ad accounts.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase">
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium">Pixel ID</th>
                      <th className="text-left py-2 font-medium">Ad Account</th>
                      <th className="text-left py-2 font-medium">Created</th>
                      <th className="text-left py-2 font-medium">Last Fired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPixels.map(({ accountName, accountId, pixel }) => (
                      <tr key={`${accountId}-${pixel.id}`} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 font-medium text-gray-900">{pixel.name}</td>
                        <td className="py-2 font-mono text-xs text-gray-600">{pixel.id}</td>
                        <td className="py-2 text-gray-600">{accountName}</td>
                        <td className="py-2 text-gray-500 text-xs">{pixel.creation_time ? new Date(pixel.creation_time).toLocaleDateString() : '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">{pixel.last_fired_time ? new Date(pixel.last_fired_time).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Custom Audiences */}
        {profile?.meta_access_token && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Custom Audiences ({allCustomAudiences.length})</h2>
            </div>
            {allCustomAudiences.length === 0 ? (
              <p className="text-sm text-gray-400">No custom audiences found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase">
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium">Subtype</th>
                      <th className="text-left py-2 font-medium">Size</th>
                      <th className="text-left py-2 font-medium">Retention</th>
                      <th className="text-left py-2 font-medium">Ad Account</th>
                      <th className="text-left py-2 font-medium">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCustomAudiences.map(({ accountName, accountId, audience }) => (
                      <tr key={`${accountId}-${audience.id}`} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 font-medium text-gray-900">{audience.name}</td>
                        <td className="py-2 text-xs"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{audience.subtype}</span></td>
                        <td className="py-2 text-gray-600">{formatCount(audience.approximate_count_lower_bound, audience.approximate_count_upper_bound)}</td>
                        <td className="py-2 text-gray-600">{audience.retention_days ? `${audience.retention_days}d` : '—'}</td>
                        <td className="py-2 text-gray-600">{accountName}</td>
                        <td className="py-2 font-mono text-xs text-gray-400">{audience.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Lookalike Audiences */}
        {profile?.meta_access_token && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h2 className="font-semibold text-gray-900">Lookalike Audiences ({allLookalikes.length})</h2>
            </div>
            {allLookalikes.length === 0 ? (
              <p className="text-sm text-gray-400">No lookalike audiences found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase">
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium">Size</th>
                      <th className="text-left py-2 font-medium">Retention</th>
                      <th className="text-left py-2 font-medium">Ad Account</th>
                      <th className="text-left py-2 font-medium">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLookalikes.map(({ accountName, accountId, audience }) => (
                      <tr key={`${accountId}-${audience.id}`} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 font-medium text-gray-900">{audience.name}</td>
                        <td className="py-2 text-gray-600">{formatCount(audience.approximate_count_lower_bound, audience.approximate_count_upper_bound)}</td>
                        <td className="py-2 text-gray-600">{audience.retention_days ? `${audience.retention_days}d` : '—'}</td>
                        <td className="py-2 text-gray-600">{accountName}</td>
                        <td className="py-2 font-mono text-xs text-gray-400">{audience.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Engagement Audiences */}
        {profile?.meta_access_token && allEngagement.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-green-600" />
              <h2 className="font-semibold text-gray-900">Engagement Audiences ({allEngagement.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase">
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 font-medium">Name</th>
                    <th className="text-left py-2 font-medium">Size</th>
                    <th className="text-left py-2 font-medium">Retention</th>
                    <th className="text-left py-2 font-medium">Ad Account</th>
                  </tr>
                </thead>
                <tbody>
                  {allEngagement.map(({ accountName, accountId, audience }) => (
                    <tr key={`${accountId}-${audience.id}`} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 font-medium text-gray-900">{audience.name}</td>
                      <td className="py-2 text-gray-600">{formatCount(audience.approximate_count_lower_bound, audience.approximate_count_upper_bound)}</td>
                      <td className="py-2 text-gray-600">{audience.retention_days ? `${audience.retention_days}d` : '—'}</td>
                      <td className="py-2 text-gray-600">{accountName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="flex gap-3">
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
