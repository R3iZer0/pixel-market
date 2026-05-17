import Link from "next/link";
import { ArrowRight, Shield, Zap, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="flex items-center gap-6">
          <Link href="/browse" className="text-sm text-gray-600 hover:text-gray-900">Browse</Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
          <Link href="/signup" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            Fully automated via Meta Graph API
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
            Buy & sell Meta ad assets.<br />
            <span className="text-blue-600">No manual steps.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            The first peer-to-peer marketplace for Meta pixels, custom audiences, and lookalike audiences. Pay with card or crypto.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/browse" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Browse listings <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/signup" className="px-6 py-3 rounded-lg font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              List an asset
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-gray-100 bg-gray-50 py-20">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-5 h-5 text-blue-600" />,
                title: "Instant transfer",
                desc: "Asset moves to buyer's Meta account automatically via API once payment clears.",
              },
              {
                icon: <Shield className="w-5 h-5 text-blue-600" />,
                title: "Escrow protected",
                desc: "Funds held in escrow. Seller paid only after buyer confirms receipt.",
              },
              {
                icon: <Users className="w-5 h-5 text-blue-600" />,
                title: "Trade or sell",
                desc: "List for cash (card or crypto) or trade for another audience. 10% platform fee.",
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Asset types */}
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What you can buy & sell</h2>
          <p className="text-gray-500 mb-10">All 4 Meta advertising asset types supported</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Meta Pixels", sub: "Event data & history" },
              { label: "Custom Audiences", sub: "Website, app, CRM" },
              { label: "Lookalike Audiences", sub: "Scaled from source" },
              { label: "Engagement Audiences", sub: "Page, IG, video" },
            ].map(a => (
              <div key={a.label} className="border border-gray-100 rounded-xl p-5 text-left hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer">
                <p className="font-medium text-gray-900 text-sm mb-1">{a.label}</p>
                <p className="text-xs text-gray-400">{a.sub}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        © 2026 PixelMarket. 10% fee on all transactions.
      </footer>
    </div>
  );
}
