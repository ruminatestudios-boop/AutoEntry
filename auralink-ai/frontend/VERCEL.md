# Deploy this folder on Vercel (SyncLyst)

If `synclyst.app` shows **404** on `/dashboard`, `/sign-in`, etc., the project is almost certainly **not** building Next.js.

## Required Vercel settings

1. **Root Directory:** `auralink-ai/frontend` (exact path from repo root).
2. **Framework preset:** Next.js (auto-detected after root is set).
3. **Do not** use a repo-root `vercel.json` that sets `framework: null` or an empty `buildCommand` — that turns the deploy into a static dump and **all App Router routes 404**.

## Env vars

See `auralink-ai/frontend/.env.example` and `auralink-ai/LAUNCH-CHECKLIST.md`.

At minimum: Clerk keys; backend URL as `NEXT_PUBLIC_API_URL` **or** `AURALINK_BACKEND_URL` (mapped in `next.config.ts`).

If `/shopify/launch` 404s after a fix deploy, **Purge Cache** in Vercel (Deployment → … → Invalidate) or redeploy—old **404 responses can be CDN-cached** (`x-vercel-cache: HIT`).

**`vercel.json`** adds an edge **redirect** `/shopify/launch` → `/api/shopify/oauth-start`.
- **Root Directory = `auralink-ai/frontend`** → uses **`auralink-ai/frontend/vercel.json`**.
- **Root Directory = repo root (`.`)** → uses the **repo root** `vercel.json` (same `redirects` only; do not strip the Next build).

If `main` includes these files but `/shopify/launch` still 404s with **`x-clerk-auth-*`** on that path, Production is not serving the latest build: confirm the Vercel Git integration targets **this repo** and **`main`**, check the deployment **commit SHA**, then **Redeploy** (purge cache if needed).
