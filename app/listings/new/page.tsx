'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES, SOURCE_TYPES, GEO_OPTIONS, type SourceType } from '@/lib/listing-constants'

type MetaPixel = { id: string; name: string; ad_account_id: string; ad_account_name: string; creation_time?: string }
type MetaAudience = {
  id: string; name: string; subtype: string
  ad_account_id: string; ad_account_name: string
  approximate_count_lower_bound?: number; approximate_count_upper_bound?: number
  retention_days?: number; description?: string
}
type AccountBundle = { ad_account: { id: string; name: string }; pixels: MetaPixel[]; audiences: MetaAudience[] }

type AssetSelection = {
  type: 'pixel' | 'custom_audience' | 'lookalike_audience' | 'engagement_audience'
  meta_id: string
  meta_name: string
  ad_account_id: string
  audience_size?: number
  retention_days?: number
}

export default function NewListingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountBundle[]>([])

  // Step state
  const [selected, setSelected] = useState<AssetSelection | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [audienceSource, setAudienceSource] = useState<SourceType>('WEBSITE')
  const [sourceEvent, setSourceEvent] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourcePlatform, setSourcePlatform] = useState('')
  const [retentionDays, setRetentionDays] = useState<number>(30)
  const [primaryCategory, setPrimaryCategory] = useState<string>('')
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>([])
  const [geo, setGeo] = useState<string[]>([])
  const [niche, setNiche] = useState('')
  const [transactionType, setTransactionType] = useState<'sale' | 'trade' | 'both'>('sale')
  const [priceDollars, setPriceDollars] = useState<string>('')
  const [estValueDollars, setEstValueDollars] = useState<string>('')
  const [acceptsCrypto, setAcceptsCrypto] = useState(false)

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

  function selectPixel(p: MetaPixel) {
    setSelected({
      type: 'pixel',
      meta_id: p.id,
      meta_name: p.name,
      ad_account_id: p.ad_account_id,
    })
    setTitle(p.name)
  }

  function selectAudience(a: MetaAudience) {
    const type =
      a.subtype === 'LOOKALIKE' ? 'lookalike_audience'
      : a.subtype === 'ENGAGEMENT' ? 'engagement_audience'
      : 'custom_audience'
    setSelected({
      type,
      meta_id: a.id,
      meta_name: a.name,
      ad_account_id: a.ad_account_id,
      audience_size: a.approximate_count_upper_bound ?? a.approximate_count_lower_bound,
      retention_days: a.retention_days,
    })
    setTitle(a.name)
    if (a.retention_days) setRetentionDays(a.retention_days)
  }

  async function submit() {
    if (!selected) return
    setLoading(true)
    setError(null)
    const payload = {
      title,
      description,
      asset_type: selected.type,
      transaction_type: transactionType,
      price_cents: priceDollars ? Math.round(parseFloat(priceDollars) * 100) : null,
      estimated_value_cents: estValueDollars ? Math.round(parseFloat(estValueDollars) * 100) : null,
      accepts_crypto: acceptsCrypto,
      meta_asset_id: selected.meta_id,
      meta_ad_account_id: selected.ad_account_id,
      audience_source: selected.type === 'pixel' ? null : audienceSource,
      source_event: sourceEvent || null,
      source_url: sourceUrl || null,
      source_name: sourceName || null,
      source_platform: sourcePlatform || null,
      audience_size: selected.audience_size ?? null,
      retention_days: retentionDays,
      geo: geo.length ? geo : null,
      niche: niche || null,
      primary_category: primaryCategory || null,
      secondary_categories: secondaryCategories.length ? secondaryCategories : null,
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

  // Render

  if (loading && accounts.length === 0) {
    return <div className="p-10 text-gray-500">Loading Meta assets…</div>
  }

  if (error && accounts.length === 0) {
    return (
      <div className="p-10">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  const allPixels = accounts.flatMap(a => a.pixels)
  const allAudiences = accounts.flatMap(a => a.audiences)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="text-sm text-gray-500">Step {step} of 5</div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className={`h-1 flex-1 rounded ${n <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* STEP 1 — Select asset */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Pick an asset to list</h1>
            <p className="text-gray-500 mb-6">All assets pulled live from your Meta account.</p>

            {selected && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                Selected: <strong>{selected.meta_name}</strong> ({selected.type}) — {selected.meta_id}
              </div>
            )}

            <details open className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-semibold cursor-pointer">Pixels ({allPixels.length})</summary>
              <div className="mt-3 space-y-1">
                {allPixels.length === 0 && <p className="text-sm text-gray-400">No pixels found.</p>}
                {allPixels.map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="radio"
                      name="asset"
                      checked={selected?.meta_id === p.id}
                      onChange={() => selectPixel(p)}
                    />
                    <span className="flex-1">{p.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{p.id}</span>
                    <span className="text-xs text-gray-400">{p.ad_account_name}</span>
                  </label>
                ))}
              </div>
            </details>

            <details className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-semibold cursor-pointer">Audiences ({allAudiences.length})</summary>
              <div className="mt-3 space-y-1">
                {allAudiences.length === 0 && <p className="text-sm text-gray-400">No audiences found.</p>}
                {allAudiences.map(a => (
                  <label key={a.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="radio"
                      name="asset"
                      checked={selected?.meta_id === a.id}
                      onChange={() => selectAudience(a)}
                    />
                    <span className="flex-1">{a.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{a.subtype}</span>
                    <span className="text-xs text-gray-400">
                      {a.approximate_count_lower_bound?.toLocaleString() || '—'}
                    </span>
                    <span className="text-xs text-gray-400">{a.ad_account_name}</span>
                  </label>
                ))}
              </div>
            </details>

            <div className="flex justify-end">
              <button
                disabled={!selected}
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Source details */}
        {step === 2 && selected && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Source details</h1>
            <p className="text-gray-500 mb-6">Tell buyers where this data came from.</p>

            <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6">
              <div>
                <label className="block text-sm font-medium mb-1">Listing title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              {selected.type !== 'pixel' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Source type</label>
                    <select
                      value={audienceSource}
                      onChange={e => setAudienceSource(e.target.value as SourceType)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    >
                      {Object.entries(SOURCE_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  {SOURCE_TYPES[audienceSource].events.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Event</label>
                      <select
                        value={sourceEvent}
                        onChange={e => setSourceEvent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      >
                        <option value="">— pick one —</option>
                        {SOURCE_TYPES[audienceSource].events.map(ev => (
                          <option key={ev} value={ev}>{ev}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {SOURCE_TYPES[audienceSource].extra.includes('source_url' as never) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">URL / Link</label>
                      <input
                        value={sourceUrl}
                        onChange={e => setSourceUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                  )}

                  {SOURCE_TYPES[audienceSource].extra.includes('source_name' as never) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Page / App / Form name</label>
                      <input
                        value={sourceName}
                        onChange={e => setSourceName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                  )}

                  {SOURCE_TYPES[audienceSource].extra.includes('source_platform' as never) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Platform</label>
                      <select
                        value={sourcePlatform}
                        onChange={e => setSourcePlatform(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      >
                        <option value="">— pick one —</option>
                        <option value="ios">iOS</option>
                        <option value="android">Android</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Retention (days, 1–180)</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={retentionDays}
                  onChange={e => setRetentionDays(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="px-6 py-2 border rounded-lg">← Back</button>
              <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 3 — Categorize */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Categorize</h1>
            <p className="text-gray-500 mb-6">Helps buyers find your asset.</p>

            <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6">
              <div>
                <label className="block text-sm font-medium mb-1">Primary category</label>
                <select
                  value={primaryCategory}
                  onChange={e => setPrimaryCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">— pick one —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Secondary categories (up to 2)</label>
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-auto border border-gray-200 rounded-lg p-2">
                  {CATEGORIES.filter(c => c !== primaryCategory).map(c => (
                    <label key={c} className="flex items-center gap-2 text-sm">
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
                <label className="block text-sm font-medium mb-1">Geo (audience is from)</label>
                <div className="flex flex-wrap gap-2">
                  {GEO_OPTIONS.map(g => (
                    <label key={g} className={`px-3 py-1 border rounded-full text-sm cursor-pointer ${geo.includes(g) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={geo.includes(g)}
                        onChange={e => {
                          if (e.target.checked) setGeo([...geo, g])
                          else setGeo(geo.filter(x => x !== g))
                        }}
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Niche (free text, optional)</label>
                <input
                  value={niche}
                  onChange={e => setNiche(e.target.value)}
                  placeholder="e.g. high-ticket coaching, vegan skincare"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(2)} className="px-6 py-2 border rounded-lg">← Back</button>
              <button onClick={() => setStep(4)} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Pricing */}
        {step === 4 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Pricing</h1>
            <p className="text-gray-500 mb-6">10% platform fee on all transactions.</p>

            <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6">
              <div>
                <label className="block text-sm font-medium mb-1">Transaction type</label>
                <div className="flex gap-2">
                  {(['sale', 'trade', 'both'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTransactionType(t)}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm capitalize ${transactionType === t ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200'}`}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {(transactionType === 'sale' || transactionType === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Price (USD)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={priceDollars}
                    onChange={e => setPriceDollars(e.target.value)}
                    placeholder="e.g. 199.00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                  {priceDollars && (
                    <p className="text-xs text-gray-500 mt-1">
                      You receive: ${(parseFloat(priceDollars) * 0.9).toFixed(2)} (after 10% fee)
                    </p>
                  )}
                </div>
              )}

              {(transactionType === 'trade' || transactionType === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Estimated value (USD, for trade fee calc)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={estValueDollars}
                    onChange={e => setEstValueDollars(e.target.value)}
                    placeholder="e.g. 500.00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={acceptsCrypto}
                  onChange={e => setAcceptsCrypto(e.target.checked)}
                />
                <span className="text-sm">Accept crypto payments (BTC, ETH, USDC, USDT, SOL, LTC)</span>
              </label>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(3)} className="px-6 py-2 border rounded-lg">← Back</button>
              <button onClick={() => setStep(5)} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 5 — Preview + publish */}
        {step === 5 && selected && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Preview & publish</h1>
            <p className="text-gray-500 mb-6">Review before going live.</p>

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Title</span><span className="font-medium">{title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{selected.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Meta ID</span><span className="font-mono text-xs">{selected.meta_id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ad Account</span><span className="font-mono text-xs">{selected.ad_account_id}</span></div>
              {selected.type !== 'pixel' && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Source</span><span>{SOURCE_TYPES[audienceSource].label}</span></div>
                  {sourceEvent && <div className="flex justify-between"><span className="text-gray-500">Event</span><span>{sourceEvent}</span></div>}
                </>
              )}
              <div className="flex justify-between"><span className="text-gray-500">Retention</span><span>{retentionDays} days</span></div>
              {selected.audience_size && <div className="flex justify-between"><span className="text-gray-500">Size</span><span>{selected.audience_size.toLocaleString()}</span></div>}
              {primaryCategory && <div className="flex justify-between"><span className="text-gray-500">Category</span><span>{primaryCategory}</span></div>}
              {geo.length > 0 && <div className="flex justify-between"><span className="text-gray-500">Geo</span><span>{geo.join(', ')}</span></div>}
              {niche && <div className="flex justify-between"><span className="text-gray-500">Niche</span><span>{niche}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{transactionType}</span></div>
              {priceDollars && <div className="flex justify-between"><span className="text-gray-500">Price</span><span>${priceDollars}</span></div>}
              {estValueDollars && <div className="flex justify-between"><span className="text-gray-500">Est. value</span><span>${estValueDollars}</span></div>}
              {acceptsCrypto && <div className="flex justify-between"><span className="text-gray-500">Crypto</span><span>Accepted</span></div>}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(4)} className="px-6 py-2 border rounded-lg">← Back</button>
              <button
                onClick={submit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Publishing…' : 'Publish listing'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
