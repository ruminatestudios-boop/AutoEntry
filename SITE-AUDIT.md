# Auto Entry – Full Site Audit & Checklist

Deep audit of the codebase after push to Shopify. Use this to confirm everything is listed and production-ready.

---

## 1. App config (Shopify)

| Item | Status | Notes |
|------|--------|--------|
| **shopify.app.toml** | ✅ | `application_url` = `https://auto-entry-app-production-4dda.up.railway.app` |
| **Auth redirect** | ✅ | `redirect_urls` = same Railway URL + `/api/auth` |
| **Client ID** | ✅ | Set in toml |
| **Scopes** | ✅ | `write_inventory, write_products` |
| **Webhooks API version** | ✅ | 2025-01 (matches shopify.server.ts) |
| **Embedded** | ✅ | `embedded = true` |

---

## 2. Routes & pages

### Authenticated (Shopify admin)

| Route | Purpose | Auth |
|-------|---------|------|
| **app._index** | Dashboard: scans, QR, To Review / Drafts, list product, variants modal | `authenticate.admin` |
| **app.pricing** | Plans & billing (Starter, Growth, Power, Top-Ups) | `authenticate.admin` |
| **app.settings** | Shop settings | `authenticate.admin` |
| **app.docs** | Documentation | `authenticate.admin` |
| **app.support** | Support | `authenticate.admin` |
| **app.privacy** | Privacy policy | `authenticate.admin` |
| **app.terms** | Terms of service | `authenticate.admin` |
| **app.topup-success** | Post top-up success | `authenticate.admin` |
| **app.tsx** | App shell, billing/session | `authenticate.admin` |
| **app.session** | Session (GET) | `authenticate.admin` |
| **auth.login** | Login | login flow |
| **auth.$** | Auth catch-all | `authenticate.admin` |

### API (authenticated)

| Route | Purpose | Auth |
|-------|---------|------|
| **api.session** | Session API | `authenticate.admin` |
| **api.recent-scans** | List scans (DRAFT/PUBLISHED), ordered by `createdAt` desc | `authenticate.admin` |
| **api.list-product** | Create product on Shopify (draft), mark PUBLISHED | `authenticate.admin` |
| **api.update-product** | Update draft product (title, images, etc.) | `authenticate.admin` |
| **api.delete-product** | Delete draft product | `authenticate.admin` |
| **api.search-images** | SerpAPI image search for product images | `authenticate.admin` |

### API (no Shopify session – scoped by id/session)

| Route | Purpose | Scope |
|-------|---------|--------|
| **api.parse-variants** | Parse variant text (e.g. "small 4, medium 3, large 5"), update product by `productId` or `sessionId` | productId from dashboard or sessionId from mobile; no auth (sessionId is UUID) |

### Mobile (unauthenticated)

| Route | Purpose | Scope |
|-------|---------|--------|
| **mobile.$sessionId** | Mobile scanner: capture → analyze → voice/confirm. Loader checks session exists & not expired. Action: scan (Gemini), new_session, batch_add | Session ID in URL; session validated in loader |

### Webhooks

| Route | Purpose |
|-------|---------|
| **webhooks.app.uninstalled** | App uninstalled |
| **webhooks.customers.data_request** | GDPR data request |
| **webhooks.customers.redact** | Customer redact |
| **webhooks.shop.redact** | Shop redact |
| **webhooks.app.scopes_update** | Scopes updated |

### Other

| Route | Purpose |
|-------|---------|
| **_index/route** | Landing (non-embedded) |
| **health** | Health check |
| **privacy** / **terms** | Standalone privacy/terms (apiKey for App Bridge) |

---

## 3. Database (Prisma)

| Model | Purpose |
|-------|---------|
| **Session** | Shopify session storage (shopify-app-session-storage-prisma) |
| **ScanSession** | Scan session (shop, status, expiresAt); has many ScannedProduct |
| **ScannedProduct** | One per scan: title, descriptionHtml, productType, tags, estimatedWeight, price, imageUrls, status, variants (JSON), sku, inventoryQuantity, trackInventory, **createdAt** |
| **ShopSettings** | Per-shop: plan, scanCount, bonusScans, notificationEmail, currencyCode, countryCode, billingCycleStart |

Migrations: `createdAt` on ScannedProduct is in migration `20260213171652_add_scanned_product_created_at`. Production startup runs `prisma migrate deploy`.

---

## 4. Environment variables

### Required in production (Railway)

| Variable | Required | Used for |
|----------|----------|----------|
| **SHOPIFY_API_KEY** | ✅ | Shopify auth |
| **SHOPIFY_API_SECRET** | ✅ | Shopify auth |
| **SHOPIFY_APP_URL** | ✅ | OAuth & redirects (must be full Railway URL with https) |
| **SCOPES** | ✅ | e.g. `write_inventory,write_products` |
| **DATABASE_URL** | ✅ (or volume) | SQLite path; or set via RAILWAY_VOLUME_MOUNT_PATH |
| **GOOGLE_GENERATIVE_AI_API_KEY** | ✅ | Gemini (scan + variant parse) |
| **NODE_ENV** | ✅ | `production` |

### Optional

| Variable | Purpose |
|----------|---------|
| **SERPAPI_API_KEY** | Image search (dashboard “find images”) |
| **GOOGLE_APPLICATION_CREDENTIALS** / **GOOGLE_APPLICATION_CREDENTIALS_JSON** | Vision OCR (optional; Gemini works without it) |
| **SHOP_CUSTOM_DOMAIN** | Custom shop domain |
| **PORT** | Do not set on Railway; Railway injects it |
| **RAILWAY_VOLUME_MOUNT_PATH** | Volume for SQLite (e.g. `/data`) |

