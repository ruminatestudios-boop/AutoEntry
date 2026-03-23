# SyncLyst flow & features checklist

Use this to see **what’s working**, **what’s not**, and what to fix or implement, ordered from **easiest to hardest**.

---

## 1. The flow (step-by-step)

| Step | Page / action | What happens | Status |
|------|----------------|--------------|--------|
| **1** | Landing → **“Scan Your First Item”** | Goes to `landing.html?mode=scan` (scan view on same page). | ✅ Working |
| **2** | Scan view: **camera or upload** | User captures/uploads photo. | ✅ Working |
| **3** | **Extract** | Frontend sends image to backend `POST /api/v1/vision/extract` (port 8000). Saves result to `auralink_draft_listing` in sessionStorage, then redirects to **flow-2**. | ✅ Working (if backend running + CORS + GEMINI_API_KEY) |
| **4** | **flow-2** “Reading your product” | Progress bar runs to 100%, steps tick; then **auto-redirect** to flow-3. | ✅ Working |
| **5** | **flow-3** “Confirm your listing” | Loads draft from `auralink_draft_listing` / `auralink_review_draft`. User edits title, description, price, photos, category, tags, etc. **Next** = “Publish to Shopify”: creates listing (POST /api/listings) and publishes (POST /api/listings/publish) on **publishing API (8001)**, then redirects to **flow-success**. If no JWT or Shopify not connected → redirects to **`/connect-store`**. | ✅ Working (if publishing API running + Shopify connected) |
| **6** | **`/connect-store`** | User enters store domain. Page gets **dev-token** from 8001, redirects to `GET /auth/shopify?shop=...&user_id=...&return_to=flow-connect-done.html`. Shopify OAuth → callback on 8001 → redirect back to frontend with `?shopify=connected&shop=...`. | ✅ Working (if publishing API + Shopify app credentials + Supabase or dev user) |
| **7** | **flow-success** “You’re live!” | Shows success message and “List another” / “View listings”. | ✅ Working (small UX gap: see below) |

**Other pages in the repo (optional / alternate paths):**

- **flow-1.html** – No camera or extraction; “Continue” just goes to flow-2. Not used in the main “Scan Your First Item” path (that uses landing scan view).
- **flow-verifying.html** – Alternative confirm modal; “Push live” does the same create + publish. Can be reached from flow-connect-done.
- **flow-marketplaces.html** – Choose where to list (Shopify active, others “Coming soon”); Connect → `/connect-store`.
- **flow-connect-done.html** – “All connected!” → link to flow-verifying.
- **flow-choose-listing.html** – Copy / Download draft; “Connect and publish” → plans.

---

## 2. Features: working vs not

| Feature | Working? | Notes |
|--------|----------|--------|
| **Landing “Scan Your First Item”** | ✅ | Links to `landing.html?mode=scan`. |
| **Camera / upload on landing** | ✅ | Scan view; after capture/upload, extraction runs. |
| **Backend extraction (image + OCR)** | ✅ | Port 8000; needs `GEMINI_API_KEY` (or `OPENAI_API_KEY`), CORS for frontend origin. |
| **Web enrichment (exact name, description, bullets)** | ⚠️ Partial | Uses Gemini; search grounding can fail → fallback to model knowledge. Can still be generic. |
| **Average price from web** | ⚠️ Partial | Enrichment returns `average_price_gbp` when possible; UI shows “Average across UK retailers”. Best-effort. |
| **Draft storage (sessionStorage)** | ✅ | `auralink_draft_listing`, `auralink_review_draft`, `auralink_selected_marketplaces`, `auralink_jwt`. |
| **flow-2 progress + auto-redirect** | ✅ | Bar to 100%, then redirect to flow-3. |
| **flow-3 form (Stores, Product info, Price, etc.)** | ✅ | Loads/saves draft; photos on right; status Active/Draft; “Scan another item” link. |
| **flow-3 Next = Publish** | ✅ | Gets JWT (or dev-token), checks connected-stores, POST create listing, POST publish, redirect to flow-success. |
| **Publishing API: dev-token** | ✅ | `GET /auth/dev-token` returns `{ token, user_id }`; used by static flow (no real login). |
| **Publishing API: create listing** | ✅ | `POST /api/listings` with `universal_data`, JWT; returns `listing_id`. |
| **Publishing API: publish** | ✅ | `POST /api/listings/publish` with `listing_id`, `platforms`; creates product in Shopify as **draft**. |
| **Shopify OAuth (connect store)** | ✅ | `/auth/shopify`, `/auth/shopify/callback` on 8001; `return_to` brings user back to flow page. |
| **`/connect-store`** | ✅ | Uses publishing URL (8001), dev-token, builds auth URL with `return_to`. |
| **flow-success** | ✅ | “List another” links to **flow-1** (no camera there). “View listings” → dashboard-home. |
| **Flow after new scan** | ✅ | New scan clears `auralink_review_draft` so flow-3 shows the new product. |
| **Production / phone** | ❌ | Backend and publishing must be reachable (not localhost). Deploy or use ngrok. |
| **Real auth (replace dev-token)** | ❌ | Not implemented; dev-token is for testing only. |
| **Stripe / paywall** | ❌ | Not implemented. |

