# Deploy Auto Entry to production

Your production app runs on **Railway** at:
`https://auto-entry-app-production-4dda.up.railway.app`

---

## Deploy steps

### 1. Commit and push (triggers Railway)

From the **auto-entry** folder:

```bash
cd /Users/pritesh/Documents/GitHub/AutoEntry/auto-entry

# If you have new changes:
git add .
git commit -m "Describe your changes"
git push origin main
```

If everything is already committed, just run:

```bash
git push origin main
```

Railway will build and deploy from `main`. Wait a few minutes, then check the deploy in the [Railway dashboard](https://railway.app).

### 2. (Optional) Sync app config to Shopify Partners

If you changed `shopify.app.toml` or app URLs:

```bash
npm run deploy
```

This runs `shopify app deploy` and updates your app’s URLs in Shopify Partners. Your production URL is already set to the Railway URL in `shopify.app.toml`.

### 3. Run migrations on production (if needed)

Railway runs `prisma migrate deploy` at startup (in `scripts/production-start.cjs`), so new migrations (e.g. `createdAt` on ScannedProduct) are applied automatically on each deploy. No extra step unless you see DB errors in logs.

---

## Checklist

- [ ] Code committed and pushed to `main`
- [ ] Railway deploy finished (check dashboard)
- [ ] Env vars on Railway: `SHOPIFY_APP_URL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, `DATABASE_URL` (or volume for SQLite)
- [ ] Shopify Partners: App URL = your Railway URL

More detail: **DEPLOY-RAILWAY.md** and **STAGING.md**.
