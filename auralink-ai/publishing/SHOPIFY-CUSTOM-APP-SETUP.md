# Shopify Custom app – step-by-step setup

Use this guide to get SyncLyst live with Shopify **without** App Store approval. Custom apps are installable via a generated link; no review required.

**Want every click written out?** See **[SHOPIFY-CUSTOM-APP-EVERY-CLICK.md](./SHOPIFY-CUSTOM-APP-EVERY-CLICK.md)** for a numbered, click-by-click list.

---

## Part A: Create the Custom app in Shopify Partners

### Step 1: Create a Custom app (not Public)

1. Go to **[partners.shopify.com](https://partners.shopify.com)** and sign in.
2. Click **Apps** in the left sidebar.
3. Click **Create app** → **Create app manually** (or **Create custom app**).
   - Do **not** choose “Create app for the App Store” or “Public app.”
4. Name the app (e.g. **SyncLyst** or **Sync-Lyst Custom**) and create it.
5. Confirm it’s a **Custom** app: in the app, check **Distribution** or **App setup** – it should say **Custom app** / install via link, not App Store.

### Step 2: Set the redirect URL (exact match required)

1. In your Custom app, go to **Configuration** or **App setup** → **URLs** (or **Allowed redirection URL(s)**).
2. Set the **Redirect URL** to exactly one of:
   - **Local:** `http://localhost:8001/auth/shopify/callback`
   - **Production:** `https://YOUR-PUBLISHING-URL/auth/shopify/callback`  
     Example: `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback`
3. No trailing slash. Use **HTTP** for local, **HTTPS** for production.
4. Save.

To see the exact redirect URI your service uses (after it’s running):

```bash
curl -s https://YOUR-PUBLISHING-URL/auth/shopify/status
# or locally: curl -s http://localhost:8001/auth/shopify/status
```

Use the `redirect_uri` value from the JSON in Partners.

### Step 3: Set API scopes

1. In the same app, find **API access** or **Admin API access** / **Scopes**.
2. Enable:
   - `write_products`
   - `read_products`
   - `write_inventory`
3. Save if needed.

### Step 4: Copy Client ID and Client secret

1. In the app, open **Client credentials** or **API credentials**.
2. Copy:
   - **Client ID** → use as `SHOPIFY_API_KEY`
   - **Client secret** → use as `SHOPIFY_API_SECRET`

---

## Part B: Configure the publishing service

### Step 5: Set environment variables

**Local (`.env` in `auralink-ai/publishing/`):**

```bash
PORT=8001
APP_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-at-least-32-characters
TOKEN_ENCRYPTION_KEY=your-32-char-encryption-key!!
ENABLED_PLATFORMS=shopify

SHOPIFY_API_KEY=<Client ID from Step 4>
SHOPIFY_API_SECRET=<Client secret from Step 4>
```

**Cloud Run (Variables and secrets):**

| Name | Value |
|------|--------|
| `APP_URL` | Your publishing URL, no trailing slash (e.g. `https://synclyst-publishing-xxx.run.app`) |
| `FRONTEND_URL` | Your frontend URL (e.g. `https://synclyst.app`) |
| `SHOPIFY_API_KEY` | Custom app Client ID |
| `SHOPIFY_API_SECRET` | Custom app Client secret |
| `ENABLED_PLATFORMS` | `shopify` |
| Plus: `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, and Supabase vars if you use them |

### Step 6: Run the publishing service

```bash
cd auralink-ai/publishing
npm install
npm run dev
```

Leave it running on port 8001. For production, deploy to Cloud Run and ensure the same env vars are set.

---

## Part C: Install the Custom app on your store

### Step 7: Generate the install link

1. In **Shopify Partners**, open your **Custom** app.
2. Go to **Distribution** (or **Test your app** / **Installation**).
3. Under **Store domain**, enter your store (e.g. `yourstore` or `yourstore.myshopify.com`).
4. Click **Generate link**.
5. Copy the full install URL.

### Step 8: Install on the store

1. Open the **copied link** in your browser.
2. Log in to the Shopify store if prompted.
3. You should see **Install app** for your Custom app (no “This app is under review”).
4. Click **Install app**.
5. You should be redirected to your publishing callback, then to your frontend, e.g.:
   - `https://synclyst.app/listing/published?shopify=connected&shop=yourstore.myshopify.com` (canonical; `/flow-success.html` still works)

If you get a redirect error, the Redirect URL in Step 2 does not match exactly. Fix it in Partners and try again.

---

## Part D: Verify end-to-end

### Step 9: Confirm token is stored

- With **Supabase:** Check `platform_tokens` for a row with `platform = 'shopify'` and your store.
- Without Supabase (in-memory): The token is stored in memory; restart will clear it. Still run the test below.

### Step 10: Test one publish

1. On your site, go through the flow that creates a listing and clicks **Publish to Shopify** (e.g. flow-3 or review screen).
2. Use a product with title, description, price, and at least one image.
3. In **Shopify Admin** → **Products** → **Drafts** (or filter by Draft), confirm the new product appears.

If that works, the Custom app is live and no App Store approval is needed.

---

## Checklist

- [ ] Custom app created in Partners (not Public).
- [ ] Redirect URL set to `{APP_URL}/auth/shopify/callback` (exact).
- [ ] Scopes: `write_products`, `read_products`, `write_inventory`.
- [ ] `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` set in publishing service.
- [ ] `APP_URL` and `FRONTEND_URL` set (local or Cloud Run).
- [ ] Install link generated and used on your store.
- [ ] Install completed; redirect reached your app.
- [ ] One test listing published and visible in Shopify Admin.

---

## Troubleshooting

- **“This app is under review”** – You’re on a **Public** app. Create a new app and choose **Custom** / “Create app manually” (not for the App Store).
- **Redirect URI mismatch** – Redirect URL in Partners must match exactly: `{APP_URL}/auth/shopify/callback` (no trailing slash). Use `GET /auth/shopify/status` to see what the service uses.
- **“This shop is currently unavailable”** – For development stores, add the store in the app’s **Distribution** (or Test stores). See [SHOPIFY-SETUP.md](./SHOPIFY-SETUP.md).
- **Token not found / Publish fails** – Ensure Supabase is configured and the schema is applied so tokens persist. Or re-install via the generated link and try again (in-memory will lose the token on restart).
