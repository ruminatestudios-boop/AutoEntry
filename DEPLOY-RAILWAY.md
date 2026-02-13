# Deploy Auto Entry to Railway (alternative to Fly)

Use this if you want to switch from Fly.io to Railway to avoid 502 or for a simpler deploy. Railway runs your existing Dockerfile and supports SQLite on a volume.

---

## 1. Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in (GitHub is easiest).
2. **New Project** → **Deploy from GitHub repo**.
3. Select your **AutoEntry** repo (or the repo that contains the `auto-entry` app).
4. If the app lives in a subfolder (e.g. `auto-entry`), set **Root Directory** to `auto-entry` in the service settings.
5. Railway will detect the **Dockerfile** and use it to build and run.

---

## 2. Add a volume (for SQLite)

1. In your service, click **+ New** → **Volume**.
2. Set **Mount Path** to `/data`.
3. This is where the SQLite file will live so it persists across deploys.

---

## 3. Set environment variables

**Required:** The app will not start without `SHOPIFY_APP_URL`. Set it to your Railway public URL (e.g. `https://your-app.up.railway.app`). If you don’t have the URL yet, do a first deploy, then create a **Public Domain** in Settings → Networking, set `SHOPIFY_APP_URL` to that URL, and redeploy.

In the service → **Variables**, add:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (Railway usually sets this; add if missing) |
| `DATABASE_URL` | `file:/data/sqlite.db` |
| `SHOPIFY_APP_URL` | Your Railway URL **after first deploy** (e.g. `https://auto-entry-production.up.railway.app`) |
| `SHOPIFY_API_KEY` | From Partners (same as Fly) |
| `SHOPIFY_API_SECRET` | From Partners (same as Fly) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Your Gemini API key |
| `SCOPES` | `write_inventory,write_products` |
| `GOOGLE_APPLICATION_CREDENTIALS` | `/tmp/vision-credentials.json` |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | (Optional) Your GCP Vision key JSON or base64, for OCR |

For the first deploy you can set `SHOPIFY_APP_URL` to a placeholder (e.g. `https://placeholder.railway.app`). After the first deploy, Railway will show a public URL; set **Variables** → `SHOPIFY_APP_URL` to that URL (e.g. `https://your-app.up.railway.app`) and redeploy.

---

## 4. Deploy

**Do not set a custom Start Command** in Railway. Leave **Start Command** / **Custom Start** / **Override** empty so the **Dockerfile** `CMD` is used (`npm run docker-start`). If you set it to something like `HOST=0.0.0.0 npm run docker-start`, Railway may treat `host=0.0.0.0` as the executable and fail with "The executable \`host=0.0.0.0\` could not be found."

1. Push your code or trigger **Deploy** in Railway.
2. Wait for the build to finish. The Dockerfile runs `npm run build` then at runtime `npm run docker-start` (vision credentials → prisma migrate → remix-serve).
3. Open the **Settings** tab and under **Networking** / **Public Networking** generate a **Public Domain** (e.g. `auto-entry-production.up.railway.app`).
4. Set **Variables** → `SHOPIFY_APP_URL` to that URL (with `https://`) and redeploy once so the app knows its own URL.

---

## 5. Point Shopify at Railway

1. In **shopify.app.toml** (and any config you use for production), set:
   - `application_url` = your Railway URL (e.g. `https://your-app.up.railway.app`)
   - `auth.redirect_urls` = `[ "https://your-app.up.railway.app/api/auth" ]`
2. In **Shopify Partners** → your app → **App setup** (or **URLs**), set the App URL and Allowed redirection URL(s) to the same Railway URL.
3. Run `shopify app deploy` if you use the CLI to push config, or update the URLs manually in Partners.

---

## 6. Check the app

- Open `https://your-app.up.railway.app` in a browser. You should see a redirect to Shopify or the app.
- In the Shopify admin, open your app; it should load from Railway and show your latest design.

---

## Differences from Fly

- **No fly.toml** – Railway uses the Dockerfile and dashboard settings.
- **Volume** – Railway volume at `/data` replaces Fly’s `[[mounts]]`; `DATABASE_URL=file:/data/sqlite.db` is the same.
- **Secrets** – Set in Railway **Variables** instead of `fly secrets set`.
- **Logs** – View in the Railway dashboard under your service → **Deployments** → select a deployment → **View Logs**. You’ll see `[start]` lines from `production-start.cjs`.

If something fails, check the logs for `[start] DATABASE_URL:`, `[start] Setup...`, and `[start] Starting server...` to see which step failed.

---

## Troubleshooting

### "The executable \`host=0.0.0.0\` could not be found"

Railway is using a **custom start command** that begins with `HOST=0.0.0.0`. It runs that without a shell, so the first word is treated as the program name.

**Fix:** In Railway → your **service** → **Settings** (or **Deploy** / **Build**), find **Start Command**, **Custom Start Command**, or **Override Command**. **Clear it** (leave it empty) so Railway uses the **Dockerfile** `CMD` instead: `npm run docker-start`. Then **Redeploy**.

---

## Other providers

**Render** and **Heroku** can run the same setup: use the existing **Dockerfile** and set the start command to `npm run docker-start`. Add a persistent disk (Render) or Heroku Postgres (and switch Prisma to `postgresql`) and set the same env vars. **Vercel** is possible but requires switching to a serverless-friendly database (e.g. Vercel Postgres); SQLite on serverless is not recommended.
