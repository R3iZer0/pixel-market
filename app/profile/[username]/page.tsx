import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

function assetLabel(t: string) {
  return ({ pixel: 'Pixel', custom_audience: 'Custom', lookalike_audience: 'Lookalike', engagement_audience: 'Engagement' } as Record<string, string>)[t] || t
}

function formatPrice(cents: number | null) {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

function formatSize(n: number | null) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('public_profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listings } = await (supabase as any)
    .from('public_listings')
    .select('*')
    .eq('seller_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = listings || []

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <Link href="/browse" className="text-sm text-gray-600 hover:text-gray-900">← Browse</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold flex-shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              (profile.username || 'A').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">@{profile.username}</h1>
              {profile.is_verified && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">✓ Verified</span>}
            </div>
            {profile.display_name && <p className="text-gray-700 mb-2">{profile.display_name}</p>}
            {profile.bio && <p className="text-gray-600 text-sm whitespace-pre-wrap">{profile.bio}</p>}
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              <div><strong className="text-gray-900">{profile.total_sales}</strong> sale{profile.total_sales === 1 ? '' : 's'}</div>
              {profile.rating != null && <div>★ <strong className="text-gray-900">{profile.rating.toFixed(1)}</strong></div>}
              {profile.created_at && <div>Joined {new Date(profile.created_at).toLocaleDateString()}</div>}
            </div>
          </div>
        </div>

        {/* Listings */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active listings ({items.length})</h2>
        {items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
            No active listings.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((l: { id: string; title: string; asset_type: string; primary_category: string | null; price_cents: number | null; audience_size: number | null; retention_days: number | null; pixel_age_days: number | null; geo: string[] | null; accepts_crypto: boolean | null }) => (
              <Link key={l.id} href={`/listings/${l.id}`} className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{assetLabel(l.asset_type)}</span>
                  <span className="text-sm font-bold text-gray-900">{formatPrice(l.price_cents)}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{l.title}</h3>
                {l.primary_category && <p className="text-xs text-gray-500 mb-3">{l.primary_category}</p>}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Size</p>
                    <p className="text-gray-900 font-medium">{formatSize(l.audience_size)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">{l.asset_type === 'pixel' ? 'Age' : 'Retention'}</p>
                    <p className="text-gray-900 font-medium">{l.asset_type === 'pixel' ? `${l.pixel_age_days || '?'}d` : `${l.retention_days || '?'}d`}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Geo</p>
                    <p className="text-gray-900 font-medium">{l.geo?.[0] || '—'}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
