# Test: Push to drafts (Custom app install link)

Use this to verify the full flow **before** your Public app is approved: connect via Custom app install link → run flow on synclyst.app → Publish to Shopify → see draft in Shopify Admin.

## Prerequisites

- **Sync_Lyst** (Custom app) is set up in Partner Dashboard with:
  - **Redirect URLs:** `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback`
  - **App URL:** `https://synclyst.app`
- **Cloud Run** (`synclyst-publishing`) uses **Sync_Lyst’s** credentials (not the Public app):
  - `SHOPIFY_API_KEY` = Sync_Lyst Client ID  
  - `SHOPIFY_API_SECRET` = Sync_Lyst Client secret  
  - `APP_URL` = `https://synclyst-publishing-299567386855.us-central1.run.app`
- **Publishing service** code is deployed with the callback change that defaults `userId` to `dev-local` when state is missing (so installs from the generated link store the token for the same user flow-3 uses).

**Note:** For tokens and listings to persist across requests on Cloud Run, set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` on the service and run the publishing schema in that Supabase project. Without Supabase, the service uses in-memory storage and may lose the token if a different instance serves the next request.

---

## Step 1: Generate install link (Custom app)

1. Go to [partners.shopify.com](https://partners.shopify.com) → **Apps** → **Sync_Lyst** (Custom app).
2. Open **Distribution**.
3. Under **Store domain** enter: `fightlore-official.myshopify.com`.
4. Leave **Allow multi-store install for one Plus organization** checked if you want, or uncheck for single store.
5. Click **Generate link**.
6. Copy the install link (e.g. `https://fightlore-official.myshopify.com/admin/oauth/authorize?client_id=...`).

---

## Step 2: Install the app (store the token)

1. Open the **copied link** in your browser (use a normal tab; you’ll log into Shopify if needed).
2. Log in to Shopify if prompted.
3. On the **Install app** screen for Sync_Lyst, click **Install**.
4. Shopify redirects to:  
   `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback?code=...&shop=...`  
   The publishing service exchanges the code for an access token and stores it for user `dev-local` (because the Partner-generated link doesn’t send our `state`).
5. You are then redirected to:  
   `https://synclyst.app/dashboard?shopify=connected&shop=fightlore-official.myshopify.com`  
   (or your configured `FRONTEND_URL` + `/dashboard`).

---

## Step 3: Run the flow and Publish to Shopify

1. Go to **synclyst.app** and start the flow (e.g. flow-3: scan → review listing).
2. Fill in required fields (title, description, price, photos, etc.).
3. Click **Publish to Shopify**.
4. The page will:
   - Get a JWT from the publishing service (`/auth/dev-token` → user `dev-local`).
   - Create a listing: `POST /api/listings` with the listing data.
   - Publish: `POST /api/listings/publish` with `listing_id` and `platforms: ['shopify']`.
5. The publishing service uses the stored Shopify token for `dev-local` and calls Shopify’s GraphQL `productCreate` with `status: "DRAFT"`.

---

## Step 4: Check Shopify Admin

1. Open **Shopify Admin** for **fightlore-official**:  
   `https://admin.shopify.com/store/fightlore-official`.
2. Go to **Products**.
3. Open the **Drafts** section (or filter by status = Draft).
4. You should see the new product created by Sync-Lyst. You can edit it and publish it live from there.

---

## If something fails

- **“Missing user state” on callback**  
  Redeploy the publishing service so the latest code is live (callback now defaults `userId` to `dev-local` when state is missing).

- **“Couldn’t reach the publishing service” / CORS**  
  Ensure synclyst.app is allowed in the publishing service CORS config and that the synclyst-publishing-url meta tag (or hardcoded production URL) points to your Cloud Run URL.

- **“No connected stores” / Publish fails**  
  The token might not be stored or might be on another instance. Ensure Supabase is configured on Cloud Run and that the install (Step 2) completed without error and redirected back to synclyst.app with `?shopify=connected&shop=...`.

- **Redirect URI / Unauthorized**  
  Confirm Sync_Lyst’s Redirect URL in Partner Dashboard is exactly  
  `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback`  
  and that Cloud Run has `APP_URL` set to  
  `https://synclyst-publishing-299567386855.us-central1.run.app`.
