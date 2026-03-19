# Go-live checklist (easiest → hardest)

Use this list to take SyncLyst from test mode to live for real users. Tick each when done and go in order where possible.

---

## 1. CORS for production (easy)

**What:** Backend must allow requests from your production frontend origin.

**Where:** `auralink-ai/backend/.env` (or your backend host’s env vars).

**Do:**
- Set `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com` (use your real frontend URL).
- If you use Vercel’s default URL first: `CORS_ORIGINS=https://your-project.vercel.app`

**Verify:** After backend is deployed, open your frontend, try a scan; no CORS error in browser console.

---

## 2. Deploy frontend to Vercel (easy)

**What:** Get the app on HTTPS so camera works and you have a public URL.

**Do:**
1. Push code to GitHub (you already do this).
2. Go to [vercel.com](https://vercel.com) → Add New Project → Import your repo.
3. **Root Directory:** set to `auralink-ai/frontend` (not repo root).
4. **Build Command:** `npm run build` (default for Next.js).
5. **Output Directory:** leave default (Next.js).
6. **Avoid:** a `vercel.json` at the **repository root** with `"framework": null` or empty `buildCommand` — Vercel still merges it and you get a static deploy; **`/dashboard/upgrade` and all app routes 404**. Remove that file or fix it (see `auralink-ai/frontend/VERCEL.md`).
7. Add **Environment Variables** (at least for later):
   - `NEXT_PUBLIC_API_URL` = leave empty for now, or set after step 5 (your backend URL).
   - `NEXT_PUBLIC_PUBLISHING_API_URL` = set after step 6 (your publishing URL).
8. Deploy. You get `https://your-project.vercel.app`.

**Verify:** Open the Vercel URL; site loads. Camera still won’t work until backend is reachable; that’s later steps.

---

## 3. Add custom domain on Vercel (easy)

**What:** Serve the app at your own domain (e.g. app.synclyst.app).

**Do:**
1. In Vercel project → **Settings → Domains** → Add your domain.
2. At your domain registrar, add the CNAME (or A record) Vercel shows.
3. Wait for DNS to propagate (minutes to hours).

**Verify:** Open `https://yourdomain.com`; same site as the Vercel URL.

---

## 4. Deploy backend (moderate)

**What:** Run the FastAPI app (extract, usage, products) on a public URL.

**Options:** Railway, Fly.io, Render, or a VPS.

**Do (example: Railway):**
1. Create account at [railway.app](https://railway.app).
2. New Project → Deploy from GitHub → select repo.
3. **Root / Start:** Set root to `auralink-ai/backend`. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (Railway sets `PORT`).
4. Add **Environment Variables** (see step 9 for full list; minimum for extract): `GEMINI_API_KEY`, `CORS_ORIGINS` (your frontend URL).
5. Deploy. Note the public URL (e.g. `https://your-backend.up.railway.app`).

**Verify:** Open `https://your-backend-url/health` → `{"status":"ok",...}`.

---

## 5. Deploy publishing service (moderate)

**What:** Run the Node service (Shopify OAuth, publish) on a public URL.

**Do:** Same idea as backend: new service on Railway/Render/Fly, root `auralink-ai/publishing`, start `npm run dev` or `node src/index.js` (check `publishing/package.json` for `start`). Set `PORT` from host. Add env vars (step 9).

**Verify:** Open `https://your-publishing-url/auth/dev-token` (or `/health` if exists) → JSON response.

---

## 6. Wire frontend to production APIs (easy)

**What:** Frontend must call your deployed backend and publishing service, not localhost.

**Where:** Vercel project → **Settings → Environment Variables**.

**Do:**
- `NEXT_PUBLIC_API_URL` = `https://your-backend-url` (no trailing slash).
- `NEXT_PUBLIC_PUBLISHING_API_URL` = `https://your-publishing-url` (no trailing slash).

Redeploy the frontend (or push a commit) so the build picks up these values.

**Verify:** On your live site, open dashboard or scan; “API: …” should show the production backend URL and “● Connected” if backend is up.

---

## 7. Supabase: project + migrations (moderate)

**What:** Database for drafts, scan quota, and (if used) publishing tokens.

**Do:**
1. Create a project at [supabase.com](https://supabase.com).
2. Get **Project URL** and **Service role key** (Settings → API).
3. Run migrations: in repo, `auralink-ai/supabase/migrations/` — run those SQL files in Supabase SQL Editor (or use Supabase CLI).
4. Minimum tables: `universal_products`, `user_scan_quota`; for publishing, whatever the publishing service expects (see `publishing/src/db/schema.sql` or README).

**Verify:** Backend can connect (step 9); “Save as draft” and usage no longer 503.

---

## 8. Backend .env (production) (easy once you have values)

**Where:** Backend host (Railway/Render/etc.) environment variables.

**Set:**
- `GEMINI_API_KEY` (or `OPENAI_API_KEY` if you use OpenAI).
- `CORS_ORIGINS` = your frontend origin(s).
- `SUPABASE_URL` = Supabase project URL.
- `SUPABASE_SERVICE_KEY` = Supabase service role key.
- Optional: `CLERK_SECRET_KEY` (and `CLERK_PUBLISHABLE_KEY` in frontend) if you want sign-in.
- Optional: `GCP_VISION_CREDENTIALS_JSON` for better OCR.

**Verify:** Health check works; extract works; save draft works (no 503).

---

## 9. Publishing .env (production) (easy)

**Where:** Publishing service host environment variables.

**Set:**
- `APP_URL` = `https://your-publishing-url` (same as the URL you deployed).
- `FRONTEND_URL` = `https://yourdomain.com` (where users land after OAuth).
- `SHOPIFY_API_KEY` = Partner Dashboard → App → API credentials → Client ID.
- `SHOPIFY_API_SECRET` = Client secret.
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` if publishing uses DB for tokens.
- `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` (min 32 chars) for production.

**Verify:** Connect store flow redirects to Shopify and back without 503.

---

## 10. Shopify Partner Dashboard URLs (easy)

**What:** Shopify must redirect to your **production** publishing (or backend) URL after OAuth.

**Do:**
1. [Partners Dashboard](https://partners.shopify.com) → your app → **App setup** (or **URLs**).
2. **App URL:** `https://yourdomain.com` (or your frontend).
3. **Allowed redirection URL(s):** add `https://your-publishing-url/auth/shopify/callback` (if connect uses publishing) or `https://your-backend-url/api/v1/shopify/callback` (if connect uses backend).

**Verify:** On live site, click “Log in to Shopify” / “Connect store” → you go to Shopify → approve → redirect back to your app with “Shopify connected”.

---

## 11. Test full flow on phone (easy)

**What:** Confirm camera, extract, connect, and publish work on a real device.

**Do:**
1. Open your **production** URL on your phone (HTTPS).
2. Go to scan (e.g. “Scan your first item” or `/landing.html?mode=scan`).
3. Use camera or upload photo → extraction runs.
4. Continue to review (flow-3) → Connect store → complete Shopify OAuth.
5. Publish to Shopify → check store for the draft/product.

**Verify:** No CORS or “couldn’t reach server”; camera works (HTTPS); Shopify connect and publish succeed.

---

## 12. Clerk (auth) for production (moderate)

**What:** Optional but recommended for paid users: sign-in before upgrade and per-user quota.

**Do:**
1. [Clerk Dashboard](https://dashboard.clerk.com) → create application (or use existing).
2. Add **Production** instance and set **Sign-in/Sign-up URLs** to your domain.
3. Backend: `CLERK_SECRET_KEY` (and optionally `CLERK_JWKS_URL`).
4. Frontend: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`; protect dashboard/upgrade routes if desired.

**Verify:** Sign-in/sign-up on production domain; backend accepts Clerk JWT for `/api/v1/usage` and extract.

---

## 13. Stripe: products + Checkout (harder)

**What:** Real payments so “Upgrade now” creates a subscription.

**Do:**
1. [Stripe Dashboard](https://dashboard.stripe.com) → Products → create products (e.g. $9/mo, $19/mo).
2. Backend (or a small API): create Stripe Checkout Session with `mode: 'subscription'`, success/cancel URLs, and `client_reference_id` = Clerk user id (or email).
3. Frontend: “Upgrade now” button → call your API to create session → redirect to `session.url`.
4. Stripe **Webhook:** `customer.subscription.created`, `updated`, `deleted` → store subscription status (e.g. in Supabase `user_subscriptions` or similar) keyed by user id.
5. Backend `/api/v1/usage` (or extract): if user has active subscription, return `can_scan: true` or higher limit; else use free quota.

**Verify:** Upgrade → pay with test card → webhook fires → user gets more scans.

---

## 14. Enforce paywall after Stripe (moderate)

**What:** Once Stripe is in place, ensure extract and usage respect subscription.

**Do:**
- In backend, when computing `can_scan` / limit: read subscription from DB (or Stripe) for the current user; if active paid plan, allow scans (or set higher limit).
- Frontend: upgrade page links to Stripe Checkout; after return from Stripe, refresh usage so UI shows updated quota.

**Verify:** Free user hits 3 scans → upgrade page → pay → can scan again. Cancelled subscription → quota enforced again.

---

## Quick reference: env vars by service

| Service    | Key env vars |
|-----------|--------------|
| **Frontend (Vercel)** | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PUBLISHING_API_URL`, optional `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| **Backend**         | `GEMINI_API_KEY`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, optional Clerk, Shopify |
| **Publishing**      | `APP_URL`, `FRONTEND_URL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SUPABASE_*`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY` |

---

## Order summary (tick as you go)

- [ ] 1. CORS for production
- [ ] 2. Deploy frontend to Vercel
- [ ] 3. Add custom domain (optional)
- [ ] 4. Deploy backend
- [ ] 5. Deploy publishing service
- [ ] 6. Wire frontend to production APIs
- [ ] 7. Supabase project + migrations
- [ ] 8. Backend .env (production)
- [ ] 9. Publishing .env (production)
- [ ] 10. Shopify Partner Dashboard URLs
- [ ] 11. Test full flow on phone
- [ ] 12. Clerk for production (optional)
- [ ] 13. Stripe integration
- [ ] 14. Enforce paywall after Stripe

After 1–11 you can go live for **free** users (camera, scan, connect Shopify, publish).  
12–14 are for **paid** launch (sign-in, payments, quota enforcement).
