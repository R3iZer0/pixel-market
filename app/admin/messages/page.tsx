import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const supabase = createAdminClient()
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  const { data: messages } = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id, listing_id, order_id, profiles!messages_sender_id_fkey(username)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const rows = (messages ?? []) as unknown as Array<{
    id: string
    body: string
    created_at: string | null
    sender_id: string
    listing_id: string | null
    order_id: string | null
    profiles: { username: string } | null
  }>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Sender</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Context</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(m => (
                <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.profiles ? (
                      <Link href={`/admin/users/${m.sender_id}`} className="hover:text-blue-600">@{m.profiles.username}</Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 max-w-[300px]">
                    <span className="truncate block">{m.body}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                    {m.listing_id && (
                      <Link href={`/admin/listings/${m.listing_id}`} className="hover:text-blue-600">listing:{m.listing_id.slice(0, 6)}</Link>
                    )}
                    {m.order_id && <span>order:{m.order_id.slice(0, 6)}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">No messages</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`?page=${page - 1}`} className="text-blue-600 hover:underline">Previous</Link>
          )}
          <span className="text-gray-500">Page {page}</span>
          {rows.length === limit && (
            <Link href={`?page=${page + 1}`} className="text-blue-600 hover:underline">Next</Link>
          )}
        </div>
      </div>
    </div>
  )
}
