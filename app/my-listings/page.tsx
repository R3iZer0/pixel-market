import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Listing } from '@/types/database'

export default async function MyListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listingsData } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
  const listings = (listingsData || []) as Listing[]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <Link href="/listings/new" className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">+ New listing</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Listings ({listings.length})</h1>

        {listings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
            <p className="text-gray-500 mb-4">No listings yet.</p>
            <Link href="/listings/new" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Create your first listing</Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {listings.map(l => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{l.title}</p>
                      <p className="text-xs text-gray-400 font-mono">{l.meta_asset_id}</p>
                    </td>
                    <td className="p-3 text-gray-600">{l.asset_type}</td>
                    <td className="p-3 text-gray-600">
                      {l.price_cents ? `$${(l.price_cents / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        l.status === 'active' ? 'bg-green-100 text-green-700'
                        : l.status === 'sold' ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                      }`}>{l.status}</span>
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/listings/${l.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                    </td>
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
