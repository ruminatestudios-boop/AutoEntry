# Shopify App Store launch checklist (SyncLyst)

Use this when moving from a **Custom app** (no review) to a **public / App Store** app. Legal sign-off is yours; this list tracks Shopify technical and policy items reflected in the codebase.

## 1. Partner app setup

**Complete step-by-step for creating the public app:** **[SHOPIFY-PUBLIC-APP-PARTNERS-SETUP.md](./SHOPIFY-PUBLIC-APP-PARTNERS-SETUP.md)** (item 1 only — distribution cannot be changed from Custom later).

- [ ] **Public** app in [Shopify Partners](https://partners.shopify.com) — App Store distribution, not Custom-only (see guide above).
- [ ] **App URL**: `https://app.synclyst.app/shopify/launch` (Next.js app host). Do **not** use `synclyst.app` / `www` — those are a separate static deploy and 404 on app routes unless redirects are deployed.
- [ ] **Next.js env**: `PUBLISHING_APP_URL` or `NEXT_PUBLIC_PUBLISHING_API_URL` = publishing API base (same value you use for `APP_URL` on publishing). **Publishing + Next must share** `JWT_SECRET` / `PUBLISHING_JWT_SECRET` for `start_token` verification.
- [ ] **Legacy `user_id` query** on `/auth/shopify` is **disabled in production** unless you set `ALLOW_LEGACY_SHOPIFY_USER_ID_QUERY=1` (not recommended for App Store).
- [ ] **Allowed redirection URL(s)**: exactly  
  `https://<YOUR_PUBLISHING_HOST>/auth/shopify/callback`  
  (must match `APP_URL` / `SHOPIFY_REDIRECT_URI` in publishing `.env`; use `/auth/shopify/status` to copy `redirect_uri`).
- [ ] **Admin API scopes** (already coded): `write_products`, `read_products`, `write_inventory` (no `read_inventory`).

## 2. Mandatory compliance webhooks (required for review)

- [ ] In Partner Dashboard → **Compliance webhooks**, set **all three** topics to the **same** URL as `app/uninstalled` in `shopify.app.toml`:
  - `https://app.synclyst.app/api/shopify/webhooks/gdpr/compliance`
- [ ] Deploy frontend (Vercel) with `SHOPIFY_API_SECRET` set (same app as Partners). The endpoint verifies `X-Shopify-Hmac-Sha256` and returns **401** if invalid.
- [ ] `app/uninstalled` and `shop/redact`: deletes `platform_tokens` and legacy `shopify_stores` rows for that shop domain.
- [ ] `customers/data_request` / `customers/redact`: acknowledged with 200; publishing DB does not store Shopify customer PII.
- [ ] Test delivery from Partners (or CLI webhook tools) and confirm **200** responses.

Template TOML: `shopify.app.toml` in this folder (replace placeholders).

## 2b. App Store billing (required — freemium app)

- [ ] Listing copy must say **free to install, paid to publish** — not “100% free”.
- [ ] All paid plans use **Shopify App Billing** (`POST /api/billing/subscribe` → `appSubscriptionCreate`). Do not charge Shopify merchants via Stripe.
- [ ] List plan prices in Partners to match `publishing/src/billing/plans.js` (Pro $9.99, Growth $29.99, Scale $79.99 / 30 days).
- [ ] **Disable Managed Pricing** in Partners if using programmatic billing (`appSubscriptionCreate`). Enable only one billing model.
- [ ] Never set `BILLING_SKIP=1` on production Cloud Run (code ignores it in production, but unset it anyway).
- [ ] Deploy `app_subscriptions/update` webhook to `https://synclyst-publishing-…/webhooks/shopify/billing` (see `shopify.app.toml`).
- [ ] Publish to Shopify is gated on active paid subscription (`assertCanPublish` in publishing API).

## 3. Production safety (no “100%” without these)

- [ ] `NODE_ENV=production` on publishing — `GET /auth/dev-token` is **disabled** (404).
- [ ] **Unset** `SHOPIFY_DEV_TOKEN_APPLIES_IN_PRODUCTION` and avoid using one Shpat for all tenants. Use real OAuth tokens in Supabase.
- [ ] Set `DISABLE_DEV_SHOPIFY_CONNECT_BYPASS=1` if any dev env vars remain in production.
- [ ] `JWT_SECRET` / `PUBLISHING_JWT_SECRET` aligned with Next `GET /api/publishing/token` (strong random, not the dev default).
- [ ] Supabase **service role** key secured; `TOKEN_ENCRYPTION_KEY` set (32+ chars).
- [ ] `FRONTEND_URL=https://app.synclyst.app` on Cloud Run (billing return URL + OAuth redirects).
- [ ] Run Supabase migration `src/db/migrations/20260608_platform_tokens_clerk_user_id.sql` (stores `clerk_user_id` on connect for billing webhooks).

## 4. Listing & policy URLs (Shopify review)

- [ ] **Privacy Policy URL**: `https://app.synclyst.app/privacy` (Shopify Billing + mandatory webhooks).
- [ ] **Terms**: `https://app.synclyst.app/terms`.
- [ ] **Support**: working email (e.g. `synclyst@gmail.com`) and any URL Shopify asks for.
- [ ] Screenshots, description, and pricing that match actual behaviour.

## 5. Optional but recommended

- [ ] **APP_UNINSTALLED** webhook to revoke tokens immediately (you still must handle `shop/redact` within 30 days).
- [ ] Error monitoring and uptime for publishing + main app.
- [ ] If you ever store **protected customer data**, complete Shopify’s protected customer data requirements.

## 6. Pre-submit verification (run locally)

```bash
cd auralink-ai/frontend
SYNCLYST_BASE_URL=https://app.synclyst.app \
SHOPIFY_API_SECRET=shpss_... \
npm run verify:shopify:full
```

Paste reviewer steps from **[SHOPIFY-REVIEWER-INSTRUCTIONS.md](./SHOPIFY-REVIEWER-INSTRUCTIONS.md)** into the App Store submission form.

Deploy:

```bash
cd auralink-ai/publishing && npm run deploy:cloud-run
cd ../.. && npx vercel --prod
cd auralink-ai/publishing && npm run shopify:deploy-config
```

## 7. What “100% ready” still means

Shopify approves the **submission**, not this repo. After the items above, you still need: accurate listing copy, review QA cycles, and legal review of privacy/terms for your jurisdictions.
