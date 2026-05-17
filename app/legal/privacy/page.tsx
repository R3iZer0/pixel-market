export const metadata = { title: 'Privacy Policy — PixelMarket' }

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 17, 2026</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Introduction</h2>
      <p>PixelMarket ("we", "us", "our") operates the platform at pixel-market-sable.vercel.app (the "Service"), a peer-to-peer marketplace for transferring Meta advertising assets (pixels, custom audiences, lookalike audiences, engagement audiences) between users. This Privacy Policy explains what information we collect, how we use it, and the choices you have.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Information We Collect</h2>

      <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2.1 Account Information</h3>
      <p>When you sign up, we collect:</p>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>Email address</li>
        <li>Encrypted password (we never store plaintext passwords)</li>
        <li>Optional display name, username, avatar URL</li>
      </ul>

      <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2.2 Meta Platform Data</h3>
      <p>When you connect your Meta (Facebook) account via OAuth, we receive and store:</p>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>A long-lived OAuth access token (encrypted at rest, expires after 60 days)</li>
        <li>Your Meta user ID</li>
        <li>List of ad accounts you grant access to</li>
        <li>Metadata about pixels and audiences you choose to list (name, size, retention window, source type) — only after you explicitly publish them as marketplace listings</li>
      </ul>
      <p>We use this data exclusively to: (a) display your assets in your dashboard, (b) verify ownership when you create a listing, and (c) execute asset transfers to buyer accounts via the Meta Graph API when a transaction completes.</p>
      <p><strong>We do not access:</strong> your personal Facebook profile data beyond your user ID and name, your friends list, your messages, your photos, or any data unrelated to ad assets.</p>

      <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2.3 Transaction Data</h3>
      <p>For each purchase, sale, or trade we collect: amount, payment method, parties involved, listing referenced, and transfer status. Payment processing is handled by Stripe and Coinbase Commerce — we do not store card numbers, bank details, or crypto private keys.</p>

      <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2.4 Usage & Technical Data</h3>
      <p>We collect minimal logs necessary to operate the Service: IP address, browser type, pages visited, and timestamps. We use this only for security, debugging, and abuse prevention.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. How We Use Your Data</h2>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>Provide and operate the marketplace</li>
        <li>Authenticate you and protect your account</li>
        <li>Execute asset transfers via the Meta Graph API</li>
        <li>Process payments and payouts</li>
        <li>Communicate transaction status and platform updates</li>
        <li>Detect and prevent fraud or abuse</li>
        <li>Comply with legal obligations</li>
      </ul>
      <p>We do not sell your personal data. We do not use your data for advertising on third-party platforms.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Data Sharing</h2>
      <p>We share data only with:</p>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li><strong>Counterparties:</strong> The other party in a transaction sees your username, rating, and listing data. They do not see your email, payment details, or Meta token.</li>
        <li><strong>Service providers:</strong> Supabase (database/auth), Vercel (hosting), Stripe (fiat payments), Coinbase Commerce (crypto payments), Meta (asset transfers). Each is bound by their own privacy obligations.</li>
        <li><strong>Legal authorities:</strong> when required by valid legal process.</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Data Retention</h2>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>Account data: retained while your account is active</li>
        <li>Transaction records: retained for 7 years for tax and dispute resolution</li>
        <li>Meta access tokens: revoked and deleted when you disconnect or delete your account</li>
        <li>Logs: rotated after 90 days</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Your Rights</h2>
      <p>Subject to applicable law (GDPR, CCPA, others), you may:</p>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>Access the data we hold about you</li>
        <li>Correct inaccurate data</li>
        <li>Delete your account and data (see <a href="/legal/data-deletion" className="text-blue-600 hover:underline">Data Deletion</a>)</li>
        <li>Export your data in a portable format</li>
        <li>Withdraw consent for Meta integration at any time</li>
        <li>Object to certain processing or restrict it</li>
        <li>Lodge a complaint with your data protection authority</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Meta-Specific Disclosures</h2>
      <p>When you authorize PixelMarket via Facebook Login, we request only the permissions necessary for the marketplace to function: <code>ads_read</code>, <code>ads_management</code>, and <code>business_management</code>. You can revoke this access at any time via your Facebook account settings under <strong>Settings & Privacy → Settings → Apps and Websites</strong>. Revoking access via Facebook will disconnect PixelMarket from your Meta account; existing listings will be paused until you reconnect.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Security</h2>
      <p>We use industry-standard practices: TLS in transit, encryption at rest, hashed credentials, scoped access tokens, and row-level security on all user data. No system is perfectly secure — if we detect a breach affecting your data, we will notify you within 72 hours.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. International Transfers</h2>
      <p>Your data may be processed in the United States and other jurisdictions where our service providers operate. We rely on Standard Contractual Clauses and provider certifications where applicable.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Children</h2>
      <p>PixelMarket is not intended for users under 18. We do not knowingly collect data from minors. If you believe a minor has provided us data, contact us and we will delete it.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">11. Changes</h2>
      <p>We may update this policy. Material changes will be announced via email and on the Service. Continued use after the effective date constitutes acceptance.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">12. Contact</h2>
      <p>For privacy questions, data requests, or complaints, contact: <a href="mailto:privacy@pixel-market-sable.vercel.app" className="text-blue-600 hover:underline">privacy@pixel-market-sable.vercel.app</a></p>
    </>
  )
}
