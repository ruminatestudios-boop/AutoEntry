# Etsy API setup: test the flow from start to posting

Follow these steps to configure Etsy’s Open API so you can run the full SyncLyst flow (scan → choose Etsy → review → connect Etsy → publish to Etsy as draft).

---

## 1. Register an Etsy Open API app

1. Go to **[Etsy Developers – Register](https://www.etsy.com/developers/register)** and sign in with your Etsy account.
2. Complete app registration. Etsy will create an app and show:
   - **API Key (keystring)** → this is your `ETSY_API_KEY`
   - **Shared Secret** → this is your `ETSY_SHARED_SECRET`
3. Open **[Your Apps](https://www.etsy.com/developers/your-apps)** and select your app.
4. **Redirect URL** (OAuth):
   - **Local:** `http://localhost:8001/auth/etsy/callback`
   - **Production / tunnel:** `https://your-publishing-domain.com/auth/etsy/callback`  
   Etsy may require HTTPS in production; for local testing, `http://localhost:8001` is often accepted. If you get redirect errors locally, use an HTTPS tunnel (e.g. [ngrok](https://ngrok.com)) and set that URL as the redirect URI in Etsy and as `APP_URL` in `.env`.

**Scopes used by SyncLyst:** `listings_w`, `listings_r`, `transactions_r` (already set in `src/auth/etsy.js`). No extra scope configuration is needed in the Etsy UI if the app uses these.

**Personal vs commercial:** New apps get **personal access** (up to 5 shops). That’s enough to test with your own shop. Commercial access is only needed if you want any Etsy seller to connect.

---

## 2. Publishing service environment

1. **Go to the publishing app:**
   ```bash
   cd auralink-ai/publishing
   ```

2. **Create/update `.env`:**
   ```bash
   cp .env.example .env
   ```

3. **Set Etsy and base config in `.env`:**
   ```env
   # Enable Etsy (add to the list)
   ENABLED_PLATFORMS=shopify,etsy

   # Etsy (from step 1)
   ETSY_API_KEY=your_api_key_keystring
   ETSY_SHARED_SECRET=your_shared_secret

   # URLs (must match where the app actually runs)
   APP_URL=http://localhost:8001
   FRONTEND_URL=http://localhost:3000
   ```

   For production or an HTTPS tunnel, set `APP_URL` to that base URL (e.g. `https://synclyst-publishing-xxx.run.app` or your ngrok URL).

4. **Optional but recommended – database (Supabase):**
   - Create a project at [supabase.com](https://supabase.com).
   - In Supabase: **Settings → API** copy **Project URL** and **service_role** (Legacy key).
   - In `.env`:
     ```env
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_SERVICE_KEY=your-service-role-key
     ```
   - In Supabase **SQL Editor**, run the contents of `auralink-ai/publishing/src/db/schema.sql`.

   If you skip Supabase, the publishing service runs in **in-memory mode**: dev-token and Etsy connect/publish will work for testing, but tokens and listings are lost on restart.

5. **Other required vars for dev:**
   ```env
   JWT_SECRET=any-string-at-least-32-characters-long
   TOKEN_ENCRYPTION_KEY=another-32-char-key-for-tokens!!
   ```

---

## 3. Run the publishing service

```bash
cd auralink-ai/publishing
npm install
npm run dev
```

- API base: **http://localhost:8001**
- Check: open **http://localhost:8001/health** and **http://localhost:8001/auth/dev-token** in the browser; both should return JSON.

---

## 4. Run the frontend

From the repo root (or frontend directory):

```bash
cd auralink-ai/frontend
npm install
npm run dev
```

- Frontend: **http://localhost:3000**
- Ensure the frontend is configured to talk to the publishing API at `http://localhost:8001` (e.g. meta tag `synclyst-publishing-url` or `auralink-publishing-url` for local, or env that points to 8001). For the static flow pages, the publishing URL is often read from a meta tag in the HTML.

---

## 5. End-to-end test flow

1. **Start:**  
   Open **http://localhost:3000/landing.html** (or your scan/upload entry point).

2. **Scan / add a product:**  
   Use camera or upload a product image so that a draft is created and you’re sent to the **“Where do you want to list?”** screen.

3. **Choose Etsy:**  
   On the marketplace picker, select **Etsy**. You’ll go to **flow-3-etsy** (review screen).

4. **Connect Etsy:**  
   - On the review screen, click **“Publish to Etsy”** (or the main CTA).  
   - You’ll be sent to **Connect Etsy**; click **“Connect Etsy”**.  
   - The app will call `GET /auth/dev-token` (to get a JWT and user id), then redirect to Etsy’s sign-in with `redirect_uri=http://localhost:8001/auth/etsy/callback` (or your `APP_URL` + `/auth/etsy/callback`).

5. **Etsy OAuth:**  
   - Sign in to Etsy if asked and **allow** the app (listings and transactions).  
   - Etsy redirects to `APP_URL/auth/etsy/callback?code=...&state=...`.

6. **Back to the app:**  
   - The publishing service exchanges `code` for tokens, stores them (Supabase or in-memory), and redirects the browser to the frontend with `?etsy=connected&shop_id=...` (e.g. back to **flow-3-etsy.html**).

7. **Publish:**  
   - On the Etsy review screen, fill/confirm title, description, photos, category, price, etc.  
   - Click **“Publish to Etsy”** again.  
   - Frontend creates a listing via `POST /api/listings` and then calls `POST /api/listings/publish` with `platforms: ['etsy']`.  
   - The publishing service uses the stored Etsy token, maps the listing to Etsy’s format, and creates a **draft listing** in your Etsy shop.

8. **Verify on Etsy:**  
   - In **[Shop Manager](https://www.etsy.com/shop/YOUR_SHOP/manage/listings)** → Listings, open **Drafts**.  
   - You should see the new draft created by SyncLyst.

---

## 6. Troubleshooting

| Issue | What to check |
|-------|----------------|
| **Redirect URI mismatch** | Redirect URI in Etsy app must match exactly: `APP_URL` + `/auth/etsy/callback` (e.g. `http://localhost:8001/auth/etsy/callback`). No trailing slash. |
| **“Etsy app not configured”** | `ETSY_API_KEY` and `ETSY_SHARED_SECRET` must be set in publishing `.env` and the server restarted. |
| **Etsy not in connect list** | Set `ENABLED_PLATFORMS=shopify,etsy` (or include `etsy`) in publishing `.env`. |
| **401 / invalid token after connect** | If using Supabase, run `src/db/schema.sql` and ensure `SUPABASE_SERVICE_KEY` is the **service_role** (Legacy) key. |
| **Publish fails (validation)** | Ensure the listing has required Etsy fields: title, description, price, at least one image, category, and (if the translator expects them) tags. Check publishing logs for the exact Etsy API error. |
| **CORS or “can’t reach publishing”** | Frontend must call the same origin as `APP_URL` or your publishing URL; for local, ensure frontend is configured to use `http://localhost:8001` for the publishing API. |

---

## 7. Summary checklist

- [ ] Etsy app registered; API Key and Shared Secret copied.
- [ ] Redirect URL set in Etsy to `APP_URL/auth/etsy/callback` (e.g. `http://localhost:8001/auth/etsy/callback`).
- [ ] `ENABLED_PLATFORMS` includes `etsy`.
- [ ] `ETSY_API_KEY` and `ETSY_SHARED_SECRET` in publishing `.env`.
- [ ] `APP_URL` and `FRONTEND_URL` match where you run the app.
- [ ] (Optional) Supabase configured and schema applied.
- [ ] Publishing service running (`npm run dev` in `auralink-ai/publishing`).
- [ ] Frontend running and pointing at the publishing API.
- [ ] Test: scan → choose Etsy → Connect Etsy → sign in on Etsy → return to app → Publish to Etsy → draft appears in Etsy Shop Manager.

Once this works, you’ve got the full path from start to posting on Etsy (as draft). For production, replace `APP_URL` with your real publishing URL and set the same URL as the redirect URI in the Etsy app; use HTTPS.
