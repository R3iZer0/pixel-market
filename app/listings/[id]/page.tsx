import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { PublicListing } from '@/types/public-listing'

function assetLabel(t: string) {
  return ({
    pixel: 'Pixel', custom_audience: 'Custom Audience',
    lookalike_audience: 'Lookalike', engagement_audience: 'Engagement',
  } as Record<string, string>)[t] || t
}

function formatPrice(cents: number | null) {
  if (cents == null) return 'Price on request'
  return `$${(cents / 100).toFixed(2)}`
}

function formatSize(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString()
}

type SourceExtra = {
  websites?: string[]
  events_auto?: Array<{ event: string; count: number }>
  events_manual?: Array<{ event: string; count: number }>
  events_window_days?: number
  pixel_age_days?: number
  shared_with_accounts?: number
  audiences_built_from?: number
  seller_explanation?: string
  lookalike_country?: string
  lookalike_ratio?: number
  origin_event_source_name?: string
  proofs?: Record<string, string[]>
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('public_listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()
  const listing = data as unknown as PublicListing
  const extra = (listing.source_extra as unknown as SourceExtra) || {}

  const { data: { user } } = await supabase.auth.getUser()

  // Generate signed URLs for proofs (visible to anyone viewing an active listing)
  const proofs = extra.proofs || {}
  const admin = createAdminClient()
  const signedProofs: Record<string, string[]> = {}
  for (const [slot, paths] of Object.entries(proofs)) {
    const urls: string[] = []
    for (const path of paths) {
      const { data: signed } = await admin.storage
        .from('listing-proofs')
        .createSignedUrl(path, 3600)
      if (signed?.signedUrl) urls.push(signed.signedUrl)
    }
    signedProofs[slot] = urls
  }

  const slotLabel: Record<string, string> = {
    events_manager: 'Events Manager — events firing',
    websites_traffic: 'Website traffic',
    summary_panel: 'Audience summary panel',
    campaigns_used: 'Campaigns used in',
    history: 'Audience history',
  }

  const allEvents = [...(extra.events_auto || []), ...(extra.events_manual || [])]

  const isOwner = user?.id === listing.seller_id

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="flex gap-3 text-sm">
          <Link href="/browse" className="text-gray-600 hover:text-gray-900">← Browse</Link>
          {user
            ? <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            : <Link href="/login" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg">Log in</Link>}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{assetLabel(listing.asset_type)}</span>
              {listing.primary_category && <span className="text-xs text-gray-500">{listing.primary_category}</span>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{listing.title}</h1>
            {listing.description && <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>}
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">Size</p>
              <p className="text-lg font-semibold text-gray-900">{formatSize(listing.audience_size)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">{listing.asset_type === 'pixel' ? 'Age' : 'Retention'}</p>
              <p className="text-lg font-semibold text-gray-900">
                {listing.asset_type === 'pixel' ? `${listing.pixel_age_days || '?'} days` : `${listing.retention_days || '?'} days`}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">Geo</p>
              <p className="text-lg font-semibold text-gray-900">{listing.geo?.join(', ') || '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">Source</p>
              <p className="text-lg font-semibold text-gray-900">{listing.audience_source || '—'}</p>
            </div>
          </div>

          {/* Pixel details */}
          {listing.asset_type === 'pixel' && (
            <>
              {extra.websites && extra.websites.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="font-semibold text-gray-900 mb-3">Websites firing this pixel</h2>
                  <div className="flex flex-wrap gap-2">
                    {extra.websites.map(w => (
                      <span key={w} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">{w}</span>
                    ))}
                  </div>
                </div>
              )}

              {allEvents.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="font-semibold text-gray-900 mb-3">
                    Events {extra.events_window_days ? `(last ${extra.events_window_days}d)` : ''}
                  </h2>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 uppercase">
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2">Event</th>
                        <th className="text-right py-2">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allEvents.map((e, i) => (
                        <tr key={`${e.event}-${i}`} className="border-b border-gray-50">
                          <td className="py-2 text-gray-900">
                            {e.event}
                            {listing.source_event === e.event && <span className="ml-2 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">★ Featured</span>}
                          </td>
                          <td className="py-2 text-right text-gray-600">{e.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(extra.shared_with_accounts != null || extra.audiences_built_from != null) && (
                <div className="grid grid-cols-2 gap-3">
                  {extra.shared_with_accounts != null && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500">Shared with accounts</p>
                      <p className="text-lg font-semibold text-gray-900">{extra.shared_with_accounts}</p>
                    </div>
                  )}
                  {extra.audiences_built_from != null && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500">Audiences built from</p>
                      <p className="text-lg font-semibold text-gray-900">{extra.audiences_built_from}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Lookalike details */}
          {listing.asset_type === 'lookalike_audience' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Country:</span> <span className="text-gray-900">{extra.lookalike_country?.toUpperCase() || '—'}</span></div>
              <div><span className="text-gray-500">Similarity:</span> <span className="text-gray-900">{extra.lookalike_ratio ? `${(extra.lookalike_ratio * 100).toFixed(0)}%` : '—'}</span></div>
            </div>
          )}

          {/* Seller explanation */}
          {extra.seller_explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Seller notes on data source</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{extra.seller_explanation}</p>
            </div>
          )}

          {/* Proofs */}
          {Object.values(signedProofs).flat().length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Proof screenshots</h2>
              <div className="space-y-5">
                {Object.entries(signedProofs).map(([slot, urls]) => urls.length > 0 && (
                  <div key={slot}>
                    <p className="text-sm font-medium text-gray-700 mb-2">{slotLabel[slot] || slot}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {urls.map((u, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                          <img src={u} alt="proof" className="w-full h-40 object-cover rounded border border-gray-200 hover:border-blue-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Price + buy */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-4">
            <p className="text-3xl font-bold text-gray-900 mb-1">{formatPrice(listing.price_cents)}</p>
            {listing.accepts_crypto && <p className="text-xs text-blue-600 mb-4">Accepts crypto</p>}

            {isOwner ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 mb-2">Your listing</div>
                <Link href="/my-listings" className="block w-full py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg text-center">Manage listings</Link>
              </div>
            ) : user ? (
              <Link href={`/listings/${listing.id}/buy`} className="block w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg text-center hover:bg-blue-700">
                Buy now
              </Link>
            ) : (
              <Link href="/login" className="block w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg text-center">
                Log in to buy
              </Link>
            )}
            <p className="text-xs text-gray-400 mt-3">10% platform fee. Escrow protected. Asset transferred via Meta Graph API after payment.</p>
          </div>

          {/* Seller */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs text-gray-500 mb-2">Seller</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                {(listing.seller_username || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">@{listing.seller_username || 'anon'}</p>
                <p className="text-xs text-gray-500">
                  {listing.seller_total_sales || 0} sale{listing.seller_total_sales === 1 ? '' : 's'}
                  {listing.seller_rating != null && <> · ★ {listing.seller_rating.toFixed(1)}</>}
                </p>
              </div>
            </div>
            {listing.seller_verified && <p className="text-xs text-green-600 mt-2">✓ Verified seller</p>}
          </div>

          {/* Listing info */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Listed</span><span className="text-gray-700">{listing.created_at ? new Date(listing.created_at).toLocaleDateString() : '—'}</span></div>
            {listing.secondary_categories && listing.secondary_categories.length > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Tags</span><span className="text-gray-700">{listing.secondary_categories.join(', ')}</span></div>
            )}
            {listing.niche && <div className="flex justify-between"><span className="text-gray-500">Niche</span><span className="text-gray-700">{listing.niche}</span></div>}
          </div>
        </div>
      </div>
    </div>
  )
}
