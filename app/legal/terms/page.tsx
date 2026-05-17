export const metadata = { title: 'Terms of Service — PixelMarket' }

export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 17, 2026</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Acceptance</h2>
      <p>By creating an account or using PixelMarket (the "Service"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Service.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Eligibility</h2>
      <p>You must be at least 18 years old and legally capable of entering binding contracts. You must own or have lawful authority over any Meta advertising asset you list. You are responsible for complying with Meta Platform Terms and Marketing API Terms.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. What PixelMarket Is</h2>
      <p>PixelMarket is a peer-to-peer marketplace facilitating the transfer of Meta advertising assets (pixels, custom audiences, lookalike audiences, engagement audiences) between users. We are not a party to transactions between users. We provide the infrastructure, escrow, and API integration that allows transactions to take place.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Accounts</h2>
      <p>You are responsible for keeping your credentials secure. Notify us immediately of any unauthorized access. We may suspend or terminate accounts that violate these Terms, are inactive, or appear fraudulent.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Listings</h2>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>You may list only assets you own and have the right to transfer.</li>
        <li>Listings must be accurate. Misrepresentation (size, retention, source, history) is grounds for removal and account suspension.</li>
        <li>Prohibited: assets containing personally identifiable information not lawfully collected; assets built on data obtained in violation of Meta policy; assets that breach GDPR, CCPA, or other privacy law.</li>
        <li>You retain ownership of your assets until a buyer's payment clears and the transfer is confirmed.</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Transactions</h2>
      <p>When a buyer pays for a listing:</p>
      <ol className="list-decimal pl-6 my-3 space-y-1">
        <li>Funds are held in escrow (Stripe or crypto wallet) by PixelMarket.</li>
        <li>The Service triggers an asset share via the Meta Graph API.</li>
        <li>The buyer must accept the share in Meta Business Manager and confirm receipt in PixelMarket.</li>
        <li>Upon confirmation (or after 7 days if no dispute), escrow is released to the seller minus the platform fee.</li>
      </ol>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Fees</h2>
      <p>PixelMarket charges a flat <strong>10% platform fee</strong> on the gross transaction value of every sale and trade. For trades, the fee is calculated on the lower-valued asset's listed price (or estimated value if no price is set). Payment processor fees (Stripe, Coinbase) are deducted from the seller's payout.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Disputes</h2>
      <p>If a buyer claims the transferred asset does not match the listing, they may open a dispute within 7 days of transfer. PixelMarket will review evidence from both parties and, at its discretion, refund the buyer, release funds to the seller, or split the funds. Decisions are final for non-fraud disputes; fraud disputes may be escalated to law enforcement.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Refunds</h2>
      <p>Once an asset has been successfully transferred and accepted by the buyer in their Meta Business Manager, the transaction is final unless fraud, misrepresentation, or technical failure is proven. Crypto payments are non-reversible by nature; refunds are issued in the original currency or stablecoin equivalent at PixelMarket's discretion.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Prohibited Conduct</h2>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>Circumventing the platform (offering off-platform transactions for listings discovered on PixelMarket)</li>
        <li>Listing assets you do not own</li>
        <li>Using the Service for money laundering, sanctions evasion, or other unlawful purposes</li>
        <li>Scraping, bulk-extracting, or reverse-engineering the Service</li>
        <li>Submitting false dispute claims</li>
        <li>Creating multiple accounts to manipulate ratings or evade enforcement</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">11. Meta Platform Compliance</h2>
      <p>You acknowledge that all transferred assets remain subject to Meta's Platform Terms and Advertising Policies. PixelMarket is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. We comply with the Meta Developer Platform Terms; violations may result in your account being banned from PixelMarket independently of any action taken by Meta.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">12. Intellectual Property</h2>
      <p>You retain all rights to your data. By using the Service, you grant PixelMarket a limited license to display your listings and transfer your assets as instructed. The PixelMarket brand, software, and design are our property.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">13. Disclaimers</h2>
      <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THE QUALITY, ACCURACY, LEGAL STATUS, OR PERFORMANCE OF ANY LISTED ASSET. TRANSACTIONS ARE BETWEEN USERS AT THEIR OWN RISK.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">14. Limitation of Liability</h2>
      <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, PIXELMARKET'S TOTAL LIABILITY TO YOU FOR ANY CLAIM IS LIMITED TO THE GREATER OF (A) THE PLATFORM FEES YOU PAID IN THE PRIOR 12 MONTHS, OR (B) $100. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">15. Indemnification</h2>
      <p>You agree to indemnify PixelMarket against any claim arising from your breach of these Terms, your listings, your use of the Service, or your violation of Meta's policies.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">16. Termination</h2>
      <p>You may close your account at any time. We may suspend or terminate accounts for any breach of these Terms with or without notice. Pending transactions at termination will be honored or refunded at our discretion.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">17. Changes</h2>
      <p>We may update these Terms. Material changes will be announced via email and on the Service. Continued use after the effective date constitutes acceptance.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">18. Governing Law</h2>
      <p>These Terms are governed by the laws of the jurisdiction in which PixelMarket is incorporated. Disputes shall be resolved in that jurisdiction's courts.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">19. Contact</h2>
      <p>Questions about these Terms: <a href="mailto:legal@pixel-market-sable.vercel.app" className="text-blue-600 hover:underline">legal@pixel-market-sable.vercel.app</a></p>
    </>
  )
}
