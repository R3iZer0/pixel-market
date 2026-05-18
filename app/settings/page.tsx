'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Profile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  crypto_wallet: string | null
  preferred_chain: string | null
  meta_access_token: string | null
  meta_token_expires: string | null
  meta_business_id: string | null
  is_verified: boolean
  rating: number | null
  total_sales: number
}

const CHAINS = ['ETH', 'SOL', 'BTC', 'LTC', 'TRON', 'MATIC', 'BSC']

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPayout, setSavingPayout] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Editable fields
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [cryptoWallet, setCryptoWallet] = useState('')
  const [preferredChain, setPreferredChain] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setProfile(d.profile)
          setUsername(d.profile.username || '')
          setDisplayName(d.profile.display_name || '')
          setBio(d.profile.bio || '')
          setAvatarUrl(d.profile.avatar_url || '')
          setCryptoWallet(d.profile.crypto_wallet || '')
          setPreferredChain(d.profile.preferred_chain || '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function saveProfile() {
    setSavingProfile(true)
    setMsg(null)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      }),
    })
    const d = await res.json()
    setSavingProfile(false)
    if (d.error) setMsg({ type: 'err', text: d.error })
    else { setMsg({ type: 'ok', text: 'Profile updated' }); setProfile(d.profile); router.refresh() }
  }

  async function savePayout() {
    setSavingPayout(true)
    setMsg(null)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crypto_wallet: cryptoWallet || null,
        preferred_chain: preferredChain || null,
      }),
    })
    const d = await res.json()
    setSavingPayout(false)
    if (d.error) setMsg({ type: 'err', text: d.error })
    else setMsg({ type: 'ok', text: 'Payout settings saved' })
  }

  async function disconnectMeta() {
    if (!confirm('Disconnect Meta? All active listings will be paused.')) return
    setDisconnecting(true)
    await fetch('/api/auth/meta-disconnect', { method: 'POST' })
    setDisconnecting(false)
    router.refresh()
    window.location.reload()
  }

  if (loading) return <div className="p-10 text-gray-500">Loading…</div>
  if (!profile) return (
    <div className="p-10">
      <p className="text-red-600 mb-4">Not authenticated</p>
      <Link href="/login" className="text-blue-600">Log in</Link>
    </div>
  )

  const tokenExpiresSoon = profile.meta_token_expires
    ? new Date(profile.meta_token_expires) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        {msg && (
          <div className={`p-3 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        {/* Public profile */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Public profile</h2>
          <p className="text-xs text-gray-500 mb-4">Buyers see your username, display name, avatar, bio, and rating.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Username (public)</label>
              <input value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              <p className="text-xs text-gray-400 mt-1">3–30 chars, a–z 0–9 _</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Display name (optional)</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Avatar URL (optional)</label>
              <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://…" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Bio (optional)</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <button onClick={saveProfile} disabled={savingProfile} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
            {profile.username && (
              <p className="text-xs text-gray-500">
                Public URL: <Link href={`/profile/${profile.username}`} className="text-blue-600">/profile/{profile.username}</Link>
              </p>
            )}
          </div>
        </section>

        {/* Meta connection */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Meta / Facebook</h2>
          <p className="text-xs text-gray-500 mb-4">Used to list assets and transfer them after sale.</p>

          {profile.meta_access_token ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-gray-500 text-xs">Status</p>
                  <p className="text-green-600">Connected</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-gray-500 text-xs">FB user ID</p>
                  <p className="text-gray-900 font-mono text-xs">{profile.meta_business_id || '—'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded col-span-2">
                  <p className="text-gray-500 text-xs">Token expires</p>
                  <p className={tokenExpiresSoon ? 'text-yellow-600' : 'text-gray-900'}>
                    {profile.meta_token_expires ? new Date(profile.meta_token_expires).toLocaleString() : '—'}
                    {tokenExpiresSoon && ' — expires soon, reconnect recommended'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a href="/api/auth/meta-connect" className="px-4 py-2 bg-[#1877F2] text-white text-sm rounded-lg">Reconnect</a>
                <button onClick={disconnectMeta} disabled={disconnecting} className="px-4 py-2 border border-red-200 text-red-600 text-sm rounded-lg disabled:opacity-50">
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
              <p className="text-xs text-gray-400">Disconnecting pauses all your active listings.</p>
            </div>
          ) : (
            <a href="/api/auth/meta-connect" className="inline-block px-4 py-2 bg-[#1877F2] text-white text-sm rounded-lg">Connect Meta</a>
          )}
        </section>

        {/* Payout settings */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Payout settings</h2>
          <p className="text-xs text-gray-500 mb-4">Where to receive funds when your listings sell. 10% platform fee deducted.</p>

          <div className="space-y-4">
            {/* Stripe — placeholder */}
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900">Card payouts (Stripe Connect)</p>
                <span className="text-xs text-gray-400">Coming soon</span>
              </div>
              <p className="text-xs text-gray-500">Stripe Connect onboarding will be enabled once payments are wired (Phase 6).</p>
              <button disabled className="mt-3 px-4 py-2 border border-gray-200 text-gray-400 text-sm rounded-lg disabled:opacity-50 cursor-not-allowed">Connect Stripe</button>
            </div>

            {/* Crypto wallet */}
            <div>
              <p className="font-medium text-gray-900 mb-2">Crypto wallet</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Wallet address</label>
                  <input value={cryptoWallet} onChange={e => setCryptoWallet(e.target.value)} placeholder="0x… or bc1… etc." className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Preferred chain</label>
                  <select value={preferredChain} onChange={e => setPreferredChain(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">— select chain —</option>
                    {CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={savePayout} disabled={savingPayout} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
                  {savingPayout ? 'Saving…' : 'Save wallet'}
                </button>
                <p className="text-xs text-gray-400">USDC/USDT recommended to avoid price volatility.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Account stats */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-gray-500 text-xs">Total sales</p>
              <p className="text-xl font-bold text-gray-900">{profile.total_sales}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-gray-500 text-xs">Rating</p>
              <p className="text-xl font-bold text-gray-900">{profile.rating != null ? `★ ${profile.rating.toFixed(1)}` : '—'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-gray-500 text-xs">Verified</p>
              <p className="text-xl font-bold text-gray-900">{profile.is_verified ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
