# SyncLyst + Shopify – Step-by-step setup

Follow these steps in order. Each step has a "✓ Check" so you know it worked.

---

## Step 1: Start the three services

Open a terminal. From your **project root** (the folder that contains `auralink-ai` and `package.json`):

```bash
cd /Users/pritesh/Documents/GitHub/SyncLyst
npm run dev:all
```

You should see three processes start (backend, frontend, publishing). Leave this terminal open.

**✓ Check:**  
- Open http://localhost:3000 — the app loads.  
- Open http://localhost:8000/health — you see `{"status":"ok",...}`.  
- Open http://localhost:8001/health — you see `{"status":"ok","service":"synclyst-publishing-api"}`.

If any of those fail, see "Troubleshooting" at the bottom.

---

## Step 2: Create a Shopify app (if you don’t have one)

1. Go to **https://partners.shopify.com** and sign in (or create a Partner account).
2. Click **Apps** → **Create app** → **Create app manually**.
3. Give it a name (e.g. "SyncLyst").
4. Open your app → **API credentials** (or **Configuration** → **Client credentials**).
5. Copy and save:
   - **Client ID**
   - **Client secret**

**✓ Check:** You have a Client ID and Client secret written down or in a safe place.

---

## Step 3: Set the app’s redirect URL (Shopify Partner Dashboard)

1. In the same app in Partner Dashboard, go to **App setup** (or **URLs**).
2. Under **Redirect URLs** (or **Allowed redirection URL(s)**), add:
   ```text
   http://localhost:8001/auth/shopify/callback
   ```
3. Save.

**✓ Check:** The redirect URL is saved and shows in the list.

---

## Step 4: Create a development store (if you don’t have one)

1. In Partner Dashboard, go to **Stores** → **Add store** → **Create development store**.
2. Name it and complete the short setup.
3. Note the store URL, e.g. `your-store-name.myshopify.com` or just `your-store-name`.

**✓ Check:** You can open the store’s admin (e.g. `https://your-store-name.myshopify.com/admin`).

---

## Step 5: Configure the publishing service (.env)

1. On your computer, go to the folder:  
   `SyncLyst/auralink-ai/publishing/`
2. If there’s no `.env` file, copy `.env.example` and rename the copy to `.env`.
3. Open `.env` in a text editor and set (replace with your real values):

   ```env
   PORT=8001
   APP_URL=http://localhost:8001
   FRONTEND_URL=http://localhost:3000
   JWT_SECRET=choose-a-long-secret-at-least-32-characters
   SHOPIFY_API_KEY=your_client_id_from_step_2
   SHOPIFY_API_SECRET=your_client_secret_from_step_2
   ```

4. Save the file.

**✓ Check:** `.env` exists in `auralink-ai/publishing/` and contains your Shopify Client ID and Client secret (no quotes needed).

---

## Step 6: Restart the publishing service

1. In the terminal where `npm run dev:all` is running, press **Ctrl+C** to stop everything.
2. Start again:

   ```bash
   cd /Users/pritesh/Documents/GitHub/SyncLyst
   npm run dev:all
   ```

**✓ Check:** All three services start without errors. http://localhost:8001/health still returns OK.

---

## Step 7: Connect your store in the app

1. Open **http://localhost:3000** in your browser.
2. Go to the **Connect Shopify** page. You can:
   - Use the dashboard link for “Connect Shopify” or “Connect store”, or  
   - Go directly to: **http://localhost:3000/connect-store**
3. Enter your store domain:  
   - Either `your-store-name`  
   - Or `your-store-name.myshopify.com`
4. Click **Connect store** (or **Log in to Shopify** / equivalent).
5. You’ll be sent to Shopify. Sign in if asked, then click **Install app** or **Allow**.
6. You’ll be redirected back to the app. You should see a message like “Shopify connected” or “Store connected.”

**✓ Check:** You’re back on the app and see a success message. The app now “knows” your store.

---

## Step 8: Publish a listing to Shopify (test)

1. In the app, create a listing:
   - Use **Scan** or **Upload** a product photo, or  
   - Go through **Upload** → **Extract** → then go to the **Review** / confirm step.
2. On the review screen, fill in any required fields (title, price, etc.) if needed.
3. Click **Publish to Shopify**.
4. Wait for the success message (e.g. “Pushed to draft” or “Sent to Shopify”).

**✓ Check:**  
- No “Couldn’t reach the publishing service” error.  
- In **Shopify Admin** → **Products**, you see a new **draft** product. Open it and click **Publish** to make it live.

---

## You’re done

You can now:

- Upload/scan a product photo.
- Get an AI draft, edit it, then click **Publish to Shopify**.
- See the product as a draft in your Shopify store and publish it when you’re ready.

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| `npm run dev:all` fails or “address already in use” | Run: `npm run dev:all:clean` from project root (it frees ports then starts again). Or close any other app using ports 3000, 8000, 8001. |
| http://localhost:8001/health doesn’t load | Publishing service didn’t start. Run `cd auralink-ai/publishing && npm run dev` and check for errors. Fix `.env` if needed. |
| “Shopify app not configured” when connecting | Check `auralink-ai/publishing/.env`: `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` must match your app’s Client ID and Client secret. Restart publishing after changing `.env`. |
| Redirect doesn’t work / “redirect_uri mismatch” | In Partner Dashboard, the redirect URL must be exactly: `http://localhost:8001/auth/shopify/callback` (no trailing slash). |
| “Couldn’t reach the publishing service” when clicking Publish | Make sure `npm run dev:all` is running and http://localhost:8001/health works. Restart with `npm run dev:all` and try again. |

For more detail, see **auralink-ai/PUBLISH-TO-SHOPIFY.md** and **auralink-ai/CONNECT.md**.
