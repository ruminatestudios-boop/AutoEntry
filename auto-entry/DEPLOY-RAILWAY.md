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

1. In your service, click **+ New** → **Volume** (or **⌘K** → "Add volume", then attach to your app service).
2. Set **Mount Path** to whatever Railway allows (e.g. `/data`, `/app/data`, or the default). The app uses Railway’s `RAILWAY_VOLUME_MOUNT_PATH` and will put the DB at `{mountPath}/sqlite.db` if `DATABASE_URL` is not set.
3. This is where the SQLite file will live so it persists across deploys.

---

## 3. Set environment variables

**Required:** The app will not start without `SHOPIFY_APP_URL`. Set it to your Railway public URL (e.g. `https://your-app.up.railway.app`). If you don’t have the URL yet, do a first deploy, then create a **Public Domain** in Settings → Networking, set `SHOPIFY_APP_URL` to that URL, and redeploy.

In the service → **Variables**, add:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | **Do not set** – Railway injects this at runtime (e.g. 8080). If you set PORT=3000, the app may listen on 3000 while Railway’s proxy expects another port → "Application failed to respond". |
| `DATABASE_URL` | Optional if you attach a volume: the app uses `RAILWAY_VOLUME_MOUNT_PATH` and sets `file:{mountPath}/sqlite.db`. Otherwise set e.g. `file:/data/sqlite.db` to match your volume mount path. |
| `SHOPIFY_APP_URL` | Your Railway URL **with https://** (e.g. `https://auto-entry-app-production-ce97.up.railway.app`) – required for OAuth and redirects. |
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

### "Application failed to respond" (deploy shows success but URL returns error)

Usually the proxy can’t reach your app because it’s listening on the wrong port.

1. **Remove `PORT` from Variables** – Railway injects `PORT` at runtime (often 8080). If you set `PORT=3000`, the app listens on 3000 but the proxy forwards to Railway’s port → no response. Delete the `PORT` variable, redeploy, and let Railway set it.
2. **Set `SHOPIFY_APP_URL` with `https://`** – Use the full URL, e.g. `https://auto-entry-app-production-ce97.up.railway.app`, not just the hostname.
3. **Check Deploy Logs** – In the deployment → **Deploy Logs**, look for `[start] PORT: 8080` (or whatever Railway injects) and any errors after `Starting server...` (e.g. Prisma, remix-serve crash). Fix any missing env (e.g. `DATABASE_URL`, volume at `/data`).

---

## Other providers

**Render** and **Heroku** can run the same setup: use the existing **Dockerfile** and set the start command to `npm run docker-start`. Add a persistent disk (Render) or Heroku Postgres (and switch Prisma to `postgresql`) and set the same env vars. **Vercel** is possible but requires switching to a serverless-friendly database (e.g. Vercel Postgres); SQLite on serverless is not recommended.
