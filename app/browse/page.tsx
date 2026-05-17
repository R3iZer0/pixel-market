import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { PublicListing } from '@/types/public-listing'
import { CATEGORIES, GEO_OPTIONS } from '@/lib/listing-constants'

const ASSET_TYPES = ['pixel', 'custom_audience', 'lookalike_audience', 'engagement_audience'] as const
type AssetTypeFilter = typeof ASSET_TYPES[number]

function assetLabel(t: string) {
  return ({
    pixel: 'Pixel',
    custom_audience: 'Custom Audience',
    lookalike_audience: 'Lookalike',
    engagement_audience: 'Engagement',
  } as Record<string, string>)[t] || t
}

function formatPrice(cents: number | null) {
  if (cents == null) return 'Price on request'
  return `$${(cents / 100).toFixed(2)}`
}

function formatSize(n: number | null) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string; geo?: string; sort?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (supabase as any).from('public_listings').select('*')

  if (params.type && ASSET_TYPES.includes(params.type as AssetTypeFilter)) {
    query = query.eq('asset_type', params.type)
  }
  if (params.category) {
    query = query.eq('primary_category', params.category)
  }
  if (params.geo) {
    query = query.contains('geo', [params.geo])
  }
  if (params.q) {
    query = query.ilike('title', `%${params.q}%`)
  }

  // Sort
  switch (params.sort) {
    case 'price_asc':
      query = query.order('price_cents', { ascending: true, nullsFirst: false })
      break
    case 'price_desc':
      query = query.order('price_cents', { ascending: false, nullsFirst: false })
      break
    case 'size_desc':
      query = query.order('audience_size', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data: listings } = await query.limit(60)
  const items = (listings || []) as unknown as PublicListing[]

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="flex gap-3 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
          <Link href="/listings/new" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg">+ List asset</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Browse listings</h1>

        {/* Filters */}
        <form className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            name="q"
            defaultValue={params.q || ''}
            placeholder="Search title…"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm md:col-span-2"
          />
          <select name="type" defaultValue={params.type || ''} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All types</option>
            {ASSET_TYPES.map(t => <option key={t} value={t}>{assetLabel(t)}</option>)}
          </select>
          <select name="category" defaultValue={params.category || ''} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="geo" defaultValue={params.geo || ''} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All geos</option>
            {GEO_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select name="sort" defaultValue={params.sort || ''} className="px-3 py-2 border border-gray-200 rounded-lg text-sm md:col-span-2">
            <option value="">Newest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="size_desc">Largest audience</option>
          </select>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg md:col-span-2">Apply filters</button>
          <Link href="/browse" className="px-3 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg text-center">Reset</Link>
        </form>

        {/* Results */}
        <p className="text-sm text-gray-500 mb-4">{items.length} listing{items.length === 1 ? '' : 's'}</p>

        {items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
            No listings match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(l => (
              <Link key={l.id} href={`/listings/${l.id}`} className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{assetLabel(l.asset_type)}</span>
                  {l.seller_verified && <span className="text-xs text-green-600">✓ Verified seller</span>}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{l.title}</h3>
                {l.primary_category && <p className="text-xs text-gray-500 mb-3">{l.primary_category}</p>}

                <div className="grid grid-cols-3 gap-2 text-xs mb-4">
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
                    <p className="text-gray-900 font-medium">{l.geo?.[0] || '—'}{l.geo && l.geo.length > 1 ? ` +${l.geo.length - 1}` : ''}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    @{l.seller_username || 'anon'}
                    {l.seller_rating != null && <span className="ml-2">★ {l.seller_rating.toFixed(1)}</span>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatPrice(l.price_cents)}</p>
                    {l.accepts_crypto && <p className="text-xs text-blue-600">crypto OK</p>}
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
