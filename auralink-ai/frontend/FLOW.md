# SyncLyst listing flow (order + URL slugs)

Single-item path after the user scans a photo on the landing page.

## Step order (typical)

| Step | What the user does | Preferred URL slug | Static file (source) |
|------|--------------------|--------------------|----------------------|
| 1 | Landing / marketing | `/landing.html` | `public/landing.html` |
| 2 | Camera or upload + AI read | **`/scan`** (legacy: `?mode=scan` on home/landing redirects) | same |
| 3 | “Reading your product” progress | **`/reading-product`** (legacy: `/flow-2.html`, `/flow-2`, `/flow/processing` → redirect) | `public/flow-2.html` |
| 4 | Edit listing, publish | **`/listing/review`** or **`/review`** (aliases) | `public/flow-3.html` |
| 5 | “You’re live” / next steps | **`/listing/published`** (canonical) | `public/flow-success.html` |

**Aliases for step 5:** `/flow/success` and `/flow-success.html` still serve the same page (Next rewrite or direct file).

## Platform variants

- User may open **`/flow/choose-platform`** (`flow-choose-platform.html`) to pick Etsy, eBay, TikTok Shop, or Shopify before or between steps; that choice selects `flow-3-etsy.html`, `flow-3-ebay.html`, `flow-3-tiktok.html`, or `flow-3.html`.
- **Batch:** `flow-batch.html` → `flow-batch-upload.html` → `flow-batch-review.html` → **`/review?batch=1&index=n`** → publish → **`/listing/published`**.

## Entry points

- **Scan:** **`/scan`** or `/flow.html` (redirects to `/scan`).
- **Next.js app:** `/` may link into the same flow.

## After publish

- **`/listing/published`** — final screen: view listings, list another, etc.
- **`/flow/publish`** — alias for `flow-publishing.html` when using the standalone publishing step.

Rewrites are defined in `next.config.ts` (`listingFlowRewrites`). On a plain static host without Next, use the `.html` paths only.
