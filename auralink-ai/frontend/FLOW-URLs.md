# Flow URLs (localhost) and file paths

Base URL: **http://localhost:3000** (or **http://localhost:3003** if port 3000 is in use — check terminal.)

---

## Step-by-step flow: URL → file

| Step | Localhost URL | File path (in repo) |
|------|----------------|---------------------|
| **1. Landing** | http://localhost:3000/landing.html | `auralink-ai/frontend/public/landing.html` |
| **2. Scan (camera/upload)** | http://localhost:3000/landing.html?mode=scan | Same file: `public/landing.html` (mode=scan shows scan UI) |
| **3. Choose platform** | http://localhost:3000/flow-choose-platform.html | `auralink-ai/frontend/public/flow-choose-platform.html` |
| **4. Processing** | http://localhost:3000/flow-2.html | `auralink-ai/frontend/public/flow-2.html` |
| **5. Review (edit & publish)** | http://localhost:3000/flow-3.html | `auralink-ai/frontend/public/flow-3.html` |
| **6. Success** | http://localhost:3000/flow-success.html | `auralink-ai/frontend/public/flow-success.html` |

---

## Other related pages (same flow)

| Purpose | URL | File |
|--------|-----|------|
| Connect Shopify (if not connected) | http://localhost:3000/stores-connect-shopify.html | `public/stores-connect-shopify.html` |
| View listings (after success) | http://localhost:3000/dashboard-home.html | `public/dashboard-home.html` |
| Next.js home (CTA into flow) | http://localhost:3000/ | `app/page.tsx` |
| Redirect to scan | http://localhost:3000/flow.html | `public/flow.html` → redirects to `landing.html?mode=scan` |

---

## How the flow runs

1. **landing.html** — Marketing page. Click “Scan Your First Item” → goes to `landing.html?mode=scan`.
2. **landing.html?mode=scan** — Camera or upload. After capture, **extraction runs on this page** (calls backend). On success it **auto-redirects** to `flow-choose-platform.html` (no extra button).
3. **flow-choose-platform.html** — Pick Shopify (or Etsy/eBay/TikTok). Click Shopify → goes to `flow-2.html` with draft in sessionStorage.
4. **flow-2.html** — If draft already exists (from step 2), shows short progress then redirects to `flow-3.html`. If you had arrived with a pending image only, it would run extraction here.
5. **flow-3.html** — Review/edit listing, then “Publish to Shopify” → publishing API creates draft → redirect to `flow-success.html`.
6. **flow-success.html** — “You’re live!” → “View listings” (dashboard-home) or “List another” (landing.html?mode=scan).

---

## APIs used (for localhost)

- **Extraction:** `http://localhost:3000/api/v1/vision/extract` (Next.js proxy → backend **http://localhost:8000**).  
  Set `NEXT_PUBLIC_SYNCLYST_BACKEND_URL=http://localhost:8000` in `frontend/.env.local`.
- **Publish to Shopify:** static HTML calls publishing API at **http://localhost:8001** (see meta `auralink-publishing-url` / script in flow-3).

---

## Start localhost (all three services)

**Terminal 1 – Backend (extraction):**
```bash
cd auralink-ai/backend
pip install -r requirements.txt   # if needed
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 – Publishing (Shopify drafts):**
```bash
cd auralink-ai/publishing
node src/index.js
```

**Terminal 3 – Frontend:**
```bash
cd auralink-ai/frontend
npm run dev
```

Then open: **http://localhost:3000/landing.html** (or http://localhost:3000/landing.html?mode=scan to start at scan).
