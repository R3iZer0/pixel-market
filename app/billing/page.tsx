'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Profile = {
  subscription_status: string | null
  subscription_current_period_end: string | null
  trial_ends_at: string | null
  stripe_account_id: string | null
  stripe_connect_charges_enabled: boolean | null
  stripe_connect_payouts_enabled: boolean | null
  stripe_customer_id: string | null
}

type Payout = {
  id: string
  amount_cents: number
  status: string
  payout_method: string
  releasable_at: string | null
  sent_at: string | null
  created_at: string
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-gray-500">Loading…</div>}>
      <BillingInner />
    </Suspense>
  )
}

function BillingInner() {
  const sp = useSearchParams()
  const status = sp.get('status')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/payouts').then(r => r.json()).catch(() => ({ payouts: [] })),
    ]).then(([prof, pays]) => {
      setProfile(prof.profile || null)
      setPayouts(pays.payouts || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function startSubscription() {
    setBusy('sub')
    const res = await fetch('/api/billing/checkout', { method: 'POST' })
    const d = await res.json()
    if (d.url) window.location.href = d.url
    else setBusy(null)
  }

  async function openPortal() {
    setBusy('portal')
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const d = await res.json()
    if (d.url) window.location.href = d.url
    else setBusy(null)
  }

  async function connectStripe() {
    setBusy('connect')
    const res = await fetch('/api/billing/connect/start', { method: 'POST' })
    const d = await res.json()
    if (d.url) window.location.href = d.url
    else setBusy(null)
  }

  if (loading) return <div className="p-10 text-gray-500">Loading…</div>

  const hasSub = ['active', 'trialing'].includes(profile?.subscription_status || '')
  const subStatus = profile?.subscription_status
  const connectReady = profile?.stripe_connect_payouts_enabled

  const totalEarned = payouts.filter(p => p.status === 'sent').reduce((s, p) => s + p.amount_cents, 0)
  const pending = payouts.filter(p => ['pending', 'releasable'].includes(p.status)).reduce((s, p) => s + p.amount_cents, 0)

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Payouts</h1>

        {status === 'success' && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">Subscription active. Welcome!</div>
        )}
        {status === 'cancelled' && (
          <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">Checkout cancelled.</div>
        )}
        {status === 'connect_complete' && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">Stripe Connect onboarding completed.</div>
        )}

        {/* Subscription */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900">Subscription</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              hasSub ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>{subStatus || 'inactive'}</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">$30/month. 3-day free trial. Required to list or buy.</p>

          {hasSub ? (
            <>
              {profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date() && (
                <p className="text-xs text-gray-500 mb-2">Trial ends: {new Date(profile.trial_ends_at).toLocaleDateString()}</p>
              )}
              {profile?.subscription_current_period_end && (
                <p className="text-xs text-gray-500 mb-3">Next renewal: {new Date(profile.subscription_current_period_end).toLocaleDateString()}</p>
              )}
              <button onClick={openPortal} disabled={busy !== null} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg disabled:opacity-50">
                {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
              </button>
            </>
          ) : (
            <button onClick={startSubscription} disabled={busy !== null} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
              {busy === 'sub' ? 'Loading…' : 'Start 3-day free trial — $30/mo after'}
            </button>
          )}
        </section>

        {/* Stripe Connect (payouts) */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900">Payout account (Stripe Connect)</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              connectReady ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>{connectReady ? 'Ready' : 'Not set up'}</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Required to receive USD when your listings sell. Stripe handles KYC, bank, tax. Onboarding takes ~5 min.
          </p>
          <button onClick={connectStripe} disabled={busy !== null} className="px-4 py-2 bg-[#635BFF] text-white text-sm rounded-lg disabled:opacity-50">
            {busy === 'connect' ? 'Opening…' : (connectReady ? 'Update Stripe details' : 'Set up Stripe payout account')}
          </button>
        </section>

        {/* Earnings summary */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Earnings</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Total earned</p>
              <p className="text-xl font-bold text-gray-900">${(totalEarned / 100).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold text-gray-900">${(pending / 100).toFixed(2)}</p>
            </div>
          </div>

          {payouts.length === 0 ? (
            <p className="text-sm text-gray-400">No payouts yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase">
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Releases / Sent</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900">${(p.amount_cents / 100).toFixed(2)}</td>
                    <td className="py-2 text-gray-700 capitalize">{p.payout_method}</td>
                    <td className="py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{p.status}</span></td>
                    <td className="py-2 text-xs text-gray-500">
                      {p.sent_at ? `Sent ${new Date(p.sent_at).toLocaleDateString()}`
                        : p.releasable_at ? `Releases ${new Date(p.releasable_at).toLocaleDateString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
