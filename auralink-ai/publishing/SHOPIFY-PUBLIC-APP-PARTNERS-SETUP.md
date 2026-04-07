# Item 1 — Create a public App Store app (fully)

You cannot create or approve a Partner app from this repo; it is done in **Shopify Partners**. This document completes **checklist item 1**: a **public** app eligible for **Shopify App Store** submission (not **Custom-only** distribution).

Official overview: [Select a distribution method](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method).

---

## Critical rule (read first)

**Distribution method is fixed after you choose it.** You **cannot** turn an existing **Custom** app into a **Public** app later.

| If you already have… | What to do |
|----------------------|------------|
| **Custom distribution** app used for dev/demo | Create a **new** app in Partners and select **Public distribution** for the App Store. Keep the Custom app for internal testing if you want; use **new Client ID + secret** in production `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` for the public app. |
| No app yet | Create one app and choose **Public distribution** from the start (or choose it immediately after creation, before you rely on Custom). |
| App created via **Shopify CLI / Dev Dashboard** | When prompted for distribution, choose **Public distribution** for the app that will go to the App Store. |

---

## Path A — New app in Partner Dashboard (typical)

1. Sign in at [partners.shopify.com](https://partners.shopify.com).
2. Open **Apps** (or **App distribution** → apps list).
3. Click **Create app** (wording may be **Create app manually** or similar).
4. Enter an **App name** (e.g. `SyncLyst`) — this is what merchants see; you can refine the listing later.
5. Complete creation until you are inside the app’s settings.

### Set distribution to **Public** (App Store)

6. Go to **App distribution** / **Distribution** for this app (Partner UI: often under the app name or **Distribution** in the sidebar).
7. Click **Choose distribution** (or equivalent).
8. Select **Public distribution** (Shopify App Store — distribute to many merchants).  
   - Do **not** select **Custom distribution** if your goal is App Store approval.
9. Confirm / **Select**.

### What “done” looks like for item 1

- The app’s distribution is **Public**, not Custom-only.
- You can start or open an **App Store listing** (draft listing, categories, etc.).
- **API credentials** exist for this app:
  - **Client ID** → use as `SHOPIFY_API_KEY` in `publishing/.env`.
  - **Client secret** → use as `SHOPIFY_API_SECRET` in `publishing/.env` (and for webhook HMAC).

Copy those into your **production** publishing environment only after you intend to use this app for real installs (not your old Custom app keys, unless they are the same app — which they won’t be if you created a new public app).

---

## Path B — Shopify CLI / Dev Dashboard

If you use [Shopify CLI for apps](https://shopify.dev/docs/apps/build/cli-for-apps):

1. Run `shopify app init` / project flow for your app.
2. When asked for **distribution**, choose **Public** / App Store (not Custom-only).
3. Link the project to the same app in Partners if prompted.

Then align **redirect URLs** and **compliance webhooks** in the Partner Dashboard with your deployed publishing URL (see **SHOPIFY-APP-STORE-LAUNCH.md** items 2–3).

---

## After item 1 (do not skip)

Item 1 only creates the **public app shell**. You still must:

| Step | Doc |
|------|-----|
| Allowed redirection URL(s) → `https://<publishing>/auth/shopify/callback` | **SHOPIFY-APP-STORE-LAUNCH.md** §1 |
| Compliance webhooks → `https://<publishing>/webhooks/shopify/compliance` | Same §2 |
| Scopes | Already `write_products`, `read_products`, `write_inventory` in code — enable the same in Partners |

---

## Checklist — item 1 only

- [ ] App exists in Partners **with Public distribution** (not Custom-only).
- [ ] **Client ID** and **Client secret** copied; plan to set `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` on publishing for **this** app.
- [ ] You understand a **separate** Custom app (if any) does **not** replace this — production App Store flows use **this** public app’s credentials.

When all boxes are checked, **item 1 is fully sorted** from a product/setup perspective. Remaining work is items 2–6 in **SHOPIFY-APP-STORE-LAUNCH.md**.
