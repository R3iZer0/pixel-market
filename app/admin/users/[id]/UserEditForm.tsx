'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/database'

export default function UserEditForm({ userId, profile }: { userId: string; profile: Profile }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [fields, setFields] = useState({
    display_name: profile.display_name ?? '',
    username: profile.username ?? '',
    bio: profile.bio ?? '',
    is_verified: profile.is_verified ?? false,
    subscription_status: profile.subscription_status ?? '',
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setMsg('Error: ' + (data.error ?? 'unknown'))
    } else {
      setMsg('Saved!')
      router.refresh()
    }
  }

  async function handleBan() {
    if (!confirm('Ban this user? Cancels subscription + expires all listings.')) return
    setLoading(true)
    await fetch(`/api/admin/users/${userId}?action=ban`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('PERMANENTLY delete this user? Cannot be undone.')) return
    setLoading(true)
    await fetch(`/api/admin/users/${userId}?action=delete`, { method: 'DELETE' })
    setLoading(false)
    router.push('/admin/users')
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Display name</label>
        <input
          value={fields.display_name}
          onChange={e => setFields(f => ({ ...f, display_name: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Username</label>
        <input
          value={fields.username}
          onChange={e => setFields(f => ({ ...f, username: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Bio</label>
        <textarea
          value={fields.bio}
          onChange={e => setFields(f => ({ ...f, bio: e.target.value }))}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Subscription status override</label>
        <select
          value={fields.subscription_status}
          onChange={e => setFields(f => ({ ...f, subscription_status: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">— none —</option>
          <option value="trialing">trialing</option>
          <option value="active">active</option>
          <option value="past_due">past_due</option>
          <option value="canceled">canceled</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_verified"
          checked={fields.is_verified}
          onChange={e => setFields(f => ({ ...f, is_verified: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="is_verified" className="text-xs text-gray-700">Verified seller</label>
      </div>

      {msg && <p className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Saving…' : 'Save changes'}
      </button>

      <div className="pt-2 border-t border-gray-100 space-y-2">
        <button
          type="button"
          onClick={handleBan}
          disabled={loading}
          className="w-full border border-red-200 text-red-600 text-sm py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Ban user
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="w-full bg-red-600 text-white text-sm py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          Delete user permanently
        </button>
      </div>
    </form>
  )
}
