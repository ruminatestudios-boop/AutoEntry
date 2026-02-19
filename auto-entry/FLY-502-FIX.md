# Fly 502 fix (Feb 2025)

**Want to switch hosts?** You can deploy the same app to **Railway** instead; see **`DEPLOY-RAILWAY.md`** for step-by-step. The app uses a single production start script and Dockerfile that work on Fly, Railway, or Render.

## "Machine still active, refusing to start" [PM07]

If logs show **`failed to change machine state: machine still active, refusing to start`**, Fly thinks the machine is already running and won’t start a new one. Clear it and redeploy:

```bash
# List machines (note the IDs)
fly machine list --app auto-entry

# Destroy all machines so Fly can start fresh (or destroy a specific ID)
fly machine destroy --app auto-entry --force
# Or destroy one: fly machine destroy <machine-id> --app auto-entry

# Redeploy (creates a new machine)
fly deploy --app auto-entry
```

Then check https://auto-entry.fly.dev/ and run `fly logs` again. You should now see `[start]` lines and any real startup error (prisma, server crash, etc.).

---

## Cause (original 502: process crash)

The app was crashing on Fly because **@google-cloud/vision** uses **gRPC** native binaries. On **Alpine** (`node:18-alpine`) those binaries are built for **glibc**; Fly’s Alpine environment uses **musl**, so loading the Vision client caused `MODULE_NOT_FOUND` and the process exited before the HTTP server could listen → **502**.

## Changes made

1. **Dockerfile**
   - Base image switched from `node:18-alpine` to **`node:20-bookworm-slim`** (Debian/glibc) so gRPC’s prebuilt binaries work.
   - Installed `openssl` and `ca-certificates` via apt.

2. **`app/core/services/ai.service.ts`**
   - **Lazy-load** the Vision client: no top-level `import "@google-cloud/vision"`. A `getVisionClient()` helper does `await import("@google-cloud/vision")` only when OCR is needed.
   - If the Vision client fails to load (e.g. wrong image in future), the app still starts and OCR is skipped; Gemini continues without OCR.

## What you do

1. **Redeploy**
   ```bash
   cd /path/to/auto-entry
   fly deploy
   ```

2. **Check**
   - Open https://auto-entry.fly.dev/
   - If you still get 502, run `fly logs` and look for the first error (e.g. `DATABASE_URL`, missing secret, or another module).

3. **Database**
   - Ensure `DATABASE_URL` is set on Fly and points at a writable path (e.g. `file:/data/sqlite.db` if you use the `/data` volume). `prisma migrate deploy` runs at startup and will fail if the DB is missing or unwritable.

4. **Get the actual error**
   - After deploying, run: `fly logs --app auto-entry`
   - You should see `[start] Vision credentials...`, `[start] Setup...`, then `[start] Starting server...`. The line after the last one that appears is where it failed (e.g. "Setup failed" = prisma/DATABASE_URL; server crash = stack trace).
