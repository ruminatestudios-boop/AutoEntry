import Link from "next/link";

export const metadata = {
  title: "Privacy Policy – AuraLink AI",
  description: "Privacy Policy for AuraLink AI. How we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/landing.html" className="font-bold text-zinc-900 hover:text-zinc-600">
            AuraLink AI
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: February 25, 2025</p>

        <div className="space-y-8 text-zinc-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">1. Introduction</h2>
            <p className="mb-3">
              AuraLink AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the AuraLink AI service and related websites and applications. Our service provides a product-photo-to-listing tool that uses artificial intelligence to extract product data from images and to generate and synchronize listings across e-commerce and marketplace platforms (including but not limited to Shopify, Amazon, eBay, Etsy, and other supported connectors).
            </p>
            <p>
              This Privacy Policy describes how we collect, use, disclose, and protect your information when you access or use our website, applications, application programming interfaces (APIs), and any related services (collectively, the &quot;Service&quot;). It also describes your choices and rights regarding your personal data. Please read this policy carefully. By using the Service, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with this policy, you must not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect information that you provide directly to us, that we obtain automatically when you use the Service, and that we receive from third parties. Categories include:</p>

            <h3 className="text-base font-semibold text-zinc-900 mt-4 mb-2">2.1 Account and Registration Information</h3>
            <p className="mb-2">When you create an account or sign in, we collect:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li>Email address and, where provided, name and profile information</li>
              <li>Authentication credentials and account preferences (managed through our identity provider, Clerk)</li>
              <li>Billing and payment information if you subscribe to a paid plan (processed by our payment provider; we do not store full card numbers)</li>
            </ul>

            <h3 className="text-base font-semibold text-zinc-900 mt-4 mb-2">2.2 Product and Listing Data</h3>
            <p className="mb-2">When you use the Service to create or manage listings, we collect and process:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li>Product images and other media you upload</li>
              <li>AI-generated or user-edited attributes such as titles, descriptions, bullets, materials, brands, categories, tags, and other structured data</li>
              <li>Draft and published listing content, including marketplace-specific variants</li>
              <li>Audit-mode data (e.g., counts, bounding boxes) when you use bulk or audit features</li>
            </ul>

            <h3 className="text-base font-semibold text-zinc-900 mt-4 mb-2">2.3 Integration and Marketplace Data</h3>
            <p className="mb-2">When you connect external platforms (e.g., Shopify, other marketplaces), we receive and store:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li>OAuth tokens and related credentials necessary to sync listings and inventory</li>
              <li>Store or shop identifiers, and, where applicable, product and order data provided by those platforms via their APIs</li>
            </ul>

            <h3 className="text-base font-semibold text-zinc-900 mt-4 mb-2">2.4 Usage and Technical Data</h3>
            <p className="mb-2">We automatically collect:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li>Log data (IP address, browser type, device information, pages visited, timestamps)</li>
              <li>Usage patterns (features used, API calls, extraction requests, sync events)</li>
              <li>Cookies and similar technologies in accordance with our Cookie policy (see Section 9)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li>Provide, operate, maintain, and improve the Service, including AI extraction, draft creation, and marketplace synchronization</li>
              <li>Authenticate users and manage accounts, and to communicate with you about your account, security, and product updates</li>
              <li>Process payments and enforce our terms and subscription plans</li>
              <li>Detect, prevent, and address fraud, abuse, security incidents, and technical issues</li>
              <li>Comply with applicable laws, regulations, legal process, or enforceable governmental requests</li>
              <li>Analyze usage and trends to improve user experience and develop new features (including in aggregated or de-identified form)</li>
            </ul>
            <p className="mb-2">
              <strong className="text-zinc-900">We do not sell your personal information.</strong> We do not use your product images or listing content to train third-party AI models for purposes unrelated to providing and improving the Service for you. Any use of data for model improvement will be in accordance with our terms and applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">4. Data Sharing and Disclosure</h2>
            <p className="mb-3">We may share your information in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li><strong className="text-zinc-900">Service providers:</strong> With vendors who assist us in hosting, analytics, authentication, AI processing, payment processing, and customer support. We require these parties to use the data only for the purposes we specify and to protect it in line with this policy.</li>
              <li><strong className="text-zinc-900">Connected marketplaces:</strong> When you connect a store (e.g., Shopify), we transmit listing and sync data as necessary to perform the integration you have authorized.</li>
              <li><strong className="text-zinc-900">Legal and safety:</strong> When required by law, or when we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others, or to investigate fraud or violations of our terms.</li>
              <li><strong className="text-zinc-900">Business transfers:</strong> In connection with a merger, acquisition, sale of assets, or bankruptcy, your information may be transferred as part of that transaction, subject to the same privacy commitments.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">5. Data Storage, Retention, and Security</h2>
            <p className="mb-3">
              Your data is stored on secure infrastructure (including cloud databases such as Supabase/PostgreSQL and related storage). We retain your information for as long as your account is active or as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
            <p className="mb-3">
              We implement industry-standard technical and organizational measures to protect your data, including encryption in transit (TLS) and at rest where applicable, access controls, and regular security assessments. Access to personal data is restricted to authorized personnel and systems that require it to operate and support the Service. Despite our efforts, no method of transmission or storage is 100% secure; we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">6. International Data Transfers</h2>
            <p>
              We may store and process data in the United States and other countries where our service providers operate. If you are located outside these jurisdictions, your information may be transferred to and processed in those countries. We take steps to ensure that such transfers are subject to appropriate safeguards (e.g., standard contractual clauses or adequacy decisions) as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">7. Your Rights and Choices</h2>
            <p className="mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li><strong className="text-zinc-900">Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-zinc-900">Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong className="text-zinc-900">Deletion:</strong> Request deletion of your personal data, subject to legal and contractual retention requirements</li>
              <li><strong className="text-zinc-900">Portability:</strong> Request a portable copy of your data in a structured, machine-readable format</li>
              <li><strong className="text-zinc-900">Restriction and objection:</strong> Request restriction of processing or object to certain processing where permitted by law</li>
              <li><strong className="text-zinc-900">Withdraw consent:</strong> Where processing is based on consent, withdraw consent at any time</li>
              <li><strong className="text-zinc-900">Opt-out of marketing:</strong> Unsubscribe from marketing emails via the link in any such email</li>
            </ul>
            <p className="mb-3">
              To exercise these rights, contact us at <a href="mailto:hello@auralink.ai" className="text-zinc-900 font-medium underline hover:text-zinc-600">hello@auralink.ai</a>. We will respond within the timeframes required by applicable law. You may also have the right to lodge a complaint with a supervisory authority in your jurisdiction. For residents of the European Economic Area (EEA), United Kingdom, or Switzerland, our processing may be subject to the GDPR or equivalent laws. For California residents, we comply with the CCPA/CPRA as applicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">8. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed to individuals under the age of 16 (or higher where required by local law). We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us at <a href="mailto:hello@auralink.ai" className="text-zinc-900 font-medium underline hover:text-zinc-600">hello@auralink.ai</a>, and we will take steps to delete it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">9. Cookies and Similar Technologies</h2>
            <p className="mb-3">
              We use cookies and similar technologies (e.g., local storage, session storage) to maintain your session, remember preferences, analyze usage, and improve the Service. You can control cookies through your browser settings. Disabling certain cookies may affect the functionality of the Service. For more detail, see our cookie banner or contact us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the &quot;Last updated&quot; date. For material changes, we may provide additional notice (e.g., by email or a prominent notice in the Service). Your continued use of the Service after the effective date of changes constitutes your acceptance of the updated policy. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">11. Contact Us</h2>
            <p>
              For privacy-related questions, requests, or complaints, contact us at <a href="mailto:hello@auralink.ai" className="text-zinc-900 font-medium underline hover:text-zinc-600">hello@auralink.ai</a>. You may also write to us at the address provided on our website or in the Service. We will work with you to resolve any concerns.
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
