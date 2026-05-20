import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { PublicListing } from '@/types/public-listing'
import { CATEGORIES, GEO_OPTIONS } from '@/lib/listing-constants'
import { Search, SlidersHorizontal } from 'lucide-react'

const ASSET_TYPES = ['pixel', 'custom_audience', 'lookalike_audience', 'engagement_audience'] as const
type AssetTypeFilter = typeof ASSET_TYPES[number]

const ASSET_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pixel:               { label: 'Pixel',       color: 'text-blue-600',   bg: 'bg-blue-50',   dot: 'bg-blue-500' },
  custom_audience:     { label: 'Custom',       color: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  lookalike_audience:  { label: 'Lookalike',    color: 'text-green-600',  bg: 'bg-green-50',  dot: 'bg-green-500' },
  engagement_audience: { label: 'Engagement',   color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
}

function AssetBadge({ type }: { type: string }) {
  const m = ASSET_META[type] || { label: type, color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

function formatPrice(cents: number | null) {
  if (cents == null) return 'On request'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

function formatSize(n: number | null) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
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
  if (params.category) query = query.eq('primary_category', params.category)
  if (params.geo) query = query.contains('geo', [params.geo])
  if (params.q) query = query.ilike('title', `%${params.q}%`)

  switch (params.sort) {
    case 'price_asc':  query = query.order('price_cents', { ascending: true,  nullsFirst: false }); break
    case 'price_desc': query = query.order('price_cents', { ascending: false, nullsFirst: false }); break
    case 'size_desc':  query = query.order('audience_size', { ascending: false, nullsFirst: false }); break
    default:           query = query.order('created_at', { ascending: false })
  }

  const { data: listings } = await query.limit(60)
  const items = (listings || []) as unknown as PublicListing[]
  const hasFilters = !!(params.type || params.category || params.geo || params.q)

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-50 z-10">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
          <Link href="/messages" className="text-gray-600 hover:text-gray-900">Messages</Link>
          <Link href="/listings/new" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            + List asset
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-sm text-gray-500 mt-0.5">Browse Meta advertising assets for sale</p>
          </div>
          <span className="text-sm text-gray-400">{items.length} listing{items.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Asset type tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <Link
            href="/browse"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!params.type ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            All
          </Link>
          {ASSET_TYPES.map(t => {
            const m = ASSET_META[t]
            const active = params.type === t
            const q = new URLSearchParams({ ...params, type: t }).toString()
            return (
              <Link
                key={t}
                href={`/browse?${q}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {m.label}
              </Link>
            )
          })}
        </div>

        {/* Filters */}
        <form className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                name="q"
                defaultValue={params.q || ''}
                placeholder="Search listings…"
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full"
              />
            </div>
            <select name="category" defaultValue={params.category || ''} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select name="geo" defaultValue={params.geo || ''} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">All geos</option>
              {GEO_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select name="sort" defaultValue={params.sort || ''} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Newest first</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
              <option value="size_desc">Largest audience</option>
            </select>
            {params.type && <input type="hidden" name="type" value={params.type} />}
            <div className="flex gap-2 md:col-span-5">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700">Apply</button>
              {hasFilters && <Link href="/browse" className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Clear filters</Link>}
            </div>
          </div>
        </form>

        {/* Results */}
        {items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <p className="font-medium text-gray-900 mb-1">No listings found</p>
            <p className="text-sm text-gray-500 mb-4">Try adjusting your filters or check back later.</p>
            <Link href="/browse" className="text-blue-600 text-sm hover:underline">Clear filters</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(l => (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                className="group block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all"
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <AssetBadge type={l.asset_type} />
                  {l.seller_verified && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">{l.title}</h3>
                {l.primary_category && (
                  <p className="text-xs text-gray-500 mb-4">{l.primary_category}{l.niche ? ` · ${l.niche}` : ''}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs mb-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-gray-400 mb-0.5">Size</p>
                    <p className="text-gray-900 font-semibold">{formatSize(l.audience_size)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">{l.asset_type === 'pixel' ? 'Age' : 'Retention'}</p>
                    <p className="text-gray-900 font-semibold">
                      {l.asset_type === 'pixel'
                        ? (l.pixel_age_days ? `${l.pixel_age_days}d` : '—')
                        : (l.retention_days ? `${l.retention_days}d` : '—')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Geo</p>
                    <p className="text-gray-900 font-semibold">
                      {l.geo?.[0] || '—'}{l.geo && l.geo.length > 1 ? ` +${l.geo.length - 1}` : ''}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">@{l.seller_username || 'anon'}</span>
                    {l.seller_rating != null && (
                      <span className="ml-1.5 text-yellow-500">★ {l.seller_rating.toFixed(1)}</span>
                    )}
                    {(l.seller_total_sales ?? 0) > 0 && (
                      <span className="ml-1.5 text-gray-400">· {l.seller_total_sales} sales</span>
                    )}
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
