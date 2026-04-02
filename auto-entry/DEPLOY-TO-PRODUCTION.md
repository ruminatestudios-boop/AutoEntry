# Deploy to production (Google Cloud Run)

Your production app should run on **Google Cloud Run**. The repo uses a **placeholder URL** until you deploy:

`https://auto-entry-pending-uc.a.run.app`

Replace that host everywhere (see **`DEPLOY-CLOUD-RUN.md`**) with your real Cloud Run URL, then sync Shopify Partners.

### 1. Build and deploy Cloud Run

Follow **`DEPLOY-CLOUD-RUN.md`** (Artifact Registry image + `gcloud run deploy`).

### 2. Update Shopify app config

1. Replace the placeholder host in the repo (all TOMLs + docs):  
   `npm run cloud-run:set-url -- https://YOUR-REAL-HOST.a.run.app`  
   (See **`DEPLOY-CLOUD-RUN.md`** for the full sequence.)
2. Set **`SHOPIFY_APP_URL`** on the Cloud Run service to the same URL (`gcloud run services update … --update-env-vars SHOPIFY_APP_URL=…`).
3. From `auto-entry`:

```bash
npm run deploy:partners
```

Cloud Run runs `prisma migrate deploy` at startup (`scripts/production-start.cjs`), so migrations apply on each new revision unless the database is misconfigured.

### Checklist

- [ ] Cloud Run revision is live and the service URL opens in a browser
- [ ] Env vars on Cloud Run: `SHOPIFY_APP_URL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, AI keys, `DATABASE_URL` (or volume / Cloud SQL)
- [ ] Shopify Partners: App URL matches your Cloud Run URL
- [ ] Placeholder `auto-entry-pending-uc.a.run.app` replaced in TOML files

More detail: **`DEPLOY-CLOUD-RUN.md`**, **`STAGING.md`**, **`COMPLIANCE-WEBHOOKS.md`**.
