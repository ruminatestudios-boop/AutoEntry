# Master flow: Landing → Publish to Shopify

**This is the single flow we lock to for launch.** All other HTML pages in `frontend/public/` are either legacy, alternate platforms (Etsy/eBay/TikTok), or batch/dashboard — not part of this master path.

---

## Flow sequence (order of pages)

| Step | Page purpose           | URL (localhost)              | File path |
|------|------------------------|------------------------------|-----------|
| 1    | Landing / marketing    | `/landing.html`              | `auralink-ai/frontend/public/landing.html` |
| 2    | Scan (camera/upload)   | `/home.html?mode=scan`       | `auralink-ai/frontend/public/home.html` |
| 3    | Processing (extraction)| `/flow-2.html`               | `auralink-ai/frontend/public/flow-2.html` |
| 4    | Review & publish       | `/flow-3.html`               | `auralink-ai/frontend/public/flow-3.html` |
| 5a   | Connect Shopify (if needed) | `/connect-store?return=flow-3` | `auralink-ai/frontend/public/stores-connect-shopify.html` |
| 5b   | Success                | `/flow-success.html`          | `auralink-ai/frontend/public/flow-success.html` |

**Entry URL for the full flow:**  
`http://localhost:3000/home.html?mode=scan`  
(or `http://localhost:3000/landing.html` then click “Scan Your First Item”)

**After success:** “List another” → `home.html?mode=scan`; “View listings” → `/dashboard/home`.

---

## How the flow works (data + APIs)

- **Scan (home.html?mode=scan):** User captures/uploads photo. Page can either (a) run extraction on-page and then redirect to flow-2 with draft in `sessionStorage`, or (b) store image in `auralink_pending_scan` and redirect to flow-2 to run extraction there. Master path uses (b) or (a) then flow-2; flow-2 always ensures draft exists and redirects to flow-3.
- **Extraction:** Backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). Injected into `landing.html`, `home.html`, `flow-2.html` by `frontend/scripts/inject-api-url.js`. Flow-2 calls `${apiUrl}/api/v1/vision/extract` (or same-origin proxy when served from Next).
- **Publish:** flow-3 calls publishing API from `meta[name="auralink-publishing-url"]` (localhost: `http://localhost:8001`). Creates draft in Shopify then redirects to flow-success.

---

## Services (for “resume working”)

| Service   | Dir                    | Start command                                      | Port |
|-----------|------------------------|----------------------------------------------------|------|
| Backend   | `auralink-ai/backend` | `.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000` | 8000 |
| Publishing| `auralink-ai/publishing` | `node src/index.js`                            | 8001 |
| Frontend  | `auralink-ai/frontend` | `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev` | 3000 (or next free) |

Env: backend needs `GEMINI_API_KEY` in `backend/.env` for real extraction; set `FORCE_DUMMY_VISION=true` there for instant demo extraction. Publishing: set `SHOPIFY_DEV_ACCESS_TOKEN` and `SHOPIFY_DEV_SHOP_DOMAIN` in `publishing/.env` for local publish without OAuth (survives restarts). Set `FRONTEND_URL` in publishing to the URL you use for the frontend (e.g. `http://localhost:3000`) so success redirects go to the right place.

**Best product recognition:** Set `ENABLE_WEB_ENRICHMENT=true` in `backend/.env` so the scan flow fetches exact product name and details from the web (Gemini + Search). Optional: add `GCP_VISION_CREDENTIALS_JSON` (Google Cloud Vision) for better OCR from labels; add `BRANDS_DB_PATH` (e.g. `data/brands-sample.json`) for canonical brand names. See `backend/.env.example`.

---

## Master flow files only (reference)

```
auralink-ai/frontend/public/landing.html
auralink-ai/frontend/public/home.html
auralink-ai/frontend/public/flow-2.html
auralink-ai/frontend/public/flow-3.html
auralink-ai/frontend/public/stores-connect-shopify.html   (optional branch; URL `/connect-store`)
auralink-ai/frontend/public/flow-success.html
```

Plus injection script so backend URL is consistent:

```
auralink-ai/frontend/scripts/inject-api-url.js
```

---

## Not part of the master flow

Do not use these for the “landing → publish to Shopify” path; they are other/legacy flows:

- `flow-1.html`, `flow-4.html`, `flow.html` — redirects or old steps
- `flow-verifying.html`, `flow-connect.html`, `flow-preview.html`, `flow-publishing.html`, `flow-choose-platform.html` (we go straight to flow-2 → flow-3; platform is Shopify only in master)
- `flow-3-etsy.html`, `flow-3-ebay.html`, `flow-3-tiktok.html` — other platforms
- `flow-batch*.html`, `dashboard*.html`, `listings-*.html`, `onboard-*.html`, `screens.html`, `landing-old.html` — batch, dashboard, onboarding, or legacy

Use **MASTER-FLOW.md** as the single reference when resuming work on "the" flow from landing to publishing to Shopify.

---

## Quick start (everything ready)

From the `auralink-ai/` directory run:

```bash
npm start
```

Then open **http://localhost:3000/home.html?mode=scan**. See `LOCALHOST.md` for details and the three-terminal option.
