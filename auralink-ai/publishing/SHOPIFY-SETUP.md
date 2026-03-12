# Shopify Connect – Fix “This shop is currently unavailable”

If SyncLyst redirects to Shopify but you see **“Sorry, this shop is currently unavailable”**, do these steps in order.

**First-time setup?** Use **[SHOPIFY-CUSTOM-APP-SETUP.md](./SHOPIFY-CUSTOM-APP-SETUP.md)** to create a Custom app and go live without App Store approval.

## 1. Get the exact redirect URL our app uses

Our app tells Shopify where to send users after they approve. That URL **must match exactly** in Shopify Partners.

**Option A – From the live service**

```bash
curl -s https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/status
```

In the JSON you’ll see `"redirect_uri": "https://..."`. Copy that full URL (e.g. `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback`).

**Option B – From code**

Redirect URL is: **`{APP_URL}/auth/shopify/callback`**

- Production: `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback`
- Local: `http://localhost:8001/auth/shopify/callback`

No trailing slash. `APP_URL` in Cloud Run must be set to the full publishing URL (no trailing slash).

---

## 2. Set it in Shopify Partners

1. Go to **[Shopify Partners](https://partners.shopify.com)** and open your app.
2. Go to **App setup** (or **Configuration** → **URLs**).
3. Under **URLs** find **Allowed redirection URL(s)** or **Redirect URL**.
4. Set it to **exactly** the `redirect_uri` from step 1, e.g.  
   `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback`
5. Save.

If you have both “App URL” and “Redirect URL”, the **Redirect URL** is the one that must match. You can have only one redirect URL in many apps, so use the callback URL above.

---

## 3. If the app is in development – add your store

1. In Partners → your app → **Distribution** or **Test your app**.
2. Under **Development stores** or **Test stores**, add your store:
   - **fightlore** or **fightlore.myshopify.com**
3. Save.

Without this, Shopify can block the install with “this shop is currently unavailable” for development apps.

---

## 4. Confirm Cloud Run env

In **Google Cloud Console** → **Cloud Run** → **synclyst-publishing** → **Edit & deploy new revision** → **Variables & secrets**:

- **APP_URL** = `https://synclyst-publishing-299567386855.us-central1.run.app` (no trailing slash)
- **SHOPIFY_API_KEY** = your app’s **Client ID**
- **SHOPIFY_API_SECRET** = your app’s **Client secret**

Deploy the new revision after any change.

---

## 5. Try again

1. Open **https://www.synclyst.app/stores-connect-shopify.html?return=flow-3**
2. Enter **fightlore** and click **Connect store**.
3. You should get the normal “Allow this app” screen and then be redirected back to SyncLyst.

If it still says “this shop is currently unavailable”, double‑check:

- Redirect URL in Partners is exactly the same as `redirect_uri` from `/auth/shopify/status` (no extra slash, same `https` and host).
- The store is added as a development/test store if the app is in development.
- You’re using the same Shopify app (same Client ID) in both Partners and Cloud Run.
