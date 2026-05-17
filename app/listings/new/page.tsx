'use client'

import { useState, useEffect, useMemo, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES, GEO_OPTIONS } from '@/lib/listing-constants'

type MetaPixel = {
  id: string; name: string; ad_account_id: string; ad_account_name: string
  creation_time?: string; last_fired_time?: string
}
type MetaAudience = {
  id: string; name: string; subtype: string
  ad_account_id: string; ad_account_name: string
  approximate_count_lower_bound?: number; approximate_count_upper_bound?: number
  retention_days?: number; description?: string
  data_source?: { type?: string; sub_type?: string; creation_params?: { event_name?: string; page_id?: string; video_id?: string; app_id?: string } }
  lookalike_spec?: { type?: string; ratio?: number; country?: string; origin?: Array<{ id: string; name: string; type: string }>; origin_event_source_name?: string }
}
type AccountBundle = { ad_account: { id: string; name: string }; pixels: MetaPixel[]; audiences: MetaAudience[] }

type AssetSelection =
  | { kind: 'pixel'; pixel: MetaPixel }
  | { kind: 'audience'; audience: MetaAudience }

type PixelDetails = {
  base: { name?: string; creation_time?: string; last_fired_time?: string } | null
  events_28d: Array<{ event: string; count: number }>
  hosts_28d: Array<{ host: string; count: number }>
  shared_accounts: Array<{ id: string; name?: string }>
  audiences_built: Array<{ id: string; name: string; subtype?: string }>
  window_start: number
  window_end: number
}

type AudienceDetails = {
  base: (Record<string, unknown> & {
    name?: string; subtype?: string; description?: string
    approximate_count_lower_bound?: number; approximate_count_upper_bound?: number
    retention_days?: number; time_created?: number
    data_source?: { type?: string; sub_type?: string; creation_params?: { event_name?: string; page_id?: string; video_id?: string; app_id?: string; pixel_id?: string } }
    lookalike_spec?: { country?: string; ratio?: number; origin?: Array<{ id: string; name: string; type: string }>; origin_event_source_name?: string }
    operation_status?: { code: number; description: string }
  }) | null
  origin: Record<string, unknown> | null
  origin_pixel: { id?: string; name?: string; creation_time?: string; last_fired_time?: string } | null
  parsed_rule: unknown
}

function assetTypeFor(sel: AssetSelection): 'pixel' | 'custom_audience' | 'lookalike_audience' | 'engagement_audience' {
  if (sel.kind === 'pixel') return 'pixel'
  const st = sel.audience.subtype
  if (st === 'LOOKALIKE') return 'lookalike_audience'
  if (st === 'ENGAGEMENT' || st === 'VIDEO' || st === 'PAGE' || st === 'INSTAGRAM') return 'engagement_audience'
  return 'custom_audience'
}

function subtypeLabel(s: string): string {
  const map: Record<string, string> = {
    CUSTOM: 'Customer List', WEBSITE: 'Website Traffic', APP: 'App Activity',
    LOOKALIKE: 'Lookalike', ENGAGEMENT: 'Engagement', VIDEO: 'Video Views',
    PAGE: 'Facebook Page', INSTAGRAM: 'Instagram', LEAD_GENERATION: 'Lead Ad Form',
    OFFLINE_CONVERSION: 'Offline Activity', CLAIM: 'Claim', PARTNER: 'Partner', MANAGED: 'Managed',
  }
  return map[s] || s
}

