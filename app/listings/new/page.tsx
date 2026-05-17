'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES, GEO_OPTIONS } from '@/lib/listing-constants'

type MetaPixel = {
  id: string; name: string; ad_account_id: string; ad_account_name: string
  creation_time?: string; last_fired_time?: string
  owner_business?: { id: string; name: string }
}
type MetaAudience = {
  id: string; name: string; subtype: string
  ad_account_id: string; ad_account_name: string
  approximate_count_lower_bound?: number; approximate_count_upper_bound?: number
  retention_days?: number; description?: string
  time_created?: number; time_updated?: number
  data_source?: { type?: string; sub_type?: string; creation_params?: { event_name?: string; page_id?: string; video_id?: string; app_id?: string } }
  rule?: string
  lookalike_spec?: { type?: string; ratio?: number; country?: string; origin?: Array<{ id: string; name: string; type: string }>; origin_event_source_name?: string }
}
type AccountBundle = { ad_account: { id: string; name: string }; pixels: MetaPixel[]; audiences: MetaAudience[] }

type AssetSelection =
  | { kind: 'pixel'; pixel: MetaPixel }
  | { kind: 'audience'; audience: MetaAudience }

// Map Meta subtype → app-side asset_type
function assetTypeFor(sel: AssetSelection): 'pixel' | 'custom_audience' | 'lookalike_audience' | 'engagement_audience' {
  if (sel.kind === 'pixel') return 'pixel'
  const st = sel.audience.subtype
  if (st === 'LOOKALIKE') return 'lookalike_audience'
  if (st === 'ENGAGEMENT' || st === 'VIDEO' || st === 'PAGE' || st === 'INSTAGRAM') return 'engagement_audience'
  return 'custom_audience'
}

function subtypeLabel(s: string): string {
  const map: Record<string, string> = {
    CUSTOM: 'Customer List',
    WEBSITE: 'Website Traffic',
    APP: 'App Activity',
    LOOKALIKE: 'Lookalike',
    ENGAGEMENT: 'Engagement',
    VIDEO: 'Video Views',
    PAGE: 'Facebook Page',
    INSTAGRAM: 'Instagram',
    LEAD_GENERATION: 'Lead Ad Form',
    OFFLINE_CONVERSION: 'Offline Activity',
    CLAIM: 'Claim',
    PARTNER: 'Partner',
    MANAGED: 'Managed',
  }
  return map[s] || s
}

