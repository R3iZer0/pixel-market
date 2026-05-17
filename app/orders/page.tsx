import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('orders')
    .select('*, listings(title, asset_type)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
  const orders = data || []

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders ({orders.length})</h1>
        {orders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
            No orders yet. <Link href="/browse" className="text-blue-600">Browse marketplace →</Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left p-3">Listing</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <Link href={`/orders/${o.id}`} className="text-gray-900 hover:text-blue-600">
                        {o.listings?.title || 'Listing'}
                      </Link>
                      <p className="text-xs text-gray-400">{o.listings?.asset_type}</p>
                    </td>
                    <td className="p-3 text-gray-700">${((o.amount_cents || 0) / 100).toFixed(2)}</td>
                    <td className="p-3"><span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-700">{o.status}</span></td>
                    <td className="p-3 text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
