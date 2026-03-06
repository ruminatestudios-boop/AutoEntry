# AuraLink AI – What’s Implemented, What’s Left, How to Test

## Dummy run (no connections)

You can run the full flow **without** Supabase, Vision API keys, or Shopify:

1. **Backend** – Use an empty `.env` or one with only:
   - `CORS_ORIGINS=` (empty) or `CORS_ORIGINS=*` so the frontend can call the API from `http://localhost:3000`.
   - Do **not** set `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` (or leave them empty).
   - Do **not** set `GEMINI_API_KEY` or `OPENAI_API_KEY`.

2. **Start backend and frontend** (same as below). Open the app → **Try product scan** → upload or capture any image.

3. **What happens:**
   - **Extract**: Returns a fixed dummy extraction (no Vision API call).
   - **Save as draft**: Saves to in-memory store and returns a product id (data is lost on backend restart).
   - **List products**: Returns the in-memory list. Sync/publish endpoints return a “demo mode” message.

No database or API keys are required. When you’re ready to connect, set Supabase and (optionally) Gemini/OpenAI in `.env`.

---

## What’s implemented

| Area | Status | Notes |
|------|--------|--------|
| **Vision** | ✅ Done | `POST /api/v1/vision/extract` – Gemini/OpenAI, UCP + Fact–Feel–Proof |
| **Product create** | ✅ Done | From extraction → `universal_products` + optional `description_variations` (SHOPIFY_META) |
| **UCP manifest (GEO)** | ✅ Done | Build on create, serve `GET /.well-known/ucp` and `GET /.well-known/ucp/products/{id}` |
| **Shopify OAuth** | ✅ Done | Install, callback, store credentials |
| **Shopify sync** | ✅ Done | IntegrationsManager (meta/SEO copy) → GraphQL productCreate, channel_adapters + push_snapshot |
| **Token refresh** | ✅ Done | `get_valid_shopify_access_token` + optional refresh when `refresh_token`/expiry set |
| **Event-driven publish** | ✅ Done | `POST /api/v1/integrations/publish/{id}` and webhook `listing-published` → queue sync to all stores |
| **Feedback moat** | ✅ Done | Weekly Celery task: Shopify orders → performance_logs (by variation/prompt) |
| **IntegrationsManager** | ✅ Done | TikTok &lt;500 chars, Amazon bullets, Shopify meta – copy adaptation only |
| **Amazon / TikTok / Depop sync** | ⏳ Stubbed | Tasks exist, use IntegrationsManager, but **no real API calls** yet (return `pending_impl`) |

## What’s left (optional / later)

- **Amazon SP-API**: Implement list/patch in `sync_to_amazon` using credentials + adapted copy.
- **TikTok Shop API**: Implement create/update in `sync_to_tiktok_shop` with ≤500-char description.
- **Depop**: Implement API or CSV export in `sync_to_depop`.
- **Run migrations**: Ensure `20250225120000_agentic_engine.sql` and `20250225180000_shopify_token_refresh.sql` are applied on your Supabase project.

---

## Prerequisites for a basic run

1. **Backend**
   - Python venv, `pip install -r requirements.txt`, `.env` with at least:
     - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
     - `GEMINI_API_KEY` (or `VISION_PROVIDER=openai` + `OPENAI_API_KEY`)
     - Optional: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` for dashboard auth  
   - Migrations applied in Supabase (see above).

2. **Frontend**
   - `npm install`, `.env.local` with:
     - `NEXT_PUBLIC_API_URL` (see below for desktop vs phone)
     - Clerk keys if you want dashboard/sign-in.

3. **Shopify sync (optional)**
   - `.env`: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `APP_BASE_URL`, `FRONTEND_URL`
   - Celery worker + Redis so `sync_to_shopify` runs.

---

## Test on desktop (same machine)

1. **Start backend**
   ```bash
   cd auralink-ai/backend
   source .venv/bin/activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start frontend** (API URL defaults to localhost)
   ```bash
   cd auralink-ai/frontend
   npm run dev
   ```
   `scripts/inject-api-url.js` will put `http://localhost:8000` into `landing.html` from `NEXT_PUBLIC_API_URL` (or that default).

