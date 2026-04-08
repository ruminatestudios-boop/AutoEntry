# Deploy SyncLyst Publishing API to Google Cloud Run

This is the service that handles **Publish to Shopify** (OAuth, listings, publish). Deploy it to the same Google Cloud project as your backend so synclyst.app can call it.

## Prerequisites

- Same GCP project as your backend (e.g. `intrepid-axle-489519-u6`)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and logged in: `gcloud auth login`

## 1. Use the same project and region as the backend

```bash
# Set your project and region (match your backend)
export PROJECT_ID=intrepid-axle-489519-u6
export REGION=us-central1
```

APIs (Run, Artifact Registry, Cloud Build) should already be enabled from the backend deploy.

## 2. Build and deploy the publishing service

From the **monorepo root** (SyncLyst):

**One command (same as below):** from `auralink-ai/publishing`, run `./scripts/deploy-cloud-run.sh` (optional env: `GCP_PROJECT_ID`, `GCP_REGION`, `CLOUD_RUN_SERVICE`).

```bash
cd auralink-ai/publishing

gcloud run deploy synclyst-publishing \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --project intrepid-axle-489519-u6
```

- Accept the default when asked for the container image (Artifact Registry).
- After deploy, note the **service URL** (e.g. `https://synclyst-publishing-xxxxx-uc.a.run.app`).

## 3. Set environment variables

In [Cloud Console](https://console.cloud.google.com/run) → select service **synclyst-publishing** → **Edit & deploy new revision** → **Variables & secrets**:

Add at least:

| Variable | Example / notes |
|----------|------------------|
| **APP_URL** | Your publishing service URL, e.g. `https://synclyst-publishing-xxxxx-uc.a.run.app` (no trailing slash). Required for Shopify OAuth redirects. |
| **FRONTEND_URL** | `https://synclyst.app,https://www.synclyst.app` (CORS + redirect after OAuth) |
| **JWT_SECRET** | Any long secret (min 32 chars); same as or different from backend. Used to verify SyncLyst user tokens. |
| **SHOPIFY_API_KEY** | Your Shopify app **Client ID** from [Partners](https://partners.shopify.com) |
| **SHOPIFY_API_SECRET** | Your Shopify app **Client secret** |
| **TOKEN_ENCRYPTION_KEY** | At least 32 characters; used to encrypt Shopify tokens at rest |
| **SUPABASE_URL** | Your Supabase project URL, e.g. `https://xxxx.supabase.co` |
| **SUPABASE_SERVICE_KEY** | Use the **Legacy service_role** key: Supabase Dashboard → Settings → API → tab **"Legacy anon, service_role API keys"** → copy **service_role** (long JWT). Do not use the new `sb_secret_` key here; the client library works best with the Legacy key. |

**ENABLED_PLATFORMS** defaults to `shopify`; leave it unless you enable more.

Then click **Deploy** (new revision) so the variables take effect.

## 4. Update Shopify app redirect URL

In [Shopify Partner Dashboard](https://partners.shopify.com) → your app → **App setup** → **URLs**:

- **Redirect URL:**  
  `https://YOUR-PUBLISHING-URL/auth/shopify/callback`  

Example: `https://synclyst-publishing-xxxxx-uc.a.run.app/auth/shopify/callback`

Save.

## 5. Point synclyst.app at the publishing service

In your repo, set the production publishing URL in the flow-3 pages so the frontend calls this Cloud Run service instead of `synclyst.app:8001`:

**Option A – Edit the HTML (then commit and push)**

In **flow-3.html** and **auralink-ai/frontend/public/flow-3.html**, set the meta tag to your deployed URL:

```html
<meta name="synclyst-publishing-url" content="https://synclyst-publishing-xxxxx-uc.a.run.app" />
```

Replace `synclyst-publishing-xxxxx-uc.a.run.app` with the actual URL from step 2 (no trailing slash).

**Option B – From CLI**

```bash
# After deploy, get the URL
gcloud run services describe synclyst-publishing --region us-central1 --format='value(status.url)' --project intrepid-axle-489519-u6
```

Use that value in the meta tag above, then commit, push, and let Vercel redeploy.

## 6. Verify

1. **Health:** Open `https://YOUR-PUBLISHING-URL/health` in a browser → `{"status":"ok","service":"synclyst-publishing-api"}`.
2. **synclyst.app:** Run the flow (scan → review → **Publish to Shopify**). It should call your Cloud Run publishing service; if the store is connected, the listing is sent as draft to Shopify.

## Optional: deploy from GitHub (CI/CD)

- [Cloud Build triggers](https://console.cloud.google.com/cloud-build/triggers) → New trigger → Connect repo.
- Build config: set **Source** to the SyncLyst repo; set **Dockerfile** path to `auralink-ai/publishing/Dockerfile`; set **Output** to Artifact Registry.
- Add a trigger that deploys to Cloud Run (e.g. on push to `main`) for the **synclyst-publishing** service.
