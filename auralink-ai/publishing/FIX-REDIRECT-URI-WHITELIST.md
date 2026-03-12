# Fix: "redirect_uri is not whitelisted"

When you click **Connect store** on synclyst.app and get this error, the redirect URL your app sends to Shopify is not in the app’s allowed list.

---

## What’s going on

- **Connect store** sends you to your **publishing service** (e.g. Cloud Run or App Engine).
- That service redirects to Shopify with `redirect_uri = {APP_URL}/auth/shopify/callback`.
- Shopify only allows callbacks that are **whitelisted** in the app. If the value doesn’t match exactly, you see "redirect_uri is not whitelisted".

---

## Fix (two things must match)

### 1. Shopify: whitelist the exact redirect URL

1. Open **Shopify Partners** (or **Dev Dashboard**) → your app **SyncLyst**.
2. Go to the **active app version** (e.g. **Versions** → synclyst-2).
3. Find **Redirect URLs** (or **Allowed redirection URL**).
4. Add this **exact** URL (no trailing slash):

   **If your publishing service is Cloud Run (what synclyst.app uses by default):**
   ```
   https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback
   ```

   **If your publishing service is App Engine:**
   ```
   https://synclyst-publishing-284e4730885.us-central1.appspot.com/auth/shopify/callback
   ```

   Use the one that matches where your **publishing API** actually runs (the place that handles `/auth/shopify` and `/auth/shopify/callback`).

5. Save / release the version if needed.

### 2. Publishing service: set APP_URL to the same base URL

On the **same** service (Cloud Run or App Engine) that handles the Connect flow:

- Set **APP_URL** = that service’s public base URL, **no trailing slash**.
  - Cloud Run: `https://synclyst-publishing-299567386855.us-central1.run.app`
  - App Engine: `https://synclyst-publishing-284e4730885.us-central1.appspot.com`
- Redeploy or restart so the new value is used.

Then try **Connect store** again.

---

## How to know which URL to use

- When you’re on **synclyst.app** and click Connect store, the browser goes to:
  - `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify?shop=...`  
  → use the **run.app** URL in Shopify and as APP_URL.
- If you changed the site to use App Engine, the browser would go to the **appspot.com** URL → use that in Shopify and as APP_URL.

Use **one** publishing host and make sure **both** Shopify’s Redirect URLs and the service’s APP_URL use that same base URL + `/auth/shopify/callback` (in Shopify) and base URL only (as APP_URL).
