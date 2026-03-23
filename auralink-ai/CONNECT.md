# Connect localhost – checklist

## 0. One command to run everything (easiest)

From the **repo root** (AutoEntry Shopify):

```bash
npm run dev:all
```

This starts the **backend** (8000), **frontend** (3000), and **publishing** (8001) in one terminal. You’ll see output from all three with prefixes `[backend]`, `[frontend]`, `[publishing]`. To stop, press **Ctrl+C** once.

If you see **“address already in use”** (EADDRINUSE) for 8000, 8001, or 3000, something is still running from before. From the repo root run **`npm run dev:all:clean`** instead: it frees those ports then starts all three services.

Then open http://localhost:3000 and use the app (scan, flow-3, Publish to Shopify). For phone testing use the Scan URL from the frontend output or run `npm run dev:phone` from `auralink-ai/frontend` in a separate terminal.

---

## 1. Start the backend (port 8000)

From project root (**AutoEntry General**):

```bash
cd auralink-ai/backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Leave this terminal open. You should see: `Uvicorn running on http://0.0.0.0:8000` and `Application startup complete`.
- If you see **Address already in use**: something is already using port 8000. Kill it with:
  ```bash
  lsof -i :8000
  kill -9 <PID>
  ```
  Then run the `uvicorn` command again.

**Verify:** Open http://localhost:8000/health in your browser. You should see: `{"status":"ok","service":"auralink-ai"}`.

---

## 2. Start the frontend (port 3000)

**Run the dev server from `auralink-ai/frontend`.** If you're already in the frontend folder, use the commands below as-is (no `cd`).