// Tag input — press Enter to add
function TagInput({
  values, onChange, placeholder,
}: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  function commit() {
    const t = draft.trim()
    if (t && !values.includes(t)) onChange([...values, t])
    setDraft('')
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1))
    }
  }
  return (
    <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg min-h-[42px]">
      {values.map(v => (
        <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-sm">
          {v}
          <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="text-blue-700 hover:text-red-600">×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm border-none p-0"
      />
    </div>
  )
}

export default function NewListingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountBundle[]>([])

  const [selected, setSelected] = useState<AssetSelection | null>(null)
  const [pixelDetails, setPixelDetails] = useState<PixelDetails | null>(null)
  const [audienceDetails, setAudienceDetails] = useState<AudienceDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Common
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [retentionDays, setRetentionDays] = useState<number>(30)
  const [audienceSize, setAudienceSize] = useState<string>('')

  // Pixel-specific
  const [websiteTags, setWebsiteTags] = useState<string[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [highlightedEvent, setHighlightedEvent] = useState<string>('')
  const [pixelAgeDays, setPixelAgeDays] = useState<number | ''>('')
  // Manual event entries (for when API stats are empty)
  const [manualEvents, setManualEvents] = useState<Array<{ event: string; count: string }>>([])

  // Data-provenance fields
  const [dataSourceExplanation, setDataSourceExplanation] = useState('')

  // Categorize
  const [primaryCategory, setPrimaryCategory] = useState<string>('')
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>([])
  const [geo, setGeo] = useState<string[]>([])
  const [niche, setNiche] = useState('')

  // Proof screenshots — keyed by slot, stores { path, preview_url }
  const [proofs, setProofs] = useState<Record<string, Array<{ path: string; preview_url: string }>>>({})
  const [uploading, setUploading] = useState<string | null>(null)

  // Pricing — sell-only platform
  const [priceDollars, setPriceDollars] = useState<string>('')
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

  useEffect(() => {
    if (!selected) return
    setLoadingDetails(true)
    setPixelDetails(null)
    setAudienceDetails(null)
    const type = selected.kind
    const id = type === 'pixel' ? selected.pixel.id : selected.audience.id
    fetch(`/api/meta/asset-details?type=${type}&id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (type === 'pixel') {
          setPixelDetails(d)
          if (d.hosts_28d?.length) {
            setWebsiteTags(d.hosts_28d.slice(0, 3).map((h: { host: string }) => h.host))
          }
          if (d.events_28d?.length) {
            setSelectedEvents(d.events_28d.map((e: { event: string }) => e.event))
            const purchase = d.events_28d.find((e: { event: string }) => e.event === 'Purchase')
            setHighlightedEvent(purchase?.event || d.events_28d[0]?.event || '')
          }
        } else {
          setAudienceDetails(d)
        }
        setLoadingDetails(false)
      })
      .catch(e => { console.error(e); setLoadingDetails(false) })
  }, [selected])

  const assetType = selected ? assetTypeFor(selected) : null
  const isPixel = assetType === 'pixel'
  const isLookalike = assetType === 'lookalike_audience'
  const isCustomList = selected?.kind === 'audience' && selected.audience.subtype === 'CUSTOM'
  const isWebsiteAudience = selected?.kind === 'audience' && selected.audience.subtype === 'WEBSITE'
  const needsExplanation = isLookalike || isCustomList || isWebsiteAudience

  function selectPixel(p: MetaPixel) {
    setSelected({ kind: 'pixel', pixel: p })
    setTitle(p.name)
    setDescription('')
    setAudienceSize('')
    setWebsiteTags([])
    setSelectedEvents([])
    setManualEvents([])
    setHighlightedEvent('')
    setDataSourceExplanation('')
    if (p.creation_time) {
      const ageMs = Date.now() - new Date(p.creation_time).getTime()
      setPixelAgeDays(Math.floor(ageMs / (1000 * 60 * 60 * 24)))
    }
  }

  function selectAudience(a: MetaAudience) {
    setSelected({ kind: 'audience', audience: a })
    setTitle(a.name)
    setDescription(a.description || '')
    setDataSourceExplanation('')
    if (a.retention_days) setRetentionDays(a.retention_days)
    const size = a.approximate_count_upper_bound ?? a.approximate_count_lower_bound ?? 0
    setAudienceSize(size ? String(size) : '')
    setPixelAgeDays('')
    if (a.subtype === 'LOOKALIKE' && a.lookalike_spec?.country) {
      const c = a.lookalike_spec.country.toUpperCase()
      setGeo(prev => prev.includes(c) ? prev : [...prev, c])
    }
  }

  function addManualEvent() {
    setManualEvents([...manualEvents, { event: '', count: '' }])
  }
  function updateManualEvent(i: number, field: 'event' | 'count', val: string) {
    const next = [...manualEvents]
    next[i] = { ...next[i], [field]: val }
    setManualEvents(next)
  }
  function removeManualEvent(i: number) {
    setManualEvents(manualEvents.filter((_, x) => x !== i))
  }

  async function uploadFiles(slot: string, files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(slot)
    const added: Array<{ path: string; preview_url: string }> = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slot', slot)
      const res = await fetch('/api/upload/proof', { method: 'POST', body: fd })
      const d = await res.json()
      if (d.path && d.preview_url) added.push({ path: d.path, preview_url: d.preview_url })
      else setError(d.error || 'Upload failed')
    }
    setProofs(prev => ({ ...prev, [slot]: [...(prev[slot] || []), ...added] }))
    setUploading(null)
  }

  function removeProof(slot: string, path: string) {
    setProofs(prev => ({ ...prev, [slot]: (prev[slot] || []).filter(p => p.path !== path) }))
  }

  async function submit() {
    if (!selected) return
    setLoading(true)
    setError(null)

    const audSize = audienceSize ? parseInt(audienceSize) : null

    let audience_source: string | null = null
    let source_event: string | null = null
    let source_name: string | null = null
    let source_url: string | null = null
    let source_extra: Record<string, unknown> | null = null

    if (selected.kind === 'pixel') {
      audience_source = 'WEBSITE'
      source_name = selected.pixel.name
      source_event = highlightedEvent || null
      source_url = websiteTags[0] ? (websiteTags[0].startsWith('http') ? websiteTags[0] : `https://${websiteTags[0]}`) : null

      const autoEvents = pixelDetails?.events_28d?.filter(e => selectedEvents.includes(e.event)) || []
      const manualClean = manualEvents
        .filter(e => e.event.trim() && e.count.trim())
        .map(e => ({ event: e.event.trim(), count: parseInt(e.count) || 0 }))

      source_extra = {
        websites: websiteTags,
        events_auto: autoEvents,
        events_manual: manualClean,
        events_window_days: 28,
        last_fired_time: selected.pixel.last_fired_time,
        creation_time: selected.pixel.creation_time,
        pixel_age_days: pixelAgeDays || null,
        shared_with_accounts: pixelDetails?.shared_accounts?.length || 0,
        audiences_built_from: pixelDetails?.audiences_built?.length || 0,
        proofs: Object.fromEntries(Object.entries(proofs).map(([k, v]) => [k, v.map(p => p.path)])),
      }
    } else {
      const a = selected.audience
      audience_source = a.data_source?.type || a.subtype
      source_event = a.data_source?.creation_params?.event_name || null
      source_name = a.name

      const base: Record<string, unknown> = {
        seller_explanation: dataSourceExplanation || null,
        proofs: Object.fromEntries(Object.entries(proofs).map(([k, v]) => [k, v.map(p => p.path)])),
      }

      if (a.subtype === 'LOOKALIKE' && a.lookalike_spec) {
        base.lookalike_country = a.lookalike_spec.country
        base.lookalike_ratio = a.lookalike_spec.ratio
        base.origin_audiences = a.lookalike_spec.origin
        base.origin_event_source_name = a.lookalike_spec.origin_event_source_name
        base.origin_details = audienceDetails?.origin || null
        base.origin_pixel = audienceDetails?.origin_pixel || null
      } else if (a.data_source) {
        base.data_source = a.data_source
        base.parsed_rule = audienceDetails?.parsed_rule || null
      }

      source_extra = base
    }

    const payload = {
      title, description,
      asset_type: assetType,
      transaction_type: 'sale',
      price_cents: priceDollars ? Math.round(parseFloat(priceDollars) * 100) : null,
      estimated_value_cents: null,
      accepts_crypto: acceptsCrypto,
      meta_asset_id: selected.kind === 'pixel' ? selected.pixel.id : selected.audience.id,
      meta_ad_account_id: selected.kind === 'pixel' ? selected.pixel.ad_account_id : selected.audience.ad_account_id,
      audience_source, source_event, source_url, source_name,
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

  // Explanation prompt per subtype
  function explanationPlaceholder() {
    if (isLookalike) return 'Where did the source audience data come from? e.g. "Built from 30k Purchase events on my Shopify store over 90 days."'
    if (isCustomList) return 'Where did this customer list come from? e.g. "Email subscribers from my newsletter, opted in via lead magnet."'
    if (isWebsiteAudience) return 'Which website is this audience built from? e.g. "Visitors to checkout page on store.com, last 30 days."'
    return ''
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="text-sm text-gray-500">Step {step} of 6</div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className={`h-1 flex-1 rounded ${n <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* STEP 1 */}
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
                    <input type="radio" name="asset"
                      checked={selected?.kind === 'pixel' && selected.pixel.id === p.id && selected.pixel.ad_account_id === p.ad_account_id}
                      onChange={() => selectPixel(p)} />
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
                    <input type="radio" name="asset"
                      checked={selected?.kind === 'audience' && selected.audience.id === a.id && selected.audience.ad_account_id === a.ad_account_id}
                      onChange={() => selectAudience(a)} />
                    <span className="flex-1 text-gray-900">{a.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-700">{subtypeLabel(a.subtype)}</span>
                    <span className="text-xs text-gray-400">{(a.approximate_count_upper_bound || a.approximate_count_lower_bound)?.toLocaleString() || '—'}</span>
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

        {/* STEP 2 */}
        {step === 2 && selected && (
          <div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">
              {isPixel ? 'Pixel details' : isLookalike ? 'Lookalike details' : 'Audience details'}
            </h1>
            <p className="text-gray-500 mb-6">
              {loadingDetails ? 'Loading deep details from Meta…' : 'Auto-filled. Tweak as needed.'}
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

              {/* ───── PIXEL ───── */}
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
                      <p className="text-gray-500 text-xs">Age</p>
                      <p className="text-gray-900">{pixelAgeDays || '—'} days</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-500 text-xs">Pixel ID</p>
                      <p className="text-gray-900 font-mono text-xs">{selected.pixel.id}</p>
                    </div>
                  </div>

                  {/* Websites — tag input */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Websites (press Enter to add)</label>
                    {pixelDetails?.hosts_28d && pixelDetails.hosts_28d.length > 0 && (
                      <p className="text-xs text-gray-500 mb-2">Suggested from last 28d:
                        {pixelDetails.hosts_28d.slice(0, 5).map(h => (
                          <button key={h.host} type="button" onClick={() => {
                            if (!websiteTags.includes(h.host)) setWebsiteTags([...websiteTags, h.host])
                          }} className="ml-1 px-2 py-0.5 bg-gray-100 hover:bg-blue-50 rounded text-gray-700 text-xs">
                            + {h.host} <span className="text-gray-400">({h.count.toLocaleString()})</span>
                          </button>
                        ))}
                      </p>
                    )}
                    <TagInput values={websiteTags} onChange={setWebsiteTags} placeholder="store.com" />
                  </div>

                  {/* Events — auto from API */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Events detected (last 28 days)
                    </label>
                    {pixelDetails?.events_28d && pixelDetails.events_28d.length > 0 ? (
                      <div className="space-y-1 border border-gray-200 rounded-lg p-2 max-h-64 overflow-auto">
                        {pixelDetails.events_28d.map(ev => (
                          <label key={ev.event} className="flex items-center gap-2 text-sm p-1 hover:bg-gray-50 rounded">
                            <input type="checkbox" checked={selectedEvents.includes(ev.event)} onChange={e => {
                              if (e.target.checked) setSelectedEvents([...selectedEvents, ev.event])
                              else setSelectedEvents(selectedEvents.filter(x => x !== ev.event))
                            }} />
                            <span className="flex-1 text-gray-900">{ev.event}</span>
                            <span className="text-xs text-gray-400">{ev.count.toLocaleString()}</span>
                            <button type="button" onClick={() => setHighlightedEvent(ev.event)} className={`text-xs px-2 py-0.5 rounded ${highlightedEvent === ev.event ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500'}`}>
                              {highlightedEvent === ev.event ? '★' : 'Feature'}
                            </button>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mb-2">
                        {loadingDetails ? 'Loading…' : 'No events detected via API. Enter manually below.'}
                      </p>
                    )}
                  </div>

                  {/* Manual events */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Manual events (add what you know)</label>
                      <button type="button" onClick={addManualEvent} className="text-xs text-blue-600 hover:underline">+ Add event</button>
                    </div>
                    {manualEvents.length === 0 ? (
                      <p className="text-xs text-gray-400">None added.</p>
                    ) : (
                      <div className="space-y-2">
                        {manualEvents.map((e, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              value={e.event}
                              onChange={v => updateManualEvent(i, 'event', v.target.value)}
                              placeholder="Event name (e.g. Purchase)"
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <input
                              value={e.count}
                              onChange={v => updateManualEvent(i, 'count', v.target.value)}
                              placeholder="Count"
                              type="number"
                              className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <button type="button" onClick={() => removeManualEvent(i)} className="px-2 text-gray-400 hover:text-red-600">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {pixelDetails && (
                    <div className="grid grid-cols-3 gap-3 text-sm pt-3 border-t border-gray-100">
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-gray-500 text-xs">Audiences built</p>
                        <p className="text-gray-900">{pixelDetails.audiences_built?.length || 0}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-gray-500 text-xs">Shared accounts</p>
                        <p className="text-gray-900">{pixelDetails.shared_accounts?.length || 0}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-gray-500 text-xs">Total event types</p>
                        <p className="text-gray-900">{pixelDetails.events_28d?.length || 0}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ───── LOOKALIKE ───── */}
              {isLookalike && selected.kind === 'audience' && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
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

                  {audienceDetails?.origin ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2 text-sm">
                      <p className="font-semibold text-gray-900">Source audience (from Meta)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-gray-500">Name:</span> <span className="text-gray-900">{String(audienceDetails.origin.name || '—')}</span></div>
                        <div><span className="text-gray-500">Subtype:</span> <span className="text-gray-900">{subtypeLabel(String(audienceDetails.origin.subtype || ''))}</span></div>
                        <div><span className="text-gray-500">Size:</span> <span className="text-gray-900">{Number(audienceDetails.origin.approximate_count_upper_bound || audienceDetails.origin.approximate_count_lower_bound || 0).toLocaleString()}</span></div>
                        <div><span className="text-gray-500">Retention:</span> <span className="text-gray-900">{String(audienceDetails.origin.retention_days || '—')} days</span></div>
                      </div>
                      {audienceDetails.origin_pixel && (
                        <div className="mt-2 pt-2 border-t border-blue-200 text-xs">
                          <p className="text-gray-500">Source pixel:</p>
                          <p className="text-gray-900">{audienceDetails.origin_pixel.name} <span className="font-mono text-gray-400">({audienceDetails.origin_pixel.id})</span></p>
                        </div>
                      )}
                    </div>
                  ) : loadingDetails ? (
                    <p className="text-xs text-gray-400">Loading source audience details…</p>
                  ) : null}
                </>
              )}

              {/* ───── CUSTOM / ENGAGEMENT (non-lookalike audiences) ───── */}
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
                    {audienceDetails?.base?.data_source?.creation_params?.pixel_id && (
                      <div className="p-3 bg-gray-50 rounded col-span-2">
                        <p className="text-gray-500 text-xs">Source pixel</p>
                        <p className="text-gray-900 font-mono text-xs">{audienceDetails.base.data_source.creation_params.pixel_id}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Audience size</label>
                    <input type="number" value={audienceSize} onChange={e => setAudienceSize(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Retention (days, 1–180)</label>
                    <input type="number" min={1} max={180} value={retentionDays} onChange={e => setRetentionDays(parseInt(e.target.value) || 30)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                </>
              )}

              {/* Where did the data come from (lookalike, custom list, website audience) */}
              {needsExplanation && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    {isLookalike && 'Where did the source data come from? (Required)'}
                    {isCustomList && 'Where did this customer list come from? (Required)'}
                    {isWebsiteAudience && 'Which website is this audience built from? (Required)'}
                  </label>
                  <textarea
                    value={dataSourceExplanation}
                    onChange={e => setDataSourceExplanation(e.target.value)}
                    rows={3}
                    placeholder={explanationPlaceholder()}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Buyers want to know provenance. Be specific.</p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="px-6 py-2 border border-gray-200 rounded-lg">← Back</button>
              <button
                disabled={needsExplanation && !dataSourceExplanation.trim()}
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >Next →</button>
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
                      <input type="checkbox" checked={secondaryCategories.includes(c)}
                        disabled={!secondaryCategories.includes(c) && secondaryCategories.length >= 2}
                        onChange={e => {
                          if (e.target.checked) setSecondaryCategories([...secondaryCategories, c])
                          else setSecondaryCategories(secondaryCategories.filter(x => x !== c))
                        }} />
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

        {/* STEP 4 — Proof screenshots */}
        {step === 4 && selected && (() => {
          const slots = isPixel
            ? [
                { key: 'events_manager', label: 'Events Manager — events firing', required: true, hint: 'Screenshot of Events Manager showing your events list with counts.' },
                { key: 'websites_traffic', label: 'Website traffic / domain breakdown', required: false, hint: 'Optional: screenshot showing which domains are firing the pixel.' },
              ]
            : [
                { key: 'summary_panel', label: 'Audience summary panel', required: true, hint: 'Screenshot of the audience details panel in Ads Manager.' },
                { key: 'campaigns_used', label: 'Campaigns this audience was used in', required: true, hint: 'Screenshot of Ads Manager filtered by this audience showing campaigns.' },
                { key: 'history', label: 'Audience history / timeline', required: false, hint: 'Optional: screenshot showing how the audience grew over time.' },
              ]
          const missingRequired = slots.some(s => s.required && (proofs[s.key] || []).length === 0)
          return (
            <div>
              <h1 className="text-2xl font-bold mb-2 text-gray-900">Proof screenshots</h1>
              <p className="text-gray-500 mb-6">Upload screenshots backing up the claims you made. Builds buyer trust.</p>
              <div className="space-y-6">
                {slots.map(slot => (
                  <div key={slot.key} className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{slot.label}</h3>
                      {slot.required && <span className="text-xs text-red-500">Required</span>}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{slot.hint}</p>

                    {(proofs[slot.key] || []).length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {(proofs[slot.key] || []).map(p => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <div key={p.path} className="relative group">
                            <img src={p.preview_url} alt="proof" className="w-full h-32 object-cover rounded border border-gray-200" />
                            <button
                              type="button"
                              onClick={() => removeProof(slot.key, p.path)}
                              className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="inline-block">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading === slot.key}
                        onChange={e => uploadFiles(slot.key, e.target.files)}
                        className="hidden"
                      />
                      <span className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        {uploading === slot.key ? 'Uploading…' : '+ Add screenshot(s)'}
                      </span>
                    </label>
                    <p className="text-xs text-gray-400 mt-2">PNG/JPG/WebP, 8MB max each.</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(3)} className="px-6 py-2 border border-gray-200 rounded-lg">← Back</button>
                <button
                  disabled={missingRequired || uploading !== null}
                  onClick={() => setStep(5)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >Next →</button>
              </div>
            </div>
          )
        })()}

        {/* STEP 5 — Pricing (sale only) */}
        {step === 5 && (
          <div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Pricing</h1>
            <p className="text-gray-500 mb-6">10% platform fee. Sale only.</p>
            <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Sale price (USD)</label>
                <input type="number" min={0} step={0.01} value={priceDollars} onChange={e => setPriceDollars(e.target.value)} placeholder="e.g. 199.00" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                {priceDollars && <p className="text-xs text-gray-500 mt-1">You receive: ${(parseFloat(priceDollars) * 0.9).toFixed(2)} (after 10% fee)</p>}
              </div>
              <label className="flex items-center gap-2 text-gray-700">
                <input type="checkbox" checked={acceptsCrypto} onChange={e => setAcceptsCrypto(e.target.checked)} />
                <span className="text-sm">Accept crypto (BTC, ETH, USDC, USDT, SOL, LTC)</span>
              </label>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(4)} className="px-6 py-2 border border-gray-200 rounded-lg">← Back</button>
              <button disabled={!priceDollars} onClick={() => setStep(6)} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 6 — Preview */}
        {step === 6 && selected && (
          <div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Preview & publish</h1>
            <p className="text-gray-500 mb-6">Review before going live.</p>
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Title</span><span className="font-medium text-gray-900">{title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="text-gray-900">{assetType}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Meta ID</span><span className="font-mono text-xs text-gray-900">{selected.kind === 'pixel' ? selected.pixel.id : selected.audience.id}</span></div>

              {isPixel && (
                <>
                  {pixelAgeDays !== '' && <div className="flex justify-between"><span className="text-gray-500">Pixel age</span><span className="text-gray-900">{pixelAgeDays} days</span></div>}
                  {websiteTags.length > 0 && <div className="flex justify-between"><span className="text-gray-500">Websites</span><span className="text-gray-900">{websiteTags.join(', ')}</span></div>}
                  {highlightedEvent && <div className="flex justify-between"><span className="text-gray-500">Featured event</span><span className="text-gray-900">{highlightedEvent}</span></div>}
                  {(selectedEvents.length + manualEvents.filter(e => e.event.trim()).length) > 0 && (
                    <div className="flex justify-between"><span className="text-gray-500">Events</span><span className="text-gray-900">{selectedEvents.length + manualEvents.filter(e => e.event.trim()).length}</span></div>
                  )}
                </>
              )}

              {!isPixel && <div className="flex justify-between"><span className="text-gray-500">Retention</span><span className="text-gray-900">{retentionDays} days</span></div>}
              {audienceSize && <div className="flex justify-between"><span className="text-gray-500">Size</span><span className="text-gray-900">{parseInt(audienceSize).toLocaleString()}</span></div>}
              {dataSourceExplanation && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-gray-500 text-xs mb-1">Data source explanation</p>
                  <p className="text-gray-900">{dataSourceExplanation}</p>
                </div>
              )}
              {primaryCategory && <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="text-gray-900">{primaryCategory}</span></div>}
              {geo.length > 0 && <div className="flex justify-between"><span className="text-gray-500">Geo</span><span className="text-gray-900">{geo.join(', ')}</span></div>}
              {niche && <div className="flex justify-between"><span className="text-gray-500">Niche</span><span className="text-gray-900">{niche}</span></div>}
              {priceDollars && <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="text-gray-900">${priceDollars}</span></div>}
              {acceptsCrypto && <div className="flex justify-between"><span className="text-gray-500">Crypto</span><span className="text-gray-900">Accepted</span></div>}
              {(() => {
                const total = Object.values(proofs).reduce((a, b) => a + b.length, 0)
                return total > 0 ? (
                  <div className="flex justify-between"><span className="text-gray-500">Proof screenshots</span><span className="text-gray-900">{total}</span></div>
                ) : null
              })()}
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(5)} className="px-6 py-2 border border-gray-200 rounded-lg">← Back</button>
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
