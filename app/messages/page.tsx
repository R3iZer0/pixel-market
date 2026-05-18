'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Thread = {
  key: string
  listing_id: string | null
  order_id: string | null
  peer_id: string
  last_message: { body: string; created_at: string | null; sender_id: string }
  unread: number
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => fetch('/api/messages')
      .then(r => r.json())
      .then(d => setThreads(d.threads || []))
      .catch(() => {})
    load().finally(() => setLoading(false))
    const interval = setInterval(() => {
      if (!document.hidden) load()
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  function threadHref(t: Thread) {
    if (t.order_id) return `/messages/order-${t.order_id}`
    if (t.listing_id) return `/messages/listing-${t.listing_id}-${t.peer_id}`
    return '#'
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : threads.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
            No conversations yet. Message a seller from any <Link href="/browse" className="text-blue-600">listing</Link>.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {threads.map(t => (
              <Link key={t.key} href={threadHref(t)} className="block p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900 text-sm">
                    {t.order_id ? `Order thread` : `Listing thread`}
                  </p>
                  <div className="flex items-center gap-2">
                    {t.unread > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{t.unread}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {t.last_message.created_at ? new Date(t.last_message.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-1">{t.last_message.body}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
