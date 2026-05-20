import Link from "next/link";
import { ArrowRight, Shield, Zap, BarChart3, Lock, CheckCircle, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-50 z-10">
        <Link href="/" className="text-xl font-bold text-blue-600">PixelMarket</Link>
        <div className="flex items-center gap-6">
          <Link href="/browse" className="text-sm text-gray-600 hover:text-gray-900">Browse</Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
          <Link href="/signup" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
            <Zap className="w-3.5 h-3.5" />
            Automated via Meta Graph API
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
            Buy & sell Meta<br />
            <span className="text-blue-600">advertising assets.</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            The only peer-to-peer marketplace for Meta pixels, custom audiences, and lookalike audiences.
            Payment → transfer → done. No manual steps, no back-and-forth.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/browse" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Browse marketplace <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/signup" className="px-6 py-3 rounded-lg font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              List an asset →
            </Link>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-y border-gray-100 bg-white py-6">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { val: "4 types", label: "Asset types supported" },
              { val: "Instant", label: "Automated API transfer" },
              { val: "7-day", label: "Buyer escrow window" },
              { val: "$30/mo", label: "Flat subscription, no fees" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-gray-900">{s.val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">How it works</h2>
          <p className="text-gray-500 text-center mb-12">Three steps from listing to transfer</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {[
              {
                n: "1",
                title: "Seller lists the asset",
                desc: "Connect Meta account. Pick a pixel or audience from your ad account. Set a price and upload proof screenshots.",
              },
              {
                n: "2",
                title: "Buyer pays via Stripe",
                desc: "Browse listings, pick an asset, select your ad account. Checkout with card. Funds go into escrow.",
              },
              {
                n: "3",
                title: "Automatic transfer",
                desc: "The moment payment clears, our system calls the Meta Graph API and moves the asset to the buyer's account. No manual steps.",
              },
            ].map(step => (
              <div key={step.n} className="bg-white border border-gray-100 rounded-xl p-6">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mb-4">
                  {step.n}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Asset types */}
        <section className="bg-white border-t border-gray-100 py-20">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">What you can buy & sell</h2>
            <p className="text-gray-500 text-center mb-10">All major Meta advertising asset types supported</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Meta Pixels",
                  sub: "Full event history, website audiences, and retargeting data — transferred with all historic signal intact.",
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  label: "Custom Audiences",
                  sub: "Website visitor, CRM upload, app activity, and customer list audiences.",
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                },
                {
                  label: "Lookalike Audiences",
                  sub: "Pre-built lookalikes with country and similarity % — skip the seeding phase.",
                  color: "text-green-600",
                  bg: "bg-green-50",
                },
                {
                  label: "Engagement Audiences",
                  sub: "Page, Instagram, video, and lead form engagement audiences.",
                  color: "text-orange-600",
                  bg: "bg-orange-50",
                },
              ].map(a => (
                <div key={a.label} className="border border-gray-100 rounded-xl p-5 hover:border-blue-200 transition-colors">
                  <div className={`inline-flex px-2 py-0.5 ${a.bg} ${a.color} text-xs font-semibold rounded mb-3`}>{a.label}</div>
                  <p className="text-xs text-gray-500 leading-relaxed">{a.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust features */}
        <section className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Built for trust</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Lock className="w-5 h-5 text-blue-600" />,
                title: "Escrow protected",
                desc: "Funds held in escrow for 7 days after transfer. Open a dispute if the asset isn't as described.",
              },
              {
                icon: <Shield className="w-5 h-5 text-blue-600" />,
                title: "Proof screenshots required",
                desc: "Every listing requires sellers to upload proof screenshots from Events Manager and Audience Manager.",
              },
              {
                icon: <BarChart3 className="w-5 h-5 text-blue-600" />,
                title: "Verified via Meta API",
                desc: "Asset details are pulled directly from the Meta Graph API — not seller-entered, not faked.",
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="bg-white border-t border-gray-100 py-16">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="bg-blue-600 rounded-2xl p-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-wide mb-2 opacity-80">Simple pricing</p>
              <p className="text-5xl font-bold mb-1">$30<span className="text-2xl font-normal opacity-80">/mo</span></p>
              <p className="text-blue-200 text-sm mb-6">3-day free trial · No transaction fees · Cancel anytime</p>
              <div className="space-y-2 text-sm text-left mb-8">
                {[
                  "Unlimited listings",
                  "Unlimited purchases",
                  "Automated Meta API transfer",
                  "Buyer & seller escrow protection",
                  "Messaging & price offers",
                  "Stripe payouts for sellers",
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-300 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" className="block w-full bg-white text-blue-600 font-semibold py-3 rounded-lg hover:bg-blue-50 transition-colors">
                Start free trial
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span>© 2026 PixelMarket. Peer-to-peer Meta asset marketplace.</span>
          <div className="flex gap-4">
            <Link href="/browse" className="hover:text-gray-700">Browse</Link>
            <Link href="/legal/privacy" className="hover:text-gray-700">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-gray-700">Terms</Link>
            <Link href="/legal/data-deletion" className="hover:text-gray-700">Data Deletion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
