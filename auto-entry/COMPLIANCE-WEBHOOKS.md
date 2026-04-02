# Compliance webhooks – get the two checks green

## What’s implemented

- **Route:** `POST https://auto-entry-pending-uc.a.run.app/webhooks`  
  (Replace `auto-entry-pending-uc.a.run.app` with your real Cloud Run hostname after deploy.)
  Handles all three topics: `customers/data_request`, `customers/redact`, `shop/redact`.  
  **HMAC:** `authenticate.webhook(request)` verifies `X-Shopify-Hmac-SHA256`; invalid or missing → **401**. Valid → **200** (and `{ customers: {} }` for data_request).

- **Config:** `shopify.app.auto-entry.toml` has one compliance subscription with all three topics and the same URI. `npm run deploy` uses this config so the correct app gets the webhooks.

## Checklist (do in order)

1. **Cloud Run env (must match the app in Partners)**  
   In Google Cloud Run → your service → **Edit & deploy new revision** → **Variables & secrets**, set:
   - `SHOPIFY_API_KEY` = Client ID of the app you’re submitting (from Partners or `shopify.app.auto-entry.toml`).
   - `SHOPIFY_API_SECRET` = that app’s **Client secret** (Partners → App setup → Client credentials).  
     If this is wrong, HMAC will always fail and “Verifies webhooks with HMAC” stays red.
   - `SHOPIFY_APP_URL` = your production URL, e.g. `https://auto-entry-pending-uc.a.run.app` (replace with your Cloud Run URL)

2. **Deploy app to Cloud Run**  
   Deploy a new revision so the `/webhooks` route is live (see **`DEPLOY-CLOUD-RUN.md`**).

3. **Deploy config to Partners**  
   From repo root or `auto-entry`:
   ```bash
   npm run deploy
   ```
   This uses `shopify.app.auto-entry.toml` so the submission app gets the compliance webhooks. Confirm “New version released”.

4. **Same app in Partners**  
   The app you open in Partners (the one with “Manage submission”) must be the **same** app as in `shopify.app.auto-entry.toml` (same Client ID). Otherwise deploy updated the wrong app.

5. **App URL in Partners (critical)**  
   **The checker uses the App URL from the Partner Dashboard.** It must match **exactly**:  
   `https://auto-entry-pending-uc.a.run.app` (your real Cloud Run URL)  
   - No trailing slash.  
   - Same host and scheme (https).  
   Partners → your app → App setup → set “App URL” to that value. Then run `npm run deploy` so webhook subscriptions use it.

6. **Event subscriptions**  
   Partners → App setup → Event subscriptions. You should see a subscription for the three compliance topics pointing at  
   `https://auto-entry-pending-uc.a.run.app/webhooks` (same host as production).  
   If it’s missing or points elsewhere, run `npm run deploy` again and fix any errors in the terminal.

7. **Run the automated checks**  
   Partners → Distribution → Manage submission → find “Automated checks for common errors” → **Run**.

## If still red

- **Production must respond quickly.** Shopify expects a response within a few seconds. If Cloud Run is cold or slow, the check can fail. Open your app URL in a browser to wake it, then run the check again (consider **minimum instances** > 0 for critical checks).
- **Test the endpoint:**  
  `curl -X POST https://auto-entry-pending-uc.a.run.app/webhooks -H "Content-Type: application/json" -d '{}'`  
  You should get **401** (no/invalid HMAC). If you get 502/503, the app isn’t reachable or is crashing.
- **Logs:** In Cloud Run → **Logs**, check when you run the check. You should see either a webhook log or an error (e.g. HMAC failure, 401).
