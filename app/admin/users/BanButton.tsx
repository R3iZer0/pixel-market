'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BanButton({ userId, username }: { userId: string; username: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleBan() {
    if (!confirm(`Ban user @${username}? This will cancel their listings and subscription.`)) return
    setLoading(true)
    await fetch(`/api/admin/users/${userId}?action=ban`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleBan}
      disabled={loading}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {loading ? '…' : 'Ban'}
    </button>
  )
}
