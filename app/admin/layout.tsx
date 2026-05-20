import { requireAdmin } from '@/lib/admin-auth'
import Link from 'next/link'
import { LayoutDashboard, Users, List, ShoppingBag, CreditCard, MessageSquare } from 'lucide-react'

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/admin/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { href: '/admin/listings', label: 'Listings', icon: <List className="w-4 h-4" /> },
  { href: '/admin/orders', label: 'Orders', icon: <ShoppingBag className="w-4 h-4" /> },
  { href: '/admin/payouts', label: 'Payouts', icon: <CreditCard className="w-4 h-4" /> },
  { href: '/admin/messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10">
        <div className="px-5 py-4 border-b border-gray-100">
          <Link href="/" className="text-sm font-bold text-blue-600">PixelMarket</Link>
          <p className="text-xs text-gray-500 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-3">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span className="text-gray-400">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-100">
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-700">
            Back to dashboard
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