---

## 3. What to fix or implement (easiest → hardest)

### Easiest (config / copy / links)

| # | Task | Why |
|---|------|-----|
| 1 | **Fix “List another” on flow-success** | It currently links to `flow-1.html`, which has no camera or extraction. Change to `landing.html?mode=scan` so “List another” runs the full scan flow again. |
| 2 | **Check “View listings”** | flow-success links to `/dashboard/home` (static hub). Confirm that route works and shows listings or dashboard. |
| 3 | **Local run checklist** | Ensure three things running: (1) Backend 8000, (2) Frontend 3000, (3) Publishing 8001. Backend `.env`: `CORS_ORIGINS=http://localhost:3000` (or empty). See `STEP-BY-STEP.md`. |
| 4 | **Env checklist** | **Backend:** `GEMINI_API_KEY`, `CORS_ORIGINS`. **Publishing:** `FRONTEND_URL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (or dev store for dev user). |

### Moderate (data + Shopify setup)

| # | Task | Why |
|---|------|-----|
| 5 | **Supabase for publishing** | Publishing API needs DB for users (getOrCreateDevUser), listings, tokens. Run migrations in `publishing` (or see README/schema); set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. Without this, dev-token may still work if dev store is used. |
| 6 | **Shopify Partner app** | Create app in Partner Dashboard; set **Allowed redirection URL** to `https://<publishing-host>/auth/shopify/callback` (or `http://localhost:8001/auth/shopify/callback` for local). Add `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` to publishing `.env`. |
| 7 | **Production URLs** | Deploy backend, frontend, and publishing; set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PUBLISHING_API_URL`, `FRONTEND_URL`, `CORS_ORIGINS`. Update Shopify redirect URL to production publishing callback. See `LAUNCH-CHECKLIST.md`. |

### Harder (device access, auth, payments)

| # | Task | Why |
|---|------|-----|
| 8 | **Test on phone** | Camera works on HTTPS. Backend and publishing must be reachable from phone (same WiFi + use machine IP, or deploy/ngrok). |
| 9 | **Replace dev-token with real auth** | For production: sign-in (e.g. Clerk), pass user id and JWT to connect and publish; remove or restrict `GET /auth/dev-token`. |
| 10 | **Stripe + paywall** | Add products, Checkout, webhooks; enforce scan/quota by subscription; “Upgrade now” flow. See `LAUNCH-CHECKLIST.md` steps 13–14. |

---

## 4. Quick verification (local)

1. **Backend:** `http://localhost:8000/health` → `{"status":"ok",...}`  
2. **Publishing:** `http://localhost:8001/health` or `http://localhost:8001/auth/dev-token` → JSON  
3. **Frontend:** `http://localhost:3000` → click “Scan Your First Item” → capture/upload → extraction runs → flow-2 → flow-3  
4. **Connect:** On flow-3, if not connected, “Next” sends you to `/connect-store`; enter store → OAuth → back to flow  
5. **Publish:** On flow-3, click Next (Publish to Shopify) → flow-success; product appears in Shopify Admin as **draft**

---

## 5. Order summary (tick as you go)

**Easiest**

- [ ] 1. Fix flow-success “List another” → `landing.html?mode=scan`
- [ ] 2. Verify “View listings” target (dashboard-home or substitute)
- [ ] 3. Local: backend + frontend + publishing running; CORS set
- [ ] 4. Env: backend and publishing .env filled (Gemini, Shopify, Supabase, JWT, FRONTEND_URL)

**Moderate**

- [ ] 5. Supabase: migrations for publishing (users, listings, tokens)
- [ ] 6. Shopify Partner: app created, redirect URL set, API key/secret in publishing
- [ ] 7. Production: deploy all three; wire env vars and Shopify callback

**Harder**

- [ ] 8. Test full flow on phone (HTTPS + reachable APIs)
- [ ] 9. Real auth (e.g. Clerk) instead of dev-token
- [ ] 10. Stripe + paywall (optional)

After 1–7 you can run the full flow locally and in production (scan → extract → connect Shopify → push as draft).  
8–10 are for mobile testing and paid launch.
