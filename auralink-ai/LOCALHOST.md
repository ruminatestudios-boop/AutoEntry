# Run end-to-end on localhost (landing, Shopify, approval prep)

Use this to run **scan → extract → publish to Shopify** on your machine while you prepare for **Shopify App Store** review.

---

## 1. Start all services

### Option A — Monorepo root (`SyncLyst/`)

Requires `concurrently` (installed at root):

```bash
cd /path/to/SyncLyst
npm install
npm run dev:all
```

Starts **backend :8000**, **frontend :3000**, **publishing :8001** with JWT secrets aligned for `GET /api/publishing/token`.

### Option B — `auralink-ai/` package (inject + three processes)

```bash
cd auralink-ai
npm install
npm start
```

Runs API URL **inject** into static HTML, then the same three services (frontend gets matching JWT env).

### Option C — Three terminals

See commands in older sections of git history or use Option A/B.

---

## 2. Open the **landing** page (marketing + scan + Publish to Shopify)

With the frontend on **port 3000**, use:

**http://localhost:3000/landing.html?mode=scan**

- Vision/extract → **http://localhost:8000** (`auralink-api-url` / `NEXT_PUBLIC_API_URL`).
- Publishing → **http://localhost:3000/__synclyst_publishing/** (Next proxy to **:8001**). Same as `synclyst-publish-from-draft.js` on localhost:3000.

**Other entry points:**

| URL | What it is |
|-----|------------|
| **http://localhost:3000/scan** | Canonical scan URL (serves `home.html`; flow → reading-product → review) |
| **http://localhost:3000/landing.html?mode=scan** | Full marketing shell + inline extract + **Publish to Shopify (draft)** |

---

## 3. Env checklist (local)

| Service | File | What you need |
|--------|------|----------------|
| Backend | `backend/.env` | `GEMINI_API_KEY` (or `FORCE_DUMMY_VISION=true` for quick UI tests) |
| Publishing | `publishing/.env` | `JWT_SECRET` (match frontend `PUBLISHING_JWT_SECRET` if you override), `FRONTEND_URL=http://localhost:3000`, Shopify vars — see below |
| Frontend | `frontend/.env.local` | Optional; `npm run dev` from Option A injects `NEXT_PUBLIC_API_URL` via env |

**Publish without OAuth (fastest local test):** in `publishing/.env` set `SHOPIFY_DEV_ACCESS_TOKEN` + `SHOPIFY_DEV_SHOP_DOMAIN` — Connect page can skip real OAuth. **Not for App Store production.**

**Real OAuth on localhost:** in [Shopify Partners](https://partners.shopify.com) → your app → **Allowed redirection URL(s)** add exactly:

`http://localhost:8001/auth/shopify/callback`

Must match `APP_URL` / `SHOPIFY_REDIRECT_URI` in `publishing/.env`. Verify: **http://localhost:8001/auth/shopify/status** → `redirect_uri`.

---

## 4. Shopify approval prep — what localhost can and cannot do

| Topic | Localhost | For real review |
|--------|-----------|-----------------|
| Scan + extract + draft publish | Yes | Same code path; test here first |
| OAuth redirect | Yes, if `localhost:8001` is allowlisted | Production must use **https** publishing URL |
| **Mandatory compliance webhooks** | **Shopify cannot call `http://localhost`** | Deploy publishing (e.g. Cloud Run), register `https://<host>/webhooks/shopify/compliance`, or use a tunnel (e.g. ngrok) **only for webhook tests** |
| Public app + listing | N/A | Follow **publishing/SHOPIFY-PUBLIC-APP-PARTNERS-SETUP.md** and **SHOPIFY-APP-STORE-LAUNCH.md** |

---

## 5. Quick sanity checks

- Backend: **http://localhost:8000/docs**
- Publishing: **http://localhost:8001/health** and **http://localhost:8001/auth/shopify/status**
- Landing scan: **http://localhost:3000/landing.html?mode=scan**
- Privacy/terms (for listing URLs later): **http://localhost:3000/privacy** · **http://localhost:3000/terms**

---

## 6. HTTPS locally (SSL-ready dev — camera / OAuth polish)

Next.js can serve **HTTPS** on port **3000** with a **self-signed** certificate (`--experimental-https`). Browsers will show a warning once; proceed / “Advanced → proceed” for localhost.

### One command (repo root)

```bash
cd /path/to/SyncLyst
npm install
npm run dev:all:https
```

Then open:

**https://localhost:3000/landing.html?mode=scan**

### Frontend only (HTTPS)

```bash
cd auralink-ai/frontend
npm run dev:https
```

(`dev:https:no-open` skips opening the browser.)

### Publishing env when the app runs on HTTPS

Set in **`publishing/.env`** so post-OAuth redirects and CORS match:

```env
FRONTEND_URL=https://localhost:3000
```

(Use `http://localhost:3000` again when you switch back to plain `npm run dev`.)

**Note:** Shopify **compliance webhooks** still need a **public HTTPS** URL (deployed API or tunnel), not `localhost`. Local HTTPS helps **you** test the web app and camera; production review uses your real `https://` hosts.

---

## 7. Master flow reference

Broader flow map: **MASTER-FLOW.md**. App Store checklist: **publishing/SHOPIFY-APP-STORE-LAUNCH.md**.
