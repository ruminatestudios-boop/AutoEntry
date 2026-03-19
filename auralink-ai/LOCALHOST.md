# Run end-to-end flow on localhost

Use this to run **scan → extract → review → publish to Shopify** entirely on your machine.

**Master flow (see `MASTER-FLOW.md`):**  
Landing → **home.html?mode=scan** → flow-2 (extraction) → flow-3 (review) → Publish to Shopify → flow-success.

## 1. Start the three services

**Option A — One command (from repo root `auralink-ai/`):**

```bash
cd auralink-ai
npm start
```

This runs the API URL inject, then starts backend (8000), publishing (8001), and frontend (3000). When you see "Ready" for the frontend, open **http://localhost:3000/home.html?mode=scan**.

**Option B — Three terminals** (if you prefer separate windows):

### Terminal 1 — Backend (extraction)

```bash
cd auralink-ai/backend
# Optional: use a venv
# python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Set GEMINI_API_KEY and FORCE_DUMMY_VISION=false in .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend will listen on **http://localhost:8000**.

### Terminal 2 — Publishing API (Shopify drafts)

```bash
cd auralink-ai/publishing
npm install
# Copy .env.example to .env; for dev token bypass set SHOPIFY_DEV_ACCESS_TOKEN and SHOPIFY_DEV_SHOP_DOMAIN
npm run dev
```

Publishing will listen on **http://localhost:8001**.

### Terminal 3 — Frontend

```bash
cd auralink-ai/frontend
npm install
# .env.local has NEXT_PUBLIC_API_URL=http://localhost:8000 (created for master flow)
npm run dev
```

Frontend will listen on **http://localhost:3000** (dev-open may open the browser).

---

## 2. Open the flow

Full page list and file paths: **see `MASTER-FLOW.md`**.

In your browser go to:

**http://localhost:3000/home.html?mode=scan**

From there:

1. **Home** — Use camera or upload a product photo.
2. **Flow 2** — Extraction runs (frontend proxies to backend:8000).
3. **Flow 3** — Review and edit listing, then **Publish to Shopify**.
4. **Publish** — Publishing API (localhost:8001) creates a draft in Shopify; redirects to flow-success.

---

## 3. Env checklist

| Service    | Env file        | Key for local flow |
|-----------|------------------|---------------------|
| Backend   | `backend/.env`  | `GEMINI_API_KEY`, `FORCE_DUMMY_VISION=false` |
| Publishing| `publishing/.env`| `SHOPIFY_DEV_ACCESS_TOKEN`, `SHOPIFY_DEV_SHOP_DOMAIN` (e.g. `mystore.myshopify.com`), `FRONTEND_URL=http://localhost:3000` |
| Frontend  | `frontend/.env.local` | `NEXT_PUBLIC_SYNCLYST_BACKEND_URL=http://localhost:8000` |

With the dev token set, the store is treated as connected and you can publish without going through the Shopify OAuth connect page.

---

## 4. Quick sanity check

- Backend: **http://localhost:8000/docs**
- Publishing: **http://localhost:8001/auth/shopify/status** (should show `dev_token_active` when dev token is set)
- Frontend flow: **http://localhost:3000/home.html?mode=scan**
