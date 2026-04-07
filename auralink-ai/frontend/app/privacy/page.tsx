import Link from "next/link";

export const metadata = {
  title: "Privacy Policy – SyncLyst",
  description: "Privacy Policy for SyncLyst. How we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/landing.html" className="font-bold text-zinc-900 hover:text-zinc-600">
            SyncLyst
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: 3 April 2026</p>

        <div className="space-y-8 text-zinc-700 text-sm leading-relaxed">
          <section>
            <p className="mb-4">
              SyncLyst AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates Synclyst.app. This Privacy Policy explains how we collect, use, and protect your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">1. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong className="text-zinc-900">Account Information:</strong> When you sign up, we collect your name and email address.</li>
              <li><strong className="text-zinc-900">Product Photos:</strong> Images you upload to generate listings. These are processed by our AI and not stored permanently after processing.</li>
              <li><strong className="text-zinc-900">Usage Data:</strong> We collect information about how you use the app, including scans performed, listings created, and features accessed.</li>
              <li><strong className="text-zinc-900">Payment Information:</strong> Billing is handled by a third-party payment processor. We do not store your card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>To provide and improve our service, including generating product listings from photos.</li>
              <li>To sync your listings to connected platforms such as Shopify, Etsy, eBay, and TikTok Shop.</li>
              <li>To send you important account updates, billing notices, and product announcements.</li>
              <li>To improve the AI model&apos;s accuracy and performance over time (using anonymised data only).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">3. Third-Party Integrations</h2>
            <p>
              When you connect SyncLyst to a third-party platform (e.g. Shopify), you authorise us to access and write to that platform on your behalf. We only request the permissions necessary to create and manage product listings. You can disconnect any integration at any time from your dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">4. Data Retention</h2>
            <p>
              Product photos uploaded for scanning are deleted from our servers within 24 hours of processing. Listing drafts and account data are retained for as long as your account is active. You may request deletion of your account and all associated data at any time by contacting us at <a href="mailto:privacy@synclyst.app" className="text-zinc-900 font-medium underline hover:text-zinc-600">privacy@synclyst.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">5. Data Security</h2>
            <p>
              We use industry-standard encryption (TLS/HTTPS) to protect data in transit. Access to user data is restricted to authorised personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">6. Your Rights (UK/EEA Users)</h2>
            <p className="mb-2">
              Under GDPR, you have the right to: access the data we hold about you, request correction or deletion, object to processing, and request data portability. To exercise any of these rights, contact us at <a href="mailto:privacy@synclyst.app" className="text-zinc-900 font-medium underline hover:text-zinc-600">privacy@synclyst.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">7. Cookies</h2>
            <p>
              We use essential cookies to keep you logged in and to maintain session state. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">8. Shopify merchants (App Store compliance)</h2>
            <p className="mb-2">
              If you install SyncLyst from the Shopify App Store or connect a Shopify store, we receive OAuth credentials only as needed to create and manage product listings you choose to sync. We subscribe to Shopify&apos;s mandatory privacy webhooks.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong className="text-zinc-900">Uninstall / shop data:</strong> After you remove the app, Shopify notifies us to delete data associated with your shop from our systems (for example, stored connection tokens for that shop). We complete processing within the timeframe Shopify requires.
              </li>
              <li>
                <strong className="text-zinc-900">Customer data:</strong> Our publishing service is built to avoid storing Shopify customer or order personal data. If that changes in a future version, we will update this policy and honour customer data and redaction requests delivered via Shopify&apos;s compliance webhooks.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email or via a notice on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">10. Contact Us</h2>
            <p>
              For any privacy-related questions, contact us at: <a href="mailto:privacy@synclyst.app" className="text-zinc-900 font-medium underline hover:text-zinc-600">privacy@synclyst.app</a>
            </p>
          </section>
        </div>

        <p className="mt-12 pt-6 border-t border-zinc-200">
          <Link href="/landing.html" className="text-zinc-600 hover:text-zinc-900 font-medium">← Back to home</Link>
        </p>
      </main>
    </div>
  );
}
