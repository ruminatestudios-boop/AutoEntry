# SyncLyst — App deep dive

A single reference for **how the app works**, **what’s missing**, and **what can be improved** so you can get it live and iterate.

---

## 1. Features and logic

### 1.1 High-level architecture

| Layer | Role |
|-------|------|
| **Frontend** | Static HTML (landing, flow-2, flow-3, batch, connect) + Next.js (dashboard, upgrade, terms, privacy). |
| **Backend (port 8000)** | Vision extract, product CRUD, “Save as draft” (from-extraction), usage/quota, optional Clerk. |
| **Publishing (port 8001)** | Auth (dev-token, Shopify OAuth), create listing, publish to Shopify (and later TikTok/eBay/etc.). |

Two separate “draft” systems:

- **Backend** — `POST /api/v1/products/from-extraction`: creates a row in `universal_products` (Supabase). Used by landing “Save as draft” and dashboard upload.
- **Publishing** — `POST /api/listings`: creates a row in `listings` (Supabase or in-memory dev store). Used when user clicks “Publish to Shopify” from flow-3 or batch review.

Flow-3 **does not** call the backend to create a product. It builds `universal_data` in the browser and sends it only to the **publishing** service (create listing → publish).

---

### 1.2 Single-item flow (scan → review → publish)

1. **Landing** (`landing.html`)
   - User opens “Scan your first item” or `?mode=scan`.
   - Camera or file upload → image sent to **backend** `POST /api/v1/vision/extract`.
   - Result shown; optional “Save as draft” → **backend** `POST /api/v1/products/from-extraction` (creates product in backend DB).
   - “Continue to review” → stores extraction in `sessionStorage` (e.g. `auralink_draft`) and redirects to **flow-2**.

2. **Flow-2** (`flow-2.html`)
   - Reads draft from sessionStorage, lets user pick “Where to sell” (Shopify, etc.), then redirects to **flow-3** with same draft context.

3. **Flow-3** (`flow-3.html`)
   - Loads draft from sessionStorage, builds/edits listing (title, price, description, image, etc.).
   - “Publish to Shopify”:
     - Gets JWT from `sessionStorage.auralink_jwt` (from dev-token or after Shopify connect).
     - Checks **publishing** `GET /api/user/connected-stores`; if Shopify not connected → redirect to `/connect-store?return=flow-3`.
     - **Publishing** `POST /api/listings` with `universal_data` → returns `listing_id`.
     - **Publishing** `POST /api/listings/publish` with `listing_id` and `platforms: ['shopify']` → product created in Shopify.
   - Success → redirect to `flow-success.html`.

So: **extract** and **Save as draft** use the **backend**; **create listing** and **publish to Shopify** use the **publishing** service only.

---

### 1.3 Batch flow

1. **flow-batch-upload** — User uploads multiple images; optional “Add more to batch” sets `auralink_batch_add_more` and merges into existing batch.
2. **flow-batch** — For each image, calls backend `POST /api/v1/vision/extract`; stores each result; then redirects to **flow-batch-review**.
3. **flow-batch-review** — Grid of cards (one per item); user can edit each, select which to publish. “Publish selected to Shopify”:
   - Same pattern as flow-3: get JWT, ensure Shopify connected, then for each selected item: **publishing** `POST /api/listings` → `POST /api/listings/publish`.
   - All succeed → redirect to `flow-success.html`.

---

### 1.4 Connect Shopify (`/connect-store`)

- User enters store domain (e.g. `your-store`).
- Page calls **publishing** `GET /auth/dev-token` to get a JWT and `user_id` (in dev: in-memory user `dev-local` if Supabase not set).
- Redirects to **publishing** `GET /auth/shopify?shop=...&user_id=...&return_to=...`. Publishing service redirects to Shopify OAuth; after approval, callback stores token (Supabase or dev in-memory) and redirects back to frontend (`flow-3.html` or `flow-batch-review.html`) with `?shopify=connected&shop=...`.
- Frontend stores JWT in `sessionStorage.auralink_jwt` when dev-token is used; after OAuth the redirect page may need to re-fetch dev-token to get a JWT for the same user (currently the connect flow gets token before redirect and stores it, so it’s there when they land back).

---

### 1.5 Dashboard (Next.js)

