# Publish to Shopify – Get it working

When you click **Publish to Shopify** you need **two things**: the **publishing service** running, and a **connected Shopify store**. Do the steps below in order.

---

## Step 1: Start the publishing service (port 8001)

The “Publish to Shopify” button talks to the **publishing API** on port **8001**. If that service isn’t running, you get: *“Couldn’t reach the publishing service (port 8001)…”*

**Option A – Start everything (easiest)**  
From the **repo root** (SyncLyst):

```bash
npm run dev:all
```

This starts:
- Backend (8000)
- Frontend (3000)
- **Publishing (8001)** ← required for Publish to Shopify

**Option B – Start only publishing**  
If the backend and frontend are already running:

```bash
cd auralink-ai/publishing
npm run dev
```

Leave this terminal open. You should see the server listening on port 8001.

**Check:** Open http://localhost:8001/health in your browser. You should get JSON like `{"status":"ok","service":"synclyst-publishing-api"}`.

---

## Step 2: Connect your Shopify store

Before publishing, you must **connect** your store (one-time OAuth).

### 2a. Create a Shopify app (if you don’t have one)

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com).
2. Create an app (or use an existing one).
3. Under **API credentials**, note the **Client ID** and **Client secret**.

### 2b. Set redirect URL in Partner Dashboard

In your app → **App setup** → **URLs**:

- **Redirect URL:**  
  `http://localhost:8001/auth/shopify/callback`

Save.

### 2c. Configure the publishing service

In **`auralink-ai/publishing`**, create or edit **`.env`** (copy from `.env.example` if needed):

```env
APP_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000
SHOPIFY_API_KEY=your_client_id_from_partners
SHOPIFY_API_SECRET=your_client_secret_from_partners
JWT_SECRET=any-long-secret-at-least-32-characters
```

Restart the publishing service after changing `.env`:

```bash
cd auralink-ai/publishing
npm run dev
```

### 2d. Connect the store in the app

1. Open **http://localhost:3000** (or your frontend URL).
2. Go to **Connect Shopify** (e.g. http://localhost:3000/connect-store or the Connect store flow from the dashboard).
3. Enter your store domain (e.g. `your-store` or `your-store.myshopify.com`).
4. Click **Connect store**.
5. You’ll be sent to Shopify to sign in and **Install app** / **Allow**.
6. After approving, you’re redirected back with “Shopify connected.”

---

## Step 3: Publish to Shopify

1. Make sure **all three** are running: backend (8000), frontend (3000), **publishing (8001)**.
2. Open your listing (e.g. review page or flow-3).
3. Click **Publish to Shopify**.

The listing is sent to your connected store as a **draft**. In Shopify admin (**Products**), open the draft and click **Publish** when you’re ready.

---

## Quick checklist

| Step | What to do |
|------|------------|
| 1 | Run `npm run dev:all` from repo root, or run `npm run dev` in `auralink-ai/publishing`. |
| 2 | Set `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` in `auralink-ai/publishing/.env`. |
| 3 | Set redirect URL in Partner Dashboard to `http://localhost:8001/auth/shopify/callback`. |
| 4 | In the app, use “Connect Shopify” and complete sign-in + Install app on Shopify. |
| 5 | Click “Publish to Shopify” on your listing. |

For more detail (CORS, backend vs publishing, production), see **CONNECT.md**.
