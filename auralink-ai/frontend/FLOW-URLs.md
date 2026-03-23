# Flow URLs (localhost) and file paths

Base: **http://localhost:3000** with `npm run dev` in `auralink-ai/frontend` (Next serves `public/` and applies rewrites).

---

## User order: scan → process → review → published

| Step | User-facing slug (Next) | Direct file URL | Repo file |
|------|-------------------------|-----------------|-----------|
| 1. Landing | `/landing.html` | same | `public/landing.html` |
| 2. Scan | **`/scan`** | `/home.html` (rewrite) | `public/home.html` |
| 3. Reading product | **`/reading-product`** | `/flow-2.html` (rewrite) | `public/flow-2.html` |
| 4. Review (Shopify) | **`/listing/review`** or **`/review`** | `/flow-3.html` | `public/flow-3.html` |
| 5. **Final — success** | **`/listing/published`** (canonical) | `/flow-success.html` | `public/flow-success.html` |

**Other slugs for step 5:** `/flow/success` → same as above.

---

## Choose marketplace

| Page | Slug | File |
|------|------|------|
| Pick Etsy / eBay / TikTok / Shopify | **`/flow/choose-platform`** | `flow-choose-platform.html` |

If the user already has scan data, choosing a platform sends them to **`/reading-product`** first; otherwise to the matching `flow-3-*.html`.

---

## Related

| Purpose | URL |
|---------|-----|
| Standalone publish UI | **`/flow/publish`** → `flow-publishing.html` |
| Connect Shopify (static) | `/connect-store` |
| Dashboard / listings (static hub) | `/dashboard/home` (redirects from `/dashboard-home.html`) |

---

## OAuth note (Shopify / Etsy)

The publishing service redirects the browser to **`/listing/published?...`** after connect. In the Shopify Partners app settings, allowlisted **app URLs** point at the publishing API callback; the **user** is then redirected to this frontend path. If you whitelist exact success URLs, add `https://<your-domain>/listing/published` (and keep `/flow-success.html` if older clients use it).