---

## 5. Billing (shopify.server.ts)

| Plan | Amount | Interval |
|------|--------|----------|
| Starter | $19.99 | Every 30 days |
| Growth | $49.99 | Every 30 days |
| Power | $99.99 | Every 30 days |
| TopUp100 | $9.99 | One-time |
| TopUp500 | $39.99 | One-time |
| TopUp1000 | $69.99 | One-time |

**Plan limits (core/constants.ts):** FREE: 5, Starter: 100, Growth: 500, Power: 1000 scans.

---

## 6. Features implemented

### Dashboard (app._index)

- [x] Hero: “Intelligent Inventory Capturing”, steps, QR code, Copy URL
- [x] Plan display: “Free Plan · X of 5 scans” (or plan limit)
- [x] Tabs: To Review, Drafts, View All
- [x] Grid/List toggle
- [x] Scan cards: image, title, category, time, price, Review / Delete
- [x] Review modal: edit title, product type, price, weight, tags, description, images
- [x] Variants: type “small 4, medium 3, large 5” (or voice on Growth/Power), Add → tags under SIZE (and quantities)
- [x] List to draft: creates Shopify product (draft) with all variants + prices + inventory
- [x] Image search (SerpAPI) for product images
- [x] Recent scans sorted by **createdAt** desc (newest first)
- [x] Session + scan limit: new session only if under free limit

### Mobile (mobile.$sessionId)

- [x] Capture → Analyzing → Success (or Voice → Confirm)
- [x] Single / Batch mode
- [x] AI scan (Gemini); fallback “describe what you see” if AI fails/blocked
- [x] No “Connection or server error” toast; auto-retry once then return to capture
- [x] No “Service busy” message; 429 → fallback product
- [x] Voice variants (Growth/Power); parse variants by sessionId
- [x] Session expiry check; plan/limit in loader
- [x] Pricing modal when at limit

### Shopify adapter (product.adapter)

- [x] Create product (draft) with title, description, type, tags, weight, price, images
- [x] Variants: productOptions + productVariantsBulkCreate (first variant = default; rest bulk-created)
- [x] First variant price & SKU set via productVariantsBulkUpdate
- [x] Per-variant inventory when single option has quantities
- [x] Metafield auto_entry.source = snap_to_stock

### AI (ai.service)

- [x] analyzeImage: Gemini + optional Vision OCR; any product type; exact brand from OCR; fallback product + “describe what you see” on error/block/429
- [x] parseVariants: “small 4, medium 3, large 5” → options with quantities; AI fallback for other phrasing
- [x] generateSearchQuery (for image search)

### Variants (deterministic + API)

- [x] api.parse-variants: deterministic parser for “value qty, value qty”; else AI; writes to product by productId or sessionId
- [x] api.list-product: normalizes variants (full values arrays) before adapter
- [x] All variant values created on Shopify; first variant price/SKU fixed

---

## 7. Production deploy

| Item | Status |
|------|--------|
| **Dockerfile** | ✅ Node 20 bookworm-slim, build + docker-start |
| **Start** | ✅ `scripts/production-start.cjs` → vision creds, `npm run setup` (prisma generate + migrate deploy), remix-serve |
| **Railway** | ✅ App URL in toml points to Railway |
| **Migrations** | ✅ Run on startup via `setup` |
| **No custom PORT** | ✅ Leave unset on Railway |

---

## 8. Security & GDPR

- [x] Admin routes use `authenticate.admin(request)` (or billing/session as needed)
- [x] Mobile uses sessionId (UUID) only; no Shopify session
- [x] api.parse-variants: scoped by productId (dashboard) or sessionId (mobile); no auth (sessionId not guessable)
- [x] Webhooks: app uninstalled, customers data request, customers redact, shop redact, scopes update
- [x] No secrets in client; SHOPIFY_API_KEY in root for App Bridge only (public per Shopify)

---

## 9. What to verify in production

1. **Railway**  
   - Latest deploy from `main` succeeded.  
   - Variables set: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL, SCOPES, DATABASE_URL (or volume), GOOGLE_GENERATIVE_AI_API_KEY, NODE_ENV=production.

2. **Shopify Partners**  
   - App URL = `https://auto-entry-app-production-4dda.up.railway.app`.  
   - Allowed redirection URL(s) include that origin + `/api/auth`.

3. **Store**  
   - Install/reinstall app; open app in admin; scan from mobile (QR); add variants and “List to draft”; confirm draft in Products with correct variants and prices.

4. **Optional**  
   - SERPAPI_API_KEY for image search.  
   - Vision credentials for OCR (optional).

---

## 10. File summary (key only)

- **Config:** shopify.app.toml, shopify.server.ts, app/core/constants.ts  
- **Routes:** app._index (dashboard), mobile.$sessionId (scanner), app.pricing, api.*, webhooks.*  
- **Adapters:** app/adapters/shopify/product.adapter.ts  
- **AI:** app/core/services/ai.service.ts  
- **DB:** prisma/schema.prisma, app/db.server.ts  
- **Start:** scripts/production-start.cjs, Dockerfile  

Everything listed above is implemented in the codebase and reflected in this audit. Use the “What to verify in production” section for a final go-live check.