3. **Basic flow**
   - Open `http://localhost:3000` (or `http://localhost:3000/landing.html`).
   - Click **Try product scan** → open **?mode=scan** (or go to `/landing.html?mode=scan`).
   - Use camera or upload image → capture → extraction runs (`POST /api/v1/vision/extract`).
   - Click **Save as draft** → `POST /api/v1/products/from-extraction` (optional auth); draft is created.
   - Sign in (if Clerk is set) → **Control Center** → **Connect Shopify** (optional) → **View master products** → **Sync to Shopify** (needs Celery worker + Redis).

4. **Optional: Celery**
   ```bash
   cd auralink-ai/backend
   celery -A app.tasks.sync_tasks worker -l info
   ```
   Then “Sync to Shopify” will run the task and create the product in Shopify.

---

## Test on your phone (same Wi‑Fi)

**Yes — the flow works on mobile.** When you open the app from your phone’s browser (e.g. `http://192.168.1.196:3000`), the landing page detects the host and sends API requests to the same IP on port 8000, so camera → extract → Save as draft works. Use the steps below.

Goal: phone browser hits your frontend and backend on your machine’s LAN IP.

1. **Get your machine’s LAN IP**  
   e.g. `192.168.1.196` (Mac: System Settings → Network; Windows: `ipconfig`).

2. **Backend – listen on all interfaces**
   ```bash
   cd auralink-ai/backend
   source .venv/bin/activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Frontend – bind to LAN and point API to your machine**
   ```bash
   cd auralink-ai/frontend
   NEXT_PUBLIC_API_URL=http://192.168.1.196:8000 npm run dev
   ```
   Replace `192.168.1.196` with your actual LAN IP if different.  
   `npm run dev` already runs Next.js with `--hostname 0.0.0.0`, so the phone can load the site.  
   **Tip:** If you don’t set `NEXT_PUBLIC_API_URL`, the landing page will still use your backend when you open it from the phone: it detects the host (e.g. 192.168.1.196) and uses `http://192.168.1.196:8000` for API calls.

4. **On the phone**
   - Connect to the **same Wi‑Fi** as your computer.
   - In the browser open: `http://192.168.1.196:3000` (same IP, port 3000).
   - Go to **Try product scan** (or `/landing.html?mode=scan`).
   - Camera or upload → capture → extract → **Save as draft**.

**If the phone can’t reach the backend:**

- Check firewall (allow 8000 and 3000 from LAN).
- Confirm phone and computer are on the same network and the IP is correct.
- On the phone, try opening `http://192.168.1.196:8000/health` – you should see `{"status":"ok",...}`.

**Using a tunnel (e.g. ngrok) instead of LAN**

- Run ngrok for port 8000 and for 3000 (two tunnels or one for the app and backend on same host).
- Set `NEXT_PUBLIC_API_URL=https://your-ngrok-backend-url` and open the frontend ngrok URL on the phone.  
Then you can test from anywhere, not just same Wi‑Fi.

---

## Quick checklist for “one full run”

- [ ] Supabase migrations applied (universal_products, shopify_stores, agentic_engine, token_refresh).
- [ ] Backend `.env`: Supabase + Gemini (or OpenAI) (+ Clerk if using dashboard).
- [ ] Frontend `.env.local`: `NEXT_PUBLIC_API_URL` (+ Clerk keys if using dashboard).
- [ ] Backend: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
- [ ] Frontend: `NEXT_PUBLIC_API_URL=http://YOUR_IP:8000 npm run dev` (and `--hostname 0.0.0.0` for phone).
- [ ] Phone: same Wi‑Fi, open `http://YOUR_IP:3000` → landing → Try product scan → Save as draft.
- [ ] (Optional) Redis + Celery worker + Shopify OAuth + “Sync to Shopify” from dashboard.
