# Shopify staging: edit live, push to production later

Use **staging** to see changes in the Shopify admin as you edit. When you’re happy, **push to production** (Railway).

---

## Staging (live edits in Shopify)

1. **Start the dev server** (leave it running):
   ```bash
   cd /Users/pritesh/Documents/GitHub/AutoEntry/auto-entry
   npm run dev
   ```
2. Wait until the CLI prints a **URL** (e.g. `https://xxxx.ngrok-free.app`).
3. **Open the app in your dev store:** Apps → **Auto Entry** (or use the link from the CLI).
4. If you see **“dev previews”** (e.g. bottom-right in the admin), select the preview that matches the URL from step 2.
5. **Edit your code** in Cursor — Remix/Vite will hot-reload. Refresh the app in the Shopify admin to see changes.

You’re now in **staging**: the app in the admin is served from your laptop. Edits are live here only.

---

## Production (after you’re happy)

When you want the same version live for everyone:

1. Stop making changes and **commit + push**:
   ```bash
   cd /Users/pritesh/Documents/GitHub/AutoEntry/auto-entry
   git add .
   git commit -m "Your message"
   git push origin main
   ```
2. **Railway** will deploy from `main`. Once the deploy finishes, production (e.g. `https://auto-entry-app-production-4dda.up.railway.app`) will show the new version.
3. In **Shopify Partners**, your app URL and redirect URLs should point at that production URL so the installed app uses production.

---

## Summary

| Mode        | How                          | Where you see it                    |
|------------|-------------------------------|-------------------------------------|
| **Staging**   | `npm run dev` (local + tunnel) | Shopify admin → dev preview URL     |
| **Production** | `git push origin main` → Railway | Live app URL (e.g. Railway) + admin |

Use staging to edit and preview in Shopify; use push to ship to production.
