import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
          <div className="flex gap-4 text-sm text-gray-600">
            <Link href="/legal/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-gray-900">Terms</Link>
            <Link href="/legal/data-deletion" className="hover:text-gray-900">Data Deletion</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-12 text-gray-700 leading-relaxed [&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_li]:my-1 [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono">
        {children}
      </main>
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        © 2026 PixelMarket
      </footer>
    </div>
  )
}
