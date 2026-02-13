# Preview the latest app design in Shopify

**→ For “edit live in Shopify, then push to production”: see [STAGING.md](./STAGING.md).**

## What the latest design looks like (from your code)

- **Header:** Dark teal bar (#1a514d) with "Auto Entry", subtitle, and on the home page: plan info (e.g. "Free Plan · X of 1,000 scans") and a green progress bar, plus "Plans" / "Upgrade" link.
- **Home hero card:** White card with:
  - Left: **"Intelligent Inventory Capturing"** (teal/dark green), tagline "Automate product entry with AI. Fast, accurate, synced to Shopify.", and three numbered steps in green/black:
    - **1** Sync your mobile — scan QR to link.
    - **2** Smart capture — photo, AI extracts data.
    - **3** Review in Shopify when ready.
  - Right: QR code in a light green box, **"Copy URL"** button (green), and "Scan to open" under it.
- **Tabs:** **To Review (n)** | **Drafts (n)** | **View All** with a green underline on the active tab.
- **View toggle:** Grid / list switch (small pill control).
- **Empty state:** "Capture your first product. Scan the QR code with your phone…" and a **"Show QR code"** button.
- **Colors:** Teal header, lime green (#6be575) for accents and buttons, rounded cards with subtle shadow.

If you see different copy (e.g. only "1. Smart capture" and "2. Review in Shopify") or no "Intelligent Inventory Capturing" hero, that’s the old design.

---

## How to preview the latest design in Shopify

The admin iframe loads your app from a **URL**. To see the latest design, that URL must be your **local dev server**.

### 1. Fix Shopify CLI (one-time)

In Terminal:

```bash
rm -rf /Users/pritesh/Library/Preferences/shopify-cli-app-nodejs
```

### 2. Start the app locally

```bash
cd /Users/pritesh/Documents/GitHub/AutoEntry/auto-entry
npm run dev
```

Leave this running. Wait until it prints a **URL** (e.g. `https://xxxx.ngrok-free.app` or similar). That’s your “latest” app.

### 3. Open the app in Shopify admin

- Go to your dev store → **Apps** → **Auto Entry** (or use the link the CLI shows).
- If you see **“dev previews”** (e.g. bottom right), **click it** and choose the preview that matches the URL from step 2. If you pick the wrong one, you’ll see an old or broken version.
- Do a **hard refresh**: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows), or open the app in an **Incognito/Private** window so the iframe isn’t cached.

You should now see the latest design (teal header, “Intelligent Inventory Capturing” hero, QR card, To Review / Drafts / View All tabs).

### 4. If it still looks old

- Confirm **the same URL** from step 2 is the one selected in “dev previews”.
- Clear local build cache and restart dev:
  ```bash
  cd /Users/pritesh/Documents/GitHub/AutoEntry/auto-entry
  rm -rf .cache build app/build
  npm run dev
  ```
- Open the app again in the admin and hard refresh (or incognito).

---

## Why production (Fly) shows old or 502

Shopify can also load the app from **production** (`https://auto-entry.fly.dev`). If Fly is returning 502 or an old deploy, the admin will show an error or a cached old design. To see the latest in production, you need to fix the Fly 502 and deploy again (see `FLY-502-FIX.md`).