- **Dashboard** — Clerk-protected; shows products from **backend** (`/api/v1/products`), scan usage, connected stores (if wired to publishing).
- **Upload** — Can send extraction payload to **backend** `POST /api/v1/products/from-extraction` (“Save as draft”).
- **Upgrade** — Placeholder for Stripe; no real payments yet.
- **Terms / Privacy** — Static pages; landing uses modals with same content.

Dashboard products and “Save as draft” on landing both create rows in the **backend** `universal_products` table. The **static flow** (flow-3 / batch) never writes to that table; it only uses **publishing** listings. So:

- **Backend products** = from “Save as draft” (landing or dashboard) or dashboard create.
- **Publishing listings** = from flow-3 or batch “Publish to Shopify” (create + publish in one go).

---

### 1.6 Auth and tokens

- **Publishing**  
  - **Dev:** `GET /auth/dev-token` returns JWT (sub = dev user id). No auth required.  
  - **Prod:** Intended to use a real auth provider; JWT would be issued after sign-in.  
  - Protected routes use `Authorization: Bearer <token>`; middleware reads `req.userId` from JWT.

- **Backend**  
  - **Optional Clerk:** If `CLERK_SECRET_KEY` is set, some routes (e.g. products, usage) require Clerk JWT.  
  - **from-extraction** can be optional-auth depending on config; landing often calls it without auth.

- **Static pages** (flow-3, batch, connect) get a JWT from **publishing** dev-token and store in `sessionStorage`. No Clerk on these pages; they rely on publishing’s JWT for create/publish and for Shopify OAuth (user_id in query).

---

## 2. What’s missing (behavior / logic)

- **Unified identity**  
  Backend (Clerk) and publishing (JWT from dev-token or future auth) are not the same user. So “Save as draft” on landing may create a backend product with no user, while “Publish to Shopify” uses publishing’s user. For paid launch you need one notion of “user” and quota tied to it.

- **Draft persistence on static flow**  
  flow-2/flow-3 rely on `sessionStorage`. If the user closes the tab or loses the tab, the draft is gone. No “resume draft” or “my drafts” on the static flow.

- **Backend vs publishing drafts**  
  “Save as draft” (backend) and “Publish to Shopify” (publishing) are separate. There is no “draft in backend → send to publishing and publish” path from the UI; flow-3 builds from sessionStorage and talks only to publishing.

- **Usage/quota on static flow**  
  Landing scan may call backend usage endpoints; if Clerk is required there, unauthenticated scan might fail or not be counted. Need a clear rule: unauthenticated = 3 scans then block, or require sign-in first.

- **Publishing without Supabase**  
  With no `SUPABASE_URL` in publishing, tokens and listings are in-memory (dev store). Restart wipes them. For production, publishing must use Supabase (or another DB) so tokens and listings persist.

- **Shopify OAuth return and JWT**  
  After Shopify callback, user lands on flow-3 or batch with `?shopify=connected`. They already have a JWT from before redirect (from dev-token). If you later switch to “real” auth, the return flow must issue a JWT for the same user and store it so “Publish to Shopify” works.

- **Batch “Add more”**  
  “Add more to batch” merges into the current list and continues; after publish, there’s no automatic “clear batch” or “start new batch” — user goes to success then can start again. Fine; just no saved “batches” in DB.

- **Error handling**  
  Many `alert()` messages and generic “Couldn’t reach the publishing service”. No retry, no structured error codes, no in-UI error state for “Shopify rate limit” or “invalid image”.

- **Validation**  
  flow-3 and batch build `universal_data` in the client; publishing accepts it. No shared schema or server-side validation (beyond what publishing does); invalid payloads could cause 500 or odd Shopify errors.

- **Stripe + paywall**  
  Stripe and paywall are not implemented. Upgrade page is placeholder; backend usage/extract don’t yet enforce a paid plan.

- **Clerk on static flow**  
  Landing, flow-2, flow-3, batch are static HTML and don’t use Clerk. So “log in” for quota or “claim draft” is via dashboard, not in-flow.

- **Listing quality / readiness**  
  flow-3 has a “listing quality” score and tips; it’s client-side only and doesn’t block publish. No server-side “ready to publish” check.

---

## 3. What can be improved

### 3.1 UX and flows

- **Unified “drafts”**  
  Either: (a) make “Save as draft” on landing also create a draft in publishing (and then “Publish” from flow-3 loads that), or (b) add a “My drafts” on static flow that reads from publishing (or backend) so users can resume.

