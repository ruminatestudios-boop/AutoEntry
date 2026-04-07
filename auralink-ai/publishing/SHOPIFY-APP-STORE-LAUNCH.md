# Shopify App Store launch checklist (SyncLyst)

Use this when moving from a **Custom app** (no review) to a **public / App Store** app. Legal sign-off is yours; this list tracks Shopify technical and policy items reflected in the codebase.

## 1. Partner app setup

**Complete step-by-step for creating the public app:** **[SHOPIFY-PUBLIC-APP-PARTNERS-SETUP.md](./SHOPIFY-PUBLIC-APP-PARTNERS-SETUP.md)** (item 1 only — distribution cannot be changed from Custom later).

- [ ] **Public** app in [Shopify Partners](https://partners.shopify.com) — App Store distribution, not Custom-only (see guide above).
- [ ] **App URL**: `https://<YOUR_FRONTEND>/shopify/launch` (forwards to signed OAuth start; merchants sign in with Clerk if needed). Example: `https://synclyst.app/shopify/launch`.
- [ ] **Next.js env**: `PUBLISHING_APP_URL` or `NEXT_PUBLIC_PUBLISHING_API_URL` = publishing API base (same value you use for `APP_URL` on publishing). **Publishing + Next must share** `JWT_SECRET` / `PUBLISHING_JWT_SECRET` for `start_token` verification.
- [ ] **Legacy `user_id` query** on `/auth/shopify` is **disabled in production** unless you set `ALLOW_LEGACY_SHOPIFY_USER_ID_QUERY=1` (not recommended for App Store).
- [ ] **Allowed redirection URL(s)**: exactly  
  `https://<YOUR_PUBLISHING_HOST>/auth/shopify/callback`  
  (must match `APP_URL` / `SHOPIFY_REDIRECT_URI` in publishing `.env`; use `/auth/shopify/status` to copy `redirect_uri`).
- [ ] **Admin API scopes** (already coded): `write_products`, `read_products`, `write_inventory`.

## 2. Mandatory compliance webhooks (required for review)

- [ ] In Partner Dashboard → **Compliance webhooks**, set **all three** topics to the **same** URL:
  - `https://<YOUR_PUBLISHING_HOST>/webhooks/shopify/compliance`
- [ ] Deploy publishing with `SHOPIFY_API_SECRET` set (same app as Partners). The endpoint verifies `X-Shopify-Hmac-Sha256` and returns **401** if invalid.
- [ ] `shop/redact`: deletes `platform_tokens` rows for that `shop_domain` (and in-memory dev tokens).
- [ ] `customers/data_request` / `customers/redact`: acknowledged with 200; publishing DB does not store Shopify customer PII. If you add customer tables later, extend `src/webhooks/shopifyCompliance.js`.
- [ ] Test delivery from Partners (or CLI webhook tools) and confirm **200** responses.

Template TOML: `shopify.app.toml` in this folder (replace placeholders).

## 3. Production safety (no “100%” without these)

- [ ] `NODE_ENV=production` on publishing — `GET /auth/dev-token` is **disabled** (404).
- [ ] **Unset** `SHOPIFY_DEV_TOKEN_APPLIES_IN_PRODUCTION` and avoid using one Shpat for all tenants. Use real OAuth tokens in Supabase.
- [ ] Set `DISABLE_DEV_SHOPIFY_CONNECT_BYPASS=1` if any dev env vars remain in production.
- [ ] `JWT_SECRET` / `PUBLISHING_JWT_SECRET` aligned with Next `GET /api/publishing/token` (strong random, not the dev default).
- [ ] Supabase **service role** key secured; `TOKEN_ENCRYPTION_KEY` set (32+ chars).
- [ ] `FRONTEND_URL` / CORS allow only your real storefront origins.

## 4. Listing & policy URLs (Shopify review)

- [ ] **Privacy Policy URL**: e.g. `https://synclyst.app/privacy` (includes Shopify merchant section).
- [ ] **Terms** (if required by your listing): e.g. `https://synclyst.app/terms`.
- [ ] **Support**: working email (e.g. `support@synclyst.app`) and any URL Shopify asks for.
- [ ] Screenshots, description, and pricing that match actual behaviour.

## 5. Optional but recommended

- [ ] **APP_UNINSTALLED** webhook to revoke tokens immediately (you still must handle `shop/redact` within 30 days).
- [ ] Error monitoring and uptime for publishing + main app.
- [ ] If you ever store **protected customer data**, complete Shopify’s protected customer data requirements.

## 6. What “100% ready” still means

Shopify approves the **submission**, not this repo. After the items above, you still need: accurate listing copy, review QA cycles, and legal review of privacy/terms for your jurisdictions.
