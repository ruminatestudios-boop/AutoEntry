# Deploy this folder on Vercel (SyncLyst)

If `synclyst.app` shows **404** on `/dashboard`, `/sign-in`, etc., the project is almost certainly **not** building Next.js.

## Required Vercel settings

1. **Root Directory:** `auralink-ai/frontend` (exact path from repo root).
2. **Framework preset:** Next.js (auto-detected after root is set).
3. **Do not** use a repo-root `vercel.json` that sets `framework: null` or an empty `buildCommand` — that turns the deploy into a static dump and **all App Router routes 404**.

## Env vars

See `auralink-ai/frontend/.env.example` and `auralink-ai/LAUNCH-CHECKLIST.md`.

At minimum: Clerk keys; backend URL as `NEXT_PUBLIC_API_URL` **or** `AURALINK_BACKEND_URL` (mapped in `next.config.ts`).
