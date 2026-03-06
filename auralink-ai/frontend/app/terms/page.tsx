import Link from "next/link";

export const metadata = {
  title: "Terms of Service – AuraLink AI",
  description: "Terms of Service for AuraLink AI. Rules and conditions for using our product-photo-to-listing service.",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: February 25, 2025</p>

        <div className="space-y-8 text-zinc-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">1. Acceptance of Terms</h2>
            <p className="mb-3">
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;you,&quot; &quot;your,&quot; or &quot;User&quot;) and AuraLink AI (&quot;we,&quot; &quot;our,&quot; or &quot;AuraLink AI&quot;) governing your access to and use of the AuraLink AI website, applications, APIs, and all related services, features, and content (collectively, the &quot;Service&quot;).
            </p>
            <p className="mb-3">
              By creating an account, accessing, or using the Service, you agree to be bound by these Terms and by our Privacy Policy, which is incorporated by reference. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms. If you do not agree to these Terms or the Privacy Policy, you must not access or use the Service.
            </p>
            <p>
              We may modify these Terms from time to time. We will post the updated Terms on this page and update the &quot;Last updated&quot; date. Material changes may be communicated via email or a prominent notice in the Service. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised Terms. If you do not agree to the modified Terms, you must stop using the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">2. Description of the Service</h2>
            <p className="mb-3">
              AuraLink AI provides a product-photo-to-listing platform that uses artificial intelligence to extract product attributes from images (including titles, descriptions, bullets, materials, brands, categories, and tags) and to generate, manage, and synchronize listing content across e-commerce and marketplace platforms.
            </p>
            <p className="mb-3">The Service may include, without limitation:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li>Web-based and mobile-accessible product scanning and extraction</li>
              <li>Draft creation, editing, and storage of listing content</li>
              <li>Integration with marketplaces and storefronts (e.g., Shopify, and other supported connectors) for listing sync and inventory management</li>
              <li>Audit and bulk-processing features (e.g., multi-item detection and count estimation)</li>
              <li>APIs and tools for developers and power users</li>
            </ul>
            <p>
              We reserve the right to change, suspend, or discontinue any part of the Service at any time, with or without notice. We do not guarantee that any particular marketplace or integration will remain available.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">3. Eligibility and Account Registration</h2>
            <p className="mb-3">
              You must be at least 18 years of age (or the age of majority in your jurisdiction) and have the legal capacity to enter into these Terms to use the Service. By using the Service, you represent and warrant that you meet these requirements.
            </p>
            <p className="mb-3">
              To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information as needed. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">4. Your Responsibilities and Acceptable Use</h2>
            <p className="mb-3">You agree to use the Service only for lawful purposes and in accordance with these Terms and all applicable laws, regulations, and marketplace policies (including but not limited to Shopify, Amazon, eBay, Etsy, and other platforms you connect). You agree that you will not:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li>Upload content (including images and product data) that you do not have the right to use, or that infringes any third party&apos;s intellectual property, privacy, or other rights</li>
              <li>Upload content that is defamatory, obscene, harassing, or otherwise illegal or harmful</li>
              <li>Use the Service to distribute malware, spam, or to attempt to gain unauthorized access to any system, network, or data</li>
              <li>Reverse-engineer, decompile, disassemble, or attempt to derive source code from the Service (except to the extent permitted by applicable law)</li>
              <li>Overload, disrupt, or interfere with the integrity or performance of the Service or any third-party systems</li>
              <li>Use automated means (e.g., bots, scrapers) to access the Service in a manner that violates our policies or places undue load on our systems</li>
              <li>Resell or sublicense the Service, or use it to build a competing product, without our prior written consent</li>
            </ul>
            <p className="mb-3">
              You are solely responsible for the accuracy, completeness, and legality of the listing content you create, edit, or publish using the Service. AI-generated content may contain errors; you must review and approve all content before publishing to any marketplace. We do not guarantee that generated content will comply with every platform&apos;s policies or requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">5. Subscription, Fees, and Payment</h2>
            <p className="mb-3">
              Certain parts of the Service may be offered free of charge; others may require a paid subscription. We may offer free trials, and we reserve the right to modify subscription tiers, features, and pricing at any time. We will provide notice of material price increases as required by law or as stated in your plan.
            </p>
            <p className="mb-3">
              If you subscribe to a paid plan, you agree to pay all applicable fees in accordance with the billing terms presented at the time of sign-up or renewal. Fees are generally billed in advance (e.g., monthly or annually) and are non-refundable except as required by law or as explicitly stated in our refund policy. You must provide valid payment information and keep it updated. Failure to pay may result in suspension or termination of your access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">6. Intellectual Property</h2>
            <p className="mb-3">
              The Service, including its software, design, text, graphics, logos, and other materials (excluding User Content), is owned by AuraLink AI or its licensors and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works of the Service or any part thereof without our prior written consent.
            </p>
            <p className="mb-3">
              You retain ownership of the content you upload or create (&quot;User Content&quot;), including product images and listing text. By using the Service, you grant AuraLink AI a worldwide, non-exclusive, royalty-free license to use, store, process, reproduce, and display your User Content solely as necessary to provide, operate, and improve the Service (including AI processing, storage, and sync to connected marketplaces). This license survives until you delete the content or close your account, except where we need to retain copies for legal or operational purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">7. Third-Party Services and Integrations</h2>
            <p className="mb-3">
              The Service may integrate with or link to third-party services (e.g., Shopify, payment processors, authentication providers). Your use of those services is subject to their respective terms and privacy policies. We are not responsible for the availability, accuracy, or conduct of third-party services. Connecting a marketplace or store constitutes your authorization for us to access and transmit data as required to perform the integration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">8. Disclaimer of Warranties</h2>
            <p className="mb-3">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>
            <p>
              AI-generated content may be inaccurate or incomplete. We do not guarantee that extraction results or listing content will meet your expectations or comply with any particular marketplace&apos;s policies. You are responsible for reviewing and approving all content before publication. We are not liable for any losses or disputes arising from your reliance on AI-generated or synced content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">9. Limitation of Liability</h2>
            <p className="mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, AURALINK AI AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mb-3">
              IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100). SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES; IN SUCH CASES, THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless AuraLink AI and its affiliates, officers, directors, employees, agents, and licensors from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to (a) your use of the Service, (b) your User Content, (c) your violation of these Terms or any applicable law, or (d) your violation of any third party&apos;s rights. We reserve the right to assume the exclusive defense and control of any matter subject to indemnification by you, at your expense.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">11. Termination and Suspension</h2>
            <p className="mb-3">
              We may suspend or terminate your access to the Service at any time, with or without cause or notice, including for breach of these Terms, non-payment, or for any conduct we deem harmful to the Service or other users. Upon termination, your right to use the Service ceases immediately.
            </p>
            <p className="mb-3">
              You may close your account at any time through the account settings or by contacting us. Upon account closure, we will delete or anonymize your personal data and User Content within a reasonable period, except where we are required to retain data for legal, regulatory, or legitimate operational purposes (e.g., dispute resolution, backups). Provisions of these Terms that by their nature should survive termination (including Sections 6, 8, 9, 10, and 12) will survive.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">12. General Provisions</h2>
            <p className="mb-3">
              <strong className="text-zinc-900">Governing law:</strong> These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any dispute arising out of or related to these Terms or the Service shall be resolved exclusively in the state or federal courts located in Delaware, and you consent to personal jurisdiction therein.
            </p>
            <p className="mb-3">
              <strong className="text-zinc-900">Entire agreement:</strong> These Terms, together with the Privacy Policy and any order forms or plan-specific terms, constitute the entire agreement between you and AuraLink AI regarding the Service and supersede any prior agreements.
            </p>
            <p className="mb-3">
              <strong className="text-zinc-900">Severability:</strong> If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
            </p>
            <p className="mb-3">
              <strong className="text-zinc-900">Waiver:</strong> Our failure to enforce any right or provision of these Terms will not constitute a waiver of such right or provision.
            </p>
            <p>
              <strong className="text-zinc-900">Assignment:</strong> You may not assign or transfer these Terms or your account without our prior written consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">13. Contact Us</h2>
            <p>
              For questions about these Terms of Service, please contact us at <a href="mailto:hello@auralink.ai" className="text-zinc-900 font-medium underline hover:text-zinc-600">hello@auralink.ai</a>. You may also use the contact information provided on our website or in the Service. We will respond to legitimate inquiries as promptly as practicable.
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
