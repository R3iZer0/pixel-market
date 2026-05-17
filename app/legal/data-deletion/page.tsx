export const metadata = { title: 'Data Deletion — PixelMarket' }

export default function DataDeletionPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Deletion Instructions</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 17, 2026</p>

      <p>PixelMarket respects your right to remove your data from our platform. This page describes how to delete your account, all associated personal data, and revoke Meta (Facebook) access granted to PixelMarket.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Option 1 — Delete From the App (Recommended)</h2>
      <ol className="list-decimal pl-6 my-3 space-y-2">
        <li>Log in to PixelMarket at <a href="https://pixel-market-sable.vercel.app" className="text-blue-600 hover:underline">pixel-market-sable.vercel.app</a></li>
        <li>Go to <strong>Settings → Account → Delete Account</strong></li>
        <li>Confirm deletion. Your account, profile, listings, messages, and Meta access token will be permanently removed within 30 days.</li>
        <li>Active orders will be cancelled and any escrowed funds refunded.</li>
      </ol>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Option 2 — Email Request</h2>
      <p>If you cannot access your account, email <a href="mailto:privacy@pixel-market-sable.vercel.app" className="text-blue-600 hover:underline">privacy@pixel-market-sable.vercel.app</a> from the address registered on your account with the subject line "Data Deletion Request". Include:</p>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>Your registered email address</li>
        <li>Your Meta (Facebook) user ID, if known</li>
        <li>Your PixelMarket username, if known</li>
      </ul>
      <p>We will confirm deletion within 7 business days.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Option 3 — Revoke Meta Access Only</h2>
      <p>To disconnect PixelMarket from your Facebook account without deleting your PixelMarket account:</p>
      <ol className="list-decimal pl-6 my-3 space-y-2">
        <li>Open Facebook and go to <strong>Settings & Privacy → Settings → Apps and Websites</strong>.</li>
        <li>Find <strong>PixelMarket</strong> in the list of active apps.</li>
        <li>Click <strong>Remove</strong>.</li>
      </ol>
      <p>This revokes our Meta access token immediately. Any active listings will be paused until you reconnect.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">What Gets Deleted</h2>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>Your profile (email, username, display name, avatar, bio)</li>
        <li>Your Meta access token and connected ad account references</li>
        <li>Your listings, messages, trade offers, and reviews you authored</li>
        <li>Payment processor account references (Stripe Connect ID, crypto wallet address)</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">What We Retain (and Why)</h2>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li><strong>Completed transaction records</strong> — retained for 7 years to comply with tax and anti-money-laundering law. These are anonymized to remove direct identifiers where possible.</li>
        <li><strong>Reviews you received</strong> — anonymized to "Deleted User" but kept to preserve the rating history of counterparties.</li>
        <li><strong>Backup snapshots</strong> — purged within 30 days of deletion request.</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Automated Callback (Meta Platform)</h2>
      <p>Meta-initiated data deletion requests submitted through the Facebook platform are received at our automated endpoint and processed within 30 days. You will receive a confirmation code that can be used to track the deletion status. Endpoint: <code>POST https://pixel-market-sable.vercel.app/api/data-deletion</code></p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Questions</h2>
      <p>Contact <a href="mailto:privacy@pixel-market-sable.vercel.app" className="text-blue-600 hover:underline">privacy@pixel-market-sable.vercel.app</a>.</p>
    </>
  )
}
