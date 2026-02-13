# Auto Entry – Launch prep checklist

**Last updated:** Feb 2025. Use this to pick up where we left off.

---

## 1. Code changes (Agent / Cursor can do tomorrow)

- [ ] **Billing:** Switch from test to production in code.
  - `app/routes/app.pricing.tsx` – set `isTest` based on env (e.g. `process.env.NODE_ENV !== "production"`).
  - `app/routes/app.tsx` – same for `billing.check({ isTest: ... })`.
- [ ] **Dev-only bypass:** Ensure the pricing “manual plan update when billing fails” only runs in development (e.g. guard with `NODE_ENV === "development"`). Already partially there in `app.pricing.tsx` (localhost check).
- [x] **Production URL:** `shopify.app.toml` uses `https://auto-entry.fly.dev` (`application_url` + `auth.redirect_urls`).
- [ ] **Uninstall webhook:** In `webhooks.app.uninstalled.tsx`, also delete (or anonymize) shop-specific data: `ScanSession`, `ScannedProduct`, `ShopSettings` for that shop (same pattern as `webhooks.shop.redact.tsx`), so uninstall = full cleanup.

---

## 2. Your side (you do)

- [ ] **Deploy** the app to production (Fly, Heroku, Railway, etc.) if not already.
- [ ] **Env vars** on production host: `SHOPIFY_APP_URL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, `DATABASE_URL`, optional `SERPAPI_API_KEY`.
- [x] **Shopify Partner Dashboard:** App URL and redirect URLs point at production (`shopify.app.toml`: `application_url` + `auth.redirect_urls` = `https://auto-entry.fly.dev`; syncs to Partners on deploy).
- [ ] **Google Cloud Vision** (optional): Set the secret on Fly so OCR works in production — steps in **`VISION-ON-FLY.md`**. Skip and the app still runs; Gemini analyzes images without Vision OCR.
- [ ] **App Store listing:** Icon 1200×1200, support email (no “Shopify”), emergency contact (email + phone), Privacy URL = `https://your-domain/privacy`, Terms URL = `https://your-domain/terms`, refund policy if required, description/screenshots. **Details:** use checklist + copy in **`APP-STORE-LISTING.md`** (icon, URLs, support, description, screenshots). Mark done when saved in Partners.
- [ ] **Hosting:** Using Fly and hitting 502? You can switch to **Railway** — see **`DEPLOY-RAILWAY.md`**.
---

## 3. How to resume this conversation tomorrow

- Re-open this chat and say: **“Continue the Shopify launch prep from LAUNCH-PREP.md – do the code parts (billing, bypass, app URL, uninstall cleanup).”**
- Or start a new chat and say: **“We’re preparing Auto Entry for Shopify App Store launch. See LAUNCH-PREP.md in the repo – do the code checklist items.”**

Then you can do your design work today and we can pick up the code and config tomorrow.
