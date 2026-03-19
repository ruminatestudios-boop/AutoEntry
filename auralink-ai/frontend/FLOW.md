# SyncLyst canonical flow (landing → Shopify)

This is the **single end-to-end flow** from landing page to posting a draft on Shopify. All entry points should lead into this path.

## Flow steps

| Step | URL | Description |
|------|-----|-------------|
| 1. Landing | `/landing.html` | Marketing page; primary CTA: "Scan Your First Item" |
| 2. Scan | `/landing.html?mode=scan` | Camera or upload photo → AI extraction on same page → "Continue" |
| 3. Choose platform | `/flow-choose-platform.html` | User picks Shopify (or Etsy, eBay, TikTok). Draft in `sessionStorage`. |
| 4. Processing | `/flow-2.html` | Progress bar. If draft already from scan → quick redirect to review. Else runs extraction API. |
| 5. Review | `/flow-3.html` | Edit title, description, price, photos → "Publish to Shopify" |
| 6. Success | `/flow-success.html` | "You're live!" → "View listings" or "List another" |

## Entry points

- **Main landing:** `/landing.html` or Next.js `/` (with CTA to `/landing.html?mode=scan`).
- **Direct scan:** `/landing.html?mode=scan` or `/flow.html` (redirects to `landing.html?mode=scan`).
- **Home (alias):** `/home.html` redirects to `/landing.html` (same query preserved) so there is one landing URL.

## Back / exit links (consistent)

- Flow-2, flow-3 header logo → `/landing.html`
- Flow-2 error "Back to scan" → `/landing.html?mode=scan`
- Flow-success "List another" → `/landing.html?mode=scan`
- Flow-success "View listings" → `/dashboard-home.html`

## Out of scope (old flows)

These are not part of the canonical path; do not link here from the flow above:

- `flow-1.html`, `flow-4.html`, `flow-verifying.html`, `flow-connect.html`, `flow-preview.html`, `flow-publishing.html`, `plans.html`
- `flow-connecting.html`, `flow-connect-done.html`

Platform-specific review pages (`flow-3-etsy.html`, `flow-3-ebay.html`, `flow-3-tiktok.html`) are used when the user selects that platform on flow-choose-platform.