export default function NewListingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountBundle[]>([])

  const [selected, setSelected] = useState<AssetSelection | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [retentionDays, setRetentionDays] = useState<number>(30)
  const [audienceSize, setAudienceSize] = useState<string>('')
  const [primaryCategory, setPrimaryCategory] = useState<string>('')
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>([])
  const [geo, setGeo] = useState<string[]>([])
  const [niche, setNiche] = useState('')
  const [transactionType, setTransactionType] = useState<'sale' | 'trade' | 'both'>('sale')
  const [priceDollars, setPriceDollars] = useState<string>('')
  const [estValueDollars, setEstValueDollars] = useState<string>('')
  const [acceptsCrypto, setAcceptsCrypto] = useState(false)

  // Pixel-specific extras (auto-set; user can override)
  const [pixelAgeDays, setPixelAgeDays] = useState<number | ''>('')

  useEffect(() => {
    fetch('/api/meta/assets')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setAccounts(d.accounts || [])
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  const assetType = selected ? assetTypeFor(selected) : null
  const isPixel = assetType === 'pixel'
  const isLookalike = assetType === 'lookalike_audience'

  // Force pixels to sale-only
  useEffect(() => {
    if (isPixel) setTransactionType('sale')
  }, [isPixel])

  function selectPixel(p: MetaPixel) {
    setSelected({ kind: 'pixel', pixel: p })
    setTitle(p.name)
    setDescription('')
    setSourceUrl('')
    setAudienceSize('')
    if (p.creation_time) {
      const ageMs = Date.now() - new Date(p.creation_time).getTime()
      setPixelAgeDays(Math.floor(ageMs / (1000 * 60 * 60 * 24)))
    }
  }

  function selectAudience(a: MetaAudience) {
    setSelected({ kind: 'audience', audience: a })
    setTitle(a.name)
    setDescription(a.description || '')
    if (a.retention_days) setRetentionDays(a.retention_days)
    const size = a.approximate_count_upper_bound ?? a.approximate_count_lower_bound ?? 0
    setAudienceSize(size ? String(size) : '')
    setPixelAgeDays('')
    // Auto-set geo from lookalike country
    if (a.subtype === 'LOOKALIKE' && a.lookalike_spec?.country) {
      const c = a.lookalike_spec.country.toUpperCase()
      if (!geo.includes(c)) setGeo(prev => [...prev, c])
    }
  }

  async function submit() {
    if (!selected) return
    setLoading(true)
    setError(null)

    const audSize = audienceSize ? parseInt(audienceSize) : null

    // Build source metadata
    let audience_source: string | null = null
    let source_event: string | null = null
    let source_name: string | null = null
    let source_extra: Record<string, unknown> | null = null

    if (selected.kind === 'pixel') {
      audience_source = 'WEBSITE'
      source_name = selected.pixel.name
    } else {
      const a = selected.audience
      audience_source = a.data_source?.type || a.subtype
      source_event = a.data_source?.creation_params?.event_name || null
      source_name = a.name
      if (a.subtype === 'LOOKALIKE' && a.lookalike_spec) {
        source_extra = {
          lookalike_country: a.lookalike_spec.country,
          lookalike_ratio: a.lookalike_spec.ratio,
          origin_audiences: a.lookalike_spec.origin,
          origin_event_source_name: a.lookalike_spec.origin_event_source_name,
        }
      } else if (a.data_source) {
        source_extra = { data_source: a.data_source }
      }
    }

    const payload = {
      title,
      description,
      asset_type: assetType,
      transaction_type: transactionType,
      price_cents: priceDollars ? Math.round(parseFloat(priceDollars) * 100) : null,
      estimated_value_cents: estValueDollars ? Math.round(parseFloat(estValueDollars) * 100) : null,
      accepts_crypto: acceptsCrypto,
      meta_asset_id: selected.kind === 'pixel' ? selected.pixel.id : selected.audience.id,
      meta_ad_account_id: selected.kind === 'pixel' ? selected.pixel.ad_account_id : selected.audience.ad_account_id,
      audience_source,
      source_event,
      source_url: sourceUrl || null,
      source_name,
      source_platform: null,
      source_extra,
      audience_size: audSize,
      retention_days: isPixel ? null : retentionDays,
      geo: geo.length ? geo : null,
      niche: niche || null,
      primary_category: primaryCategory || null,
      secondary_categories: secondaryCategories.length ? secondaryCategories : null,
      pixel_age_days: isPixel && pixelAgeDays !== '' ? pixelAgeDays : null,
    }

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    router.push(`/my-listings`)
  }

  const allPixels = useMemo(() => accounts.flatMap(a => a.pixels), [accounts])
  const allAudiences = useMemo(() => accounts.flatMap(a => a.audiences), [accounts])

  if (loading && accounts.length === 0) return <div className="p-10 text-gray-500">Loading Meta assets…</div>
  if (error && accounts.length === 0) {
    return (
      <div className="p-10">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="text-sm text-gray-500">Step {step} of 5</div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className={`h-1 flex-1 rounded ${n <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* STEP 1 — Select asset */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Pick an asset to list</h1>
            <p className="text-gray-500 mb-6">All assets pulled live from your Meta account.</p>

            {selected && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-900">
                Selected: <strong>{selected.kind === 'pixel' ? selected.pixel.name : selected.audience.name}</strong>
                <span className="text-gray-500"> — {assetType}</span>
              </div>
            )}

            <details open className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-semibold cursor-pointer text-gray-900">Pixels ({allPixels.length})</summary>
              <div className="mt-3 space-y-1">
                {allPixels.length === 0 && <p className="text-sm text-gray-400">No pixels found.</p>}
                {allPixels.map(p => (
                  <label key={`${p.ad_account_id}-${p.id}`} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="radio"
                      name="asset"
                      checked={selected?.kind === 'pixel' && selected.pixel.id === p.id && selected.pixel.ad_account_id === p.ad_account_id}
                      onChange={() => selectPixel(p)}
                    />
                    <span className="flex-1 text-gray-900">{p.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{p.id}</span>
                    <span className="text-xs text-gray-400">{p.ad_account_name}</span>
                  </label>
                ))}
              </div>
            </details>

            <details className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-semibold cursor-pointer text-gray-900">Audiences ({allAudiences.length})</summary>
              <div className="mt-3 space-y-1">
                {allAudiences.length === 0 && <p className="text-sm text-gray-400">No audiences found.</p>}
                {allAudiences.map(a => (
                  <label key={`${a.ad_account_id}-${a.id}`} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="radio"
                      name="asset"
                      checked={selected?.kind === 'audience' && selected.audience.id === a.id && selected.audience.ad_account_id === a.ad_account_id}
                      onChange={() => selectAudience(a)}
                    />
                    <span className="flex-1 text-gray-900">{a.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-700">{subtypeLabel(a.subtype)}</span>
                    <span className="text-xs text-gray-400">
                      {a.approximate_count_upper_bound?.toLocaleString() || a.approximate_count_lower_bound?.toLocaleString() || '—'}
                    </span>
                    <span className="text-xs text-gray-400">{a.ad_account_name}</span>
                  </label>
                ))}
              </div>
            </details>

            <div className="flex justify-end">
              <button disabled={!selected} onClick={() => setStep(2)} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 2 — Asset-aware details */}
        {step === 2 && selected && (
          <div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">
              {isPixel ? 'Pixel details' : isLookalike ? 'Lookalike details' : 'Audience details'}
            </h1>
            <p className="text-gray-500 mb-6">
              {isPixel && 'Most fields auto-filled from Meta. Add a website URL so buyers know what traffic to expect.'}
              {isLookalike && 'Source audience info is auto-detected. Nothing to enter here unless you want to add context.'}
              {!isPixel && !isLookalike && 'Pre-filled from Meta. Tweak if needed.'}
            </p>

            <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Listing title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Description (optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>

              {/* PIXEL */}
              {selected.kind === 'pixel' && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Created</p>
                      <p className="text-gray-900">{selected.pixel.creation_time ? new Date(selected.pixel.creation_time).toLocaleDateString() : '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Last fired</p>
                      <p className="text-gray-900">{selected.pixel.last_fired_time ? new Date(selected.pixel.last_fired_time).toLocaleDateString() : '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Pixel age (days)</p>
                      <p className="text-gray-900">{pixelAgeDays || '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Pixel ID</p>
                      <p className="text-gray-900 font-mono text-xs">{selected.pixel.id}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Website URL (recommended)</label>
                    <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                </>
              )}

              {/* LOOKALIKE */}
              {isLookalike && selected.kind === 'audience' && (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Country</p>
                      <p className="text-gray-900">{selected.audience.lookalike_spec?.country?.toUpperCase() || '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Similarity</p>
                      <p className="text-gray-900">{selected.audience.lookalike_spec?.ratio ? `${(selected.audience.lookalike_spec.ratio * 100).toFixed(0)}%` : '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Size</p>
                      <p className="text-gray-900">{audienceSize ? parseInt(audienceSize).toLocaleString() : '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Retention</p>
                      <p className="text-gray-900">{retentionDays} days</p>
                    </div>
                  </div>
                  {selected.audience.lookalike_spec?.origin?.[0] && (
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Source audience</p>
                      <p className="text-gray-900">{selected.audience.lookalike_spec.origin[0].name}</p>
                      <p className="text-gray-400 text-xs font-mono">{selected.audience.lookalike_spec.origin[0].id} ({selected.audience.lookalike_spec.origin[0].type})</p>
                    </div>
                  )}
                </div>
              )}

              {/* OTHER AUDIENCES (custom/engagement) */}
              {!isPixel && !isLookalike && selected.kind === 'audience' && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Subtype</p>
                      <p className="text-gray-900">{subtypeLabel(selected.audience.subtype)}</p>
                    </div>
                    {selected.audience.data_source?.creation_params?.event_name && (
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-gray-500 text-xs">Event</p>
                        <p className="text-gray-900">{selected.audience.data_source.creation_params.event_name}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Audience size</label>
                    <input
                      type="number"
                      value={audienceSize}
                      onChange={e => setAudienceSize(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                    {selected.audience.approximate_count_lower_bound != null && (
                      <p className="text-xs text-gray-400 mt-1">
                        Meta reports: {selected.audience.approximate_count_lower_bound.toLocaleString()}
                        {selected.audience.approximate_count_upper_bound != null && selected.audience.approximate_count_upper_bound !== selected.audience.approximate_count_lower_bound
                          ? `–${selected.audience.approximate_count_upper_bound.toLocaleString()}` : ''}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Retention (days, 1–180)</label>
                    <input type="number" min={1} max={180} value={retentionDays} onChange={e => setRetentionDays(parseInt(e.target.value) || 30)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Source URL (optional)</label>
                    <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="px-6 py-2 border border-gray-200 rounded-lg">← Back</button>
              <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 3 — Categorize */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Categorize</h1>
            <p className="text-gray-500 mb-6">Helps buyers find your asset.</p>
            <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Primary category</label>
                <select value={primaryCategory} onChange={e => setPrimaryCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                  <option value="">— pick one —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Secondary categories (up to 2)</label>
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-auto border border-gray-200 rounded-lg p-2">
                  {CATEGORIES.filter(c => c !== primaryCategory).map(c => (
                    <label key={c} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={secondaryCategories.includes(c)}
                        disabled={!secondaryCategories.includes(c) && secondaryCategories.length >= 2}
                        onChange={e => {
                          if (e.target.checked) setSecondaryCategories([...secondaryCategories, c])
                          else setSecondaryCategories(secondaryCategories.filter(x => x !== c))
                        }}
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Geo</label>
                <div className="flex flex-wrap gap-2">
                  {GEO_OPTIONS.map(g => (
                    <label key={g} className={`px-3 py-1 border rounded-full text-sm cursor-pointer ${geo.includes(g) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-700'}`}>
                      <input type="checkbox" className="hidden" checked={geo.includes(g)} onChange={e => {
                        if (e.target.checked) setGeo([...geo, g])
                        else setGeo(geo.filter(x => x !== g))
                      }} />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Niche (free text, optional)</label>
                <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. high-ticket coaching, vegan skincare" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(2)} className="px-6 py-2 border border-gray-200 rounded-lg">← Back</button>
              <button onClick={() => setStep(4)} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Pricing */}
        {step === 4 && (
          <div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Pricing</h1>
            <p className="text-gray-500 mb-6">10% platform fee on all transactions.</p>
            <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Transaction type</label>
                {isPixel ? (
                  <>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                      Sale only (pixels cannot be traded)
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    {(['sale', 'trade', 'both'] as const).map(t => (
                      <button key={t} onClick={() => setTransactionType(t)} className={`flex-1 px-3 py-2 border rounded-lg text-sm capitalize ${transactionType === t ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-700'}`}>{t}</button>
                    ))}
                  </div>
                )}
              </div>

              {(transactionType === 'sale' || transactionType === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Price (USD)</label>
                  <input type="number" min={0} step={0.01} value={priceDollars} onChange={e => setPriceDollars(e.target.value)} placeholder="e.g. 199.00" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                  {priceDollars && (
                    <p className="text-xs text-gray-500 mt-1">You receive: ${(parseFloat(priceDollars) * 0.9).toFixed(2)} (after 10% fee)</p>
                  )}
                </div>
              )}

              {!isPixel && (transactionType === 'trade' || transactionType === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Estimated value (USD, for trade fee calc)</label>
                  <input type="number" min={0} step={0.01} value={estValueDollars} onChange={e => setEstValueDollars(e.target.value)} placeholder="e.g. 500.00" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
              )}

              <label className="flex items-center gap-2 text-gray-700">
                <input type="checkbox" checked={acceptsCrypto} onChange={e => setAcceptsCrypto(e.target.checked)} />
                <span className="text-sm">Accept crypto (BTC, ETH, USDC, USDT, SOL, LTC)</span>
              </label>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(3)} className="px-6 py-2 border border-gray-200 rounded-lg">← Back</button>
              <button onClick={() => setStep(5)} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 5 — Preview */}
        {step === 5 && selected && (
          <div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Preview & publish</h1>
            <p className="text-gray-500 mb-6">Review before going live.</p>
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Title</span><span className="font-medium text-gray-900">{title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="text-gray-900">{assetType}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Meta ID</span><span className="font-mono text-xs text-gray-900">{selected.kind === 'pixel' ? selected.pixel.id : selected.audience.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ad Account</span><span className="font-mono text-xs text-gray-900">{selected.kind === 'pixel' ? selected.pixel.ad_account_id : selected.audience.ad_account_id}</span></div>
              {isPixel && pixelAgeDays !== '' && <div className="flex justify-between"><span className="text-gray-500">Pixel age</span><span className="text-gray-900">{pixelAgeDays} days</span></div>}
              {!isPixel && <div className="flex justify-between"><span className="text-gray-500">Retention</span><span className="text-gray-900">{retentionDays} days</span></div>}
              {audienceSize && <div className="flex justify-between"><span className="text-gray-500">Size</span><span className="text-gray-900">{parseInt(audienceSize).toLocaleString()}</span></div>}
              {sourceUrl && <div className="flex justify-between"><span className="text-gray-500">URL</span><span className="text-gray-900 truncate ml-4">{sourceUrl}</span></div>}
              {primaryCategory && <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="text-gray-900">{primaryCategory}</span></div>}
              {geo.length > 0 && <div className="flex justify-between"><span className="text-gray-500">Geo</span><span className="text-gray-900">{geo.join(', ')}</span></div>}
              {niche && <div className="flex justify-between"><span className="text-gray-500">Niche</span><span className="text-gray-900">{niche}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Transaction</span><span className="capitalize text-gray-900">{transactionType}</span></div>
              {priceDollars && <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="text-gray-900">${priceDollars}</span></div>}
              {estValueDollars && <div className="flex justify-between"><span className="text-gray-500">Est. value</span><span className="text-gray-900">${estValueDollars}</span></div>}
              {acceptsCrypto && <div className="flex justify-between"><span className="text-gray-500">Crypto</span><span className="text-gray-900">Accepted</span></div>}
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(4)} className="px-6 py-2 border border-gray-200 rounded-lg">← Back</button>
              <button onClick={submit} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? 'Publishing…' : 'Publish listing'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
