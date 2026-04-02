# Deploy Auto Entry to Google Cloud Run

Production is intended to run from the same **Dockerfile** as Fly/Railway. Cloud Run injects **`PORT`** and (when running on Cloud Run) **`K_SERVICE`**.

## After deploy: URL + Shopify (three commands)

The repo starts with placeholder host `auto-entry-pending-uc.a.run.app`. Once Cloud Run shows a real URL (console or below), run:

**1. Put the URL into the repo** (replaces the placeholder in all `shopify.app*.toml` + related docs):

```bash
cd auto-entry
npm run cloud-run:set-url -- https://YOUR-SERVICE-xxxxx-uc.a.run.app
```

(From repo root: `npm run cloud-run:set-url -- https://…` — same thing.)

**2. Set the app URL on the Cloud Run service** (same origin, no trailing slash):

```bash
gcloud run services update SERVICE_NAME --region REGION \
  --update-env-vars SHOPIFY_APP_URL=https://YOUR-SERVICE-xxxxx-uc.a.run.app
```

Use your real service name and region. If `SHOPIFY_APP_URL` already exists, `--update-env-vars` merges; or set it in **Cloud Run → Edit revision → Variables**.

**3. Push app config to Shopify Partners** (must be logged in: `shopify auth login`):

```bash
cd auto-entry && npm run deploy:partners
```

**Get the URL from the CLI** (optional):

```bash
gcloud run services describe SERVICE_NAME --region REGION --format='value(status.url)'
```

## 1. Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- A GCP project with **Cloud Run** and **Artifact Registry** (or Container Registry) enabled
- Billing enabled (Cloud Run has a free tier; still requires a billing account on most projects)

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## 2. Build and push the image

From the **repository root** (or adjust paths), build from `auto-entry`:

```bash
cd auto-entry
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/REPO/auto-entry:latest .
```

Replace `REGION`, `PROJECT_ID`, and `REPO` with your Artifact Registry repository (create one in the console if needed).

## 3. Deploy to Cloud Run

```bash
gcloud run deploy auto-entry \
  --image REGION-docker.pkg.dev/PROJECT_ID/REPO/auto-entry:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --set-env-vars "NODE_ENV=production"
```

**Secrets:** Prefer **Secret Manager** for `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, `SERPAPI_API_KEY`, etc., and mount them as env vars in the service. Do not commit secrets.

Set at least:

| Variable | Notes |
|----------|--------|
| `SHOPIFY_APP_URL` | Full `https://` URL of **this** Cloud Run service (must match Partners / `shopify.app.auto-entry.toml`). |
| `SHOPIFY_API_KEY` | From Shopify Partners. |
| `SHOPIFY_API_SECRET` | From Shopify Partners. |
| `SCOPES` | e.g. `write_inventory,write_products` |
| `DATABASE_URL` | See **Database** below. |

**Do not set `PORT` manually** — Cloud Run sets it. The app listens on `0.0.0.0:$PORT` via `scripts/production-start.cjs`.

## 4. Database (SQLite vs Cloud SQL)

Default **SQLite** on a single container works for demos, but Cloud Run can run **multiple instances** and the filesystem is **ephemeral** unless you attach storage.

- **Testing:** You may rely on the default `file:/app/data/sqlite.db` (data can be lost on redeploys/scaling).
- **Production:** Use **Cloud SQL for PostgreSQL** (or MySQL), change `prisma/schema.prisma` `provider`, run migrations, and set `DATABASE_URL` to the Cloud SQL connection string. Alternatively explore [Cloud Run volume mounts](https://cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts) for advanced setups.

You can also set `DATA_MOUNT_PATH` (or legacy `RAILWAY_VOLUME_MOUNT_PATH`) to a mounted path so `production-start.cjs` uses `file:{mount}/sqlite.db`.

## 5. Point Shopify at Cloud Run

After the real URL is in `shopify.app.auto-entry.toml` and env vars:

```bash
cd auto-entry && npm run deploy:partners
```

Confirm in **Shopify Partners** → your app → **App setup**: App URL and redirect URLs match your Cloud Run URL.

## 6. Optional: CI/CD

Use **Cloud Build** triggers on `main` to run `gcloud builds submit` and `gcloud run deploy`, or connect **Cloud Run** to deploy from Artifact Registry on push.

---

**Railway:** See `DEPLOY-RAILWAY.md` only if you still use Railway; production URLs in the repo are now oriented toward **Cloud Run** (`*.a.run.app` placeholder).