**From inside `auralink-ai/frontend`** (your terminal shows `frontend %`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

If you had 404 on `/dashboard` before, clear the cache then start:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev:clean
```

**From repo root** (e.g. `AutoEntry General`), you can run:

```bash
npm run dev:auralink
```

(Do **not** run `npm run dev:auralink` from inside `auralink-ai/frontend` — that script lives in the root `package.json`.)

- Wait until you see: `Local: http://localhost:3000`.
- Open http://localhost:3000/dashboard.

**Verify:** Open http://localhost:3000/dashboard. In the top-right you should see:
- **API: http://localhost:8000** and **● Connected** (green).  
- If you see **● Not connected**, the backend is not running or not reachable; go back to step 1.

---

## 2b. Start the publishing service (for “Publish to Shopify”)

The **Publish to Shopify** button on flow-3 talks to the **publishing service** on port **8001**. If you see “Failed to fetch” when clicking it, the publishing service isn’t running.

From **`auralink-ai/publishing`**:

```bash
npm run dev
```

- Leave this terminal open. You should see the server listening on port 8001.
- **Verify:** Open http://localhost:8001/health in your browser (if it has a health route) or http://localhost:8001/auth/dev-token — you should get a response, not “connection refused”.

For the full listing flow (scan → review → **Publish to Shopify**), run **backend** (8000), **frontend** (3000), and **publishing** (8001).

**No database?** If you don’t set up Supabase, the publishing service runs in **dev mode** (in-memory): you can get a token, connect Shopify, create a listing, and publish. Data is lost when you restart the service. For production, set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `publishing/.env`.

---

## 3. If it still doesn’t connect

- Confirm **both** terminals are still running (backend and frontend).
- Confirm you opened **http://localhost:3000** (not 8000) for the app.
- Try http://localhost:8000/health in the browser; if that fails, the backend isn’t running.
- Restart the frontend with the env var: `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev`.

---

## 3b. Why do I see “Not connected” or can’t connect?

The dashboard and scan flow call the **backend** at `http://localhost:8000`. If that request fails, you see **● Not connected**. Common causes:

| Cause | What to do |
|-------|------------|
| **Backend not running** | Start it: `cd auralink-ai/backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`. Then open http://localhost:8000/health — you should see `{"status":"ok",...}`. |
| **Wrong API URL** | The frontend must use port **8000** for the main API. Run the frontend with `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev` (from `auralink-ai/frontend`). Restart the dev server after changing this. |
| **CORS blocking the request** | The backend only allows origins listed in `CORS_ORIGINS`. In **`auralink-ai/backend/.env`** either leave `CORS_ORIGINS` **empty** (allows all in dev) or set `CORS_ORIGINS=http://localhost:3000`. Restart the backend after changing `.env`. |
| **Scan says “Couldn’t reach the server”** | Same as above: backend must be running on 8000 and CORS must allow your page’s origin (e.g. http://localhost:3000). |

**Quick checks:**

1. In the browser, open **http://localhost:8000/health**. If you get JSON with `"status":"ok"`, the backend is up.
2. On the dashboard, the header shows **API: http://localhost:8000**. If it shows a different URL, the frontend was built or started with a different `NEXT_PUBLIC_API_URL`; restart the frontend with the correct env.
3. Open DevTools (F12) → Network. Reload the page and look for a request to `http://localhost:8000/health`. If it’s red or blocked (CORS), fix backend CORS as above.

**“Connect” as in Connect to Shopify?** If the problem is **connecting your store** (Log in to Shopify / Connect store), see **Section 5** below (Shopify app not configured) and **Section 6** (Shopify connect flow).

---

## 3c. Shopify end-to-end flow – why it might not work & two paths

**Two ways to run the flow:**

| Path | Entry | Design | When it works |
|------|--------|--------|----------------|
| **App flow** | **Dashboard → Upload** (`/dashboard/upload`) or home footer “Photo → Shopify (app)” | React app, same UI as dashboard | Backend (8000) running, frontend started with `NEXT_PUBLIC_API_URL=http://localhost:8000`. Upload → extract → save product → “Sync to Shopify” from dashboard. |
| **Legacy / static flow** | **Landing scan** (`/landing.html?mode=scan`) → flow-2 → flow-choose-platform → flow-3 → Publish to Shopify | Static HTML (Tailwind + vanilla JS) | Backend (8000) + **publishing service (8001)** running. Frontend must use `NEXT_PUBLIC_API_URL=http://localhost:8000` so the **vision extract proxy** (used by flow-2) targets your local backend. |

**Why the static flow can “not work”:**

1. **Extract goes to wrong backend** – flow-2 calls `localhost:3000/api/v1/vision/extract` (same-origin). The Next.js proxy forwards that to the backend URL. If you didn’t set `NEXT_PUBLIC_API_URL=http://localhost:8000` when starting the frontend, the proxy still points at production; local backend never gets the request.
2. **Publishing service not running** – “Publish to Shopify” on flow-3 talks to the **publishing service** on port **8001**. If that service isn’t running, the button fails (e.g. “Failed to fetch”).
3. **Shopify not connected** – flow-3 checks for a connected Shopify store (via publishing service or backend). If none, it redirects to Connect Shopify; you must complete OAuth and return to flow-3.

**Recommendation:** Use the **app flow** (`/dashboard/upload`) as the main path; it uses the same backend and doesn’t depend on the publishing service for the upload/sync step. Use the legacy flow only if you need the static scan → flow-2 → flow-3 journey (e.g. camera on a separate device).

---

## 4. Launch for real users (Android + iPhone) – camera must work

The in-app **camera** only works for **all users** (including iPhone) when the app is served over **HTTPS**.

- **Android:** Camera often works over `http` on the same Wi‑Fi (e.g. `http://192.168.x.x:3000`).
- **iPhone:** Safari (and Chrome on iOS) block camera access on non-HTTPS pages. So for launched product, the app **must** be on HTTPS.

**What to do when you launch:**

1. **Deploy the frontend** to a host that gives you HTTPS (e.g. **Vercel**, **Netlify**, or your own server with SSL). Users open `https://yourapp.com/landing.html?mode=scan`.
2. **Backend:** Deploy the API to a URL with HTTPS (e.g. `https://api.yourapp.com`) and set `NEXT_PUBLIC_API_URL` (or your build config) to that URL.
3. **CORS:** In production, set the backend's `CORS_ORIGINS` to your frontend origin(s), e.g. `https://yourapp.com`.

Then both Android and iPhone users get camera access. If someone is on a bad connection or denies camera, **Upload photo** still works on all devices.

---

## 5. "Shopify app not configured" (503 / JSON error)

If you see `{"detail":"Shopify app not configured"}` when connecting a store (e.g. after entering your store domain and clicking **Connect store**), the app that handles the Shopify OAuth flow is missing credentials.

**Which service is used for connect?**

- The **Connect Shopify** page normally uses the **publishing service** (port **8001**): it gets a dev token, then redirects to `http://localhost:8001/auth/shopify?shop=...`.
- If the publishing service doesn’t return a user (e.g. DB not set up), the frontend falls back to the **backend** (port **8000**): `http://localhost:8000/api/v1/shopify/install?shop=...`.

**Fix:**

1. **If you use the publishing service (recommended for the listing flow)**  
   In **`auralink-ai/publishing/.env`** (copy from `.env.example` if needed), set:
   - `SHOPIFY_API_KEY` – from [Shopify Partner Dashboard](https://partners.shopify.com) → your app → **API credentials** → **Client ID**
   - `SHOPIFY_API_SECRET` – same place → **Client secret**  
   Also set `APP_URL` (e.g. `http://localhost:8001`) and ensure the app’s **Redirect URL** in the Partner Dashboard is `https://your-publishing-url/auth/shopify/callback` (use your real URL in production).

2. **If the request goes to the backend (port 8000)**  
   In **`auralink-ai/backend/.env`**, set:
   - `SHOPIFY_CLIENT_ID` – Partner Dashboard → app → **API credentials** → **Client ID**
   - `SHOPIFY_CLIENT_SECRET` – **Client secret**  
   Set `APP_BASE_URL` to your backend URL (e.g. `http://localhost:8000`) so the OAuth redirect URI is correct.

Restart the service whose `.env` you changed, then try **Connect store** again.

---

## 6. Shopify connect flow (user journey)

When a user connects their store, this is what happens end to end:

1. **User is on our site** (e.g. flow-3 listing page) and clicks **Log in to Shopify** (or opens the Connect Shopify page and enters their store, e.g. `fightlore.store`).
2. **User clicks “Connect store”**  
   Our app redirects them to **Shopify’s site** (`https://{store}.myshopify.com/admin/oauth/authorize?...`).
3. **User signs in on Shopify**  
   If they’re not logged in, Shopify shows the **login page** (email/password or magic link). After signing in, they see the **“Allow this app”** (authorize) screen.
4. **User approves the app**  
   They click Install / Allow. Shopify redirects back to **our callback URL** with an auth code.
5. **Our backend (or publishing service) exchanges the code for a token** and stores it. Then we **redirect the user back to our site** with `?shopify=connected&shop=xxx.myshopify.com` (e.g. back to flow-3 or dashboard).
6. **User is back on our site, ready to publish**  
   Flow-3 shows a green banner: **“Shopify connected. You're ready to publish.”** They can click **Publish to Shopify** to push the listing to their store.

So: **user enters store → signs in on Shopify → approves app → returns to our site → ready to publish.**

---

## 7. How to try the full flow (testing checklist)

Use this to test the full journey: listing → connect store → sign in on Shopify → back to our site → publish.

**Before you start**

- **Shopify app:** In [Partner Dashboard](https://partners.shopify.com) → your app → URLs, set redirect URL to `http://localhost:8000/api/v1/shopify/callback` (backend) or `http://localhost:8001/auth/shopify/callback` (publishing), depending on which you use.
- **Store:** Use a live, non-paused store (e.g. a development store from Partners). "This shop is currently unavailable" means that store can’t complete OAuth.

**1. Start services**

- **Backend:** `cd auralink-ai/backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`  
  Check: http://localhost:8000/health → expect `"shopify_configured": true`
- **Frontend:** `cd auralink-ai/frontend && npm run dev`  
  Check: http://localhost:3000 (or 3001 if 3000 is in use)
- **Publishing (for Publish to Shopify):** `cd auralink-ai/publishing && npm run dev`  
  Check: http://localhost:8001/auth/dev-token returns JSON (not connection refused)

**2. Open listing page**

- Go to http://localhost:3000/flow-3.html (or 3001).  
- If you need a draft first: http://localhost:3000/landing.html?mode=scan → scan/upload a product → continue to review (flow-3).

**3. Connect Shopify**

- On flow-3, click **Log in to Shopify** (or open http://localhost:3000/connect-store?return=flow-3).
- Enter your store (e.g. `your-store` or `your-store.myshopify.com`).
- Click **Connect store**.

**4. On Shopify**

- You’re redirected to Shopify. Sign in if prompted, then click **Install app** / **Allow**.

**5. Back on our site**

- You’re redirected to flow-3 with `?shopify=connected&shop=xxx.myshopify.com`.
- Green banner: **“Shopify connected. You're ready to publish.”**

**6. Publish**

- Click **Publish to Shopify**. (If DB/publishing isn’t set up, publish may fail, but the connect flow is complete.)

**URLs**

- Health: http://localhost:8000/health  
- Listing: http://localhost:3000/flow-3.html  
- Connect: http://localhost:3000/connect-store?return=flow-3

---

## 8. Testing on phone (extraction not working)

If you open the scan page on your phone and **photo extraction doesn’t work** (e.g. “Reading your product” then an error, or nothing happens), follow this.

**1. Start the frontend in phone mode**

From **`auralink-ai/frontend`**:

```bash
npm run dev:phone
```

Use the **Scan** URL it prints (e.g. `http://192.168.1.196:3000/landing.html?mode=scan`) and open that **on your phone** (same Wi‑Fi as your computer).

**2. Backend must be reachable from the phone**

- Start the backend with **`--host 0.0.0.0`** so it listens on your LAN:
  ```bash
  cd auralink-ai/backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```
- Phone and computer must be on the **same Wi‑Fi**.
- On the scan page on your phone you’ll see a small “Using API: http://&lt;your-ip&gt;:8000” line under the header; that’s the URL the app uses for extraction. If extraction fails, open **that URL/health** in the phone’s browser (e.g. `http://192.168.1.196:8000/health`). If that doesn’t load, the phone can’t reach the backend (firewall or wrong IP).

**3. Camera vs Upload on phone**

- **iPhone:** Camera often doesn’t work over HTTP (Safari requires HTTPS). Use **Upload photo** on the scan screen; extraction works the same.
- **Android:** Camera may work over HTTP on the same Wi‑Fi; if not, use **Upload photo**.

**4. If you still get “Network error” or “Couldn’t reach the server”**

- Confirm backend is running and **`http://localhost:8000/health`** works on your computer.
- On the phone, try opening `http://<your-ip>:8000/health` (use the same IP as in “Using API: …”). If that doesn’t load, allow port 8000 in your computer’s firewall for local network access, or try another network.
- Backend `.env`: `CORS_ORIGINS=*` is fine for local testing so the phone's origin is allowed.

**5. Publish to Shopify on phone**

- The publishing service (port 8001) must be running on your computer. It listens on `0.0.0.0`, so the phone can reach it at `http://<your-ip>:8001`. Start it with `cd auralink-ai/publishing && npm run dev`. In development, CORS allows the phone's origin.

---

## Production: `synclyst.app` (static) + Next.js on Vercel (split)

If **marketing** is deployed from the **repo root** (`index.html`) but **Dashboard / upgrade / scan flows** live on a **separate Next.js** URL (e.g. `https://synclyst-xxxxx.vercel.app`):

1. Set the Next deployment origin on the marketing page:
   - **Option A:** In repo root `index.html` (and `frontend/public/landing.html` before sync), set  
     `<meta name="synclyst-app-origin" content="https://YOUR-NEXT-DEPLOYMENT.vercel.app" />`  
     (no trailing slash).
   - **Option B:** Set `NEXT_PUBLIC_SYNCLYST_APP_ORIGIN` in `.env`, then run `node scripts/inject-api-url.js` and `npm run sync:root-index` from `auralink-ai/frontend`, commit, push.

2. **Backend CORS:** add your Next.js origin and `https://synclyst.app` to `CORS_ORIGINS` on Cloud Run.

3. **Limitation:** **Session storage is per-origin.** If users **scan on** `synclyst.app` but **flow-2 opens on** another domain, the pending scan in `sessionStorage` will **not** carry over. For a full in-browser scan → flow → publish path, run **one** Next.js deployment on **`synclyst.app`** (root directory `auralink-ai/frontend`) so everything shares the same origin.