- **Clear CTA after scan**  
  After extract, make the two paths obvious: “Save as draft” (backend) vs “Continue to review & publish” (flow-2 → flow-3 → publishing). Optionally, “Save as draft” could redirect to dashboard with that product highlighted.

- **Connect store earlier**  
  Optionally prompt for “Connect Shopify” at the start of flow-2 or when entering flow-3, so by the time they click “Publish” the token is already there and the flow doesn’t redirect mid-step.

- **Success page**  
  flow-success could show: link to Shopify admin for the product, “Create another” and “Go to dashboard”, and (when implemented) “Upgrade” if they’re on free tier.

- **Batch**  
  After “Publish selected”, show a short summary (e.g. “3 of 3 published”) and then “Start new batch” vs “Back to home”. Clear any in-memory batch state when starting new batch.

### 3.2 Errors and robustness

- **Structured errors**  
  Backend and publishing could return `{ code, message, retryable }` so the frontend can show specific messages and optional “Retry”.

- **Offline / unreachable**  
  If backend or publishing is unreachable, show a clear message (“Check your connection” / “Service temporarily unavailable”) instead of a generic fetch error.

- **Validation**  
  Publish payload (e.g. title, price, image) validated on publishing before calling Shopify; return 400 with field errors so flow-3 can highlight fields.

- **Loading states**  
  Disable buttons and show “Publishing…” (or “Saving…”) consistently on all publish and save actions so users don’t double-submit.

### 3.3 Auth and config

- **One user model**  
  Plan for Clerk (or your chosen auth) to be the source of truth; publishing accepts a JWT from the same provider or a token issued by your backend after Clerk sign-in, so backend products and publishing listings share the same user id.

- **Env and URLs**  
  Static HTML uses `<meta name="auralink-publishing-url">` and similar; in production these should be set from env at build time (e.g. Next.js env or a small config endpoint) so you don’t ship localhost.

- **Dev-token in production**  
  Disable or restrict `GET /auth/dev-token` in production (e.g. only if `NODE_ENV=development` or a dedicated flag) so production always uses real auth.

### 3.4 Performance and scale

- **Images**  
  Extract sends image bytes to the backend; for batch, multiple sequential extracts. Consider resizing/compression on the client for large images and (later) parallel or queued extract for batch.

- **Publish in batch**  
  flow-batch-review publishes selected items one-by-one (create listing then publish per item). For many items, consider a batch publish API that accepts multiple `universal_data` and returns per-item success/failure.

### 3.5 Code and maintainability

- **Shared types**  
  `universal_data` shape is defined in the frontend and used by publishing. A shared schema (e.g. JSON Schema or TypeScript types in a shared package) would reduce drift and make validation easier.

- **Feature flags**  
  “Publish to Shopify” vs “Publish to TikTok” etc. could be driven by publishing’s enabled platforms; UI already uses this. Keep a single source of truth for “what’s enabled”.

- **Tests**  
  Add a few critical-path tests: extract → from-extraction (backend), create listing → publish (publishing), and optionally E2E for landing → flow-3 → publish with a test store.

---

## 4. Quick reference: who does what

| Action | Service | Endpoint / note |
|--------|---------|------------------|
| Scan (extract) | Backend | `POST /api/v1/vision/extract` |
| Save as draft (landing/dashboard) | Backend | `POST /api/v1/products/from-extraction` |
| Get JWT (dev) | Publishing | `GET /auth/dev-token` |
| Connect Shopify | Publishing | `GET /auth/shopify?shop=...&user_id=...` |
| Create listing | Publishing | `POST /api/listings` (body: `universal_data`) |
| Publish to Shopify | Publishing | `POST /api/listings/publish` (body: `listing_id`, `platforms`) |
| Connected stores | Publishing | `GET /api/user/connected-stores` (Bearer JWT) |
| Dashboard products | Backend | `GET /api/v1/products` (Clerk when enabled) |
| Usage / quota | Backend | Usage endpoints; enforce after Stripe + paywall |

---

Use this doc together with **LAUNCH-CHECKLIST.md** for deployment and **API-ARCHITECTURE.md** for API details. After CORS, deploy (frontend, backend, publishing), Supabase, env, and Shopify URLs (checklist steps 1–11), the app can go live for free users; steps 12–14 add auth and paid launch.
