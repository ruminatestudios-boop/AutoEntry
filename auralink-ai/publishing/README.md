# SyncLyst Publishing API

Multi-platform listing publish service. One POST with a universal listing → publish to Shopify, TikTok Shop, eBay, Etsy, Amazon (and copy-paste export for Depop/Vinted).

**Shopify-first:** By default only **Shopify** is enabled. Get Shopify right first; enable other platforms later via `ENABLED_PLATFORMS` (see [Enabled platforms](#enabled-platforms)).

## Tech stack

- **Runtime:** Node.js (ES modules)
- **Backend:** Express
- **Database:** PostgreSQL via Supabase
- **Auth:** JWT (SyncLyst users) + OAuth 2.0 per platform
- **Token storage:** Encrypted in `platform_tokens` (AES-256-GCM via `TOKEN_ENCRYPTION_KEY`)

## Quick start

1. **Install**
   ```bash
   cd auralink-ai/publishing && npm install
   ```

2. **Env**
   ```bash
   cp .env.example .env
   # Edit .env: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, TOKEN_ENCRYPTION_KEY (min 32 chars).
   # Add platform keys when you connect each (see below).
   ```

3. **Database** (optional but recommended for production)
   - In Supabase SQL editor, run `src/db/schema.sql` to create `users`, `platform_tokens`, `listings`, `publish_results`.
   - If Supabase is not configured or the client fails to init (e.g. wrong key format), the service runs in **in-memory mode**: dev token, connect, and publish work, but data is lost on restart. Use Supabase for persistence.

4. **Run**
   ```bash
   npm run dev
   ```
   API: http://localhost:8001

## Environment variables

| Variable | Description |
|----------|-------------|
| `ENABLED_PLATFORMS` | Comma-separated platform ids to enable. Default: `shopify`. Use `shopify,tiktok,ebay,etsy,amazon` to enable all. |
| `PORT` | Server port (default 8001) |
| `APP_URL` | Full URL of this API (for OAuth redirects) |
| `FRONTEND_URL` | Where to redirect after OAuth (e.g. dashboard) |
| `JWT_SECRET` | Secret to verify SyncLyst user JWTs |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase **service role** key. For best compatibility with `@supabase/supabase-js`, use the **Legacy** key: Supabase Dashboard → Settings → API → **Legacy anon, service_role API keys** → copy **service_role**. The new `sb_secret_` keys work in some setups but Legacy is more reliable. |
| `TOKEN_ENCRYPTION_KEY` | At least 32 characters; used to encrypt access/refresh tokens at rest |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | From Shopify Partner Dashboard app |
| `TIKTOK_APP_KEY` / `TIKTOK_APP_SECRET` | From TikTok Shop Seller Center |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | From eBay Developer Program |
| `EBAY_ENV` | `sandbox` or `production` |
| `ETSY_API_KEY` / `ETSY_SHARED_SECRET` | From Etsy Open API |
| `AMAZON_CLIENT_ID` / `AMAZON_CLIENT_SECRET` | From Amazon SP-API / Seller Central |
| `AMAZON_SELLER_ID` | Your seller ID (for Listings API) |

## Registering developer accounts and OAuth apps

### Shopify
- **Custom app (no App Store review):** **[SHOPIFY-CUSTOM-APP-SETUP.md](./SHOPIFY-CUSTOM-APP-SETUP.md)** — Partners → Custom distribution, install link.
- **Public / App Store app:** **[SHOPIFY-PUBLIC-APP-PARTNERS-SETUP.md](./SHOPIFY-PUBLIC-APP-PARTNERS-SETUP.md)** — choose **Public distribution** (you cannot convert Custom → Public later; create a new app if needed). Then **[SHOPIFY-APP-STORE-LAUNCH.md](./SHOPIFY-APP-STORE-LAUNCH.md)** for webhooks, redirect URL, production checks.
- Set redirect URL: `{APP_URL}/auth/shopify/callback` (exact match required).
- Scopes: `write_products`, `read_products`, `write_inventory`.

### TikTok Shop
- [TikTok Shop Seller Center](https://seller-us.tiktok.com) → Developer portal (or partner docs).
- Create an app; set redirect URI to `https://your-app-url/auth/tiktok/callback`.
- Scopes: `product.create`, `product.read`.
- Use sandbox when available.

### eBay
- [eBay Developer Program](https://developer.ebay.com) → Create app (OAuth).
- Redirect URI: `https://your-app-url/auth/ebay/callback`.
- Scopes: `https://api.ebay.com/oauth/api_scope/sell.inventory` (and sell.account if needed).
- Use **Sandbox** for testing (`EBAY_ENV=sandbox`); production when going live.

### Etsy
- [Etsy Open API](https://developers.etsy.com) → Get API key and register OAuth.
- Redirect URI: `https://your-app-url/auth/etsy/callback`.
- Scopes: `listings_w`, `listings_r`, `transactions_r`.
- Use sandbox API key for testing.

### Amazon SP-API
- [Seller Central](https://sellercentral.amazon.co.uk) → Apps & Services → Develop Apps.
- LWA (Login with Amazon) redirect: `https://your-app-url/auth/amazon/callback`.
- Scopes: `sellingpartnerapi::catalog_items`, `sellingpartnerapi::listings:write`.
- UK marketplace ID: `A1F83G8C2ARO7P`. Use sandbox endpoints during development.

## Sandbox vs production

- **eBay:** Set `EBAY_ENV=sandbox`; base URL becomes `api.sandbox.ebay.com`. Switch to `production` when ready.
- **Amazon:** Use sandbox SP-API base URL until approved for production.
- **Shopify:** Use a development store; no separate sandbox.
- **Etsy / TikTok:** Use sandbox or test apps per their docs.

## Enabled platforms

Only **Shopify** is enabled by default. This keeps the product focused and makes it easy to add more platforms later.

- Set `ENABLED_PLATFORMS=shopify` (default) for Shopify only.
- To enable more: `ENABLED_PLATFORMS=shopify,tiktok,ebay,etsy,amazon`.
- Auth routes, publish validation, and connected-stores only consider enabled platforms. The frontend calls `GET /api/listings/enabled-platforms` to show the right platform options.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/api/listings/enabled-platforms` | List of enabled platform ids (for UI) |
| GET | `/api/listings/platform-fields` | Required/optional fields per enabled platform |
| GET | `/auth/shopify?shop=…&start_token=…` | Start Shopify OAuth (signed `start_token` from Next `/api/shopify/oauth-start`; prod rejects bare `user_id` unless `ALLOW_LEGACY_SHOPIFY_USER_ID_QUERY=1`) |
| GET | `/auth/shopify/callback` | Shopify OAuth callback |
| POST | `/webhooks/shopify/compliance` | Mandatory GDPR webhooks (`customers/data_request`, `customers/redact`, `shop/redact`); raw JSON body + HMAC |
| GET | `/auth/tiktok` | Start TikTok OAuth |
| GET | `/auth/tiktok/callback` | TikTok callback |
| GET | `/auth/ebay` | Start eBay OAuth |
| GET | `/auth/ebay/callback` | eBay callback |
| GET | `/auth/etsy` | Start Etsy OAuth |
| GET | `/auth/etsy/callback` | Etsy callback |
| GET | `/auth/amazon` | Start Amazon OAuth |
| GET | `/auth/amazon/callback` | Amazon callback |
| POST | `/api/listings/publish` | Publish listing to selected platforms (body: `listing_id`, `platforms[]`) |
| GET | `/api/user/connected-stores` | Connection status per platform (JWT) |
| GET | `/api/listings/:id/export/:platform` | Copy-paste text for Depop or Vinted (JWT) |

## Publish flow

1. Frontend has a listing (with `universal_data`) stored in `listings` and linked to the user.
2. Frontend calls `POST /api/listings/publish` with `Authorization: Bearer <jwt>` and body:
   ```json
   { "listing_id": "uuid", "platforms": ["shopify", "tiktok", "ebay"] }
   ```
3. Backend loads the listing, validates required fields, then for each platform:
   - Gets a valid token (refresh if needed) via `getValidToken(userId, platform)`.
   - Translates universal listing to platform format and calls the platform API.
4. Results are stored in `publish_results` and returned. One platform failing does not block others (`Promise.allSettled`).

## Error handling

- **auth_error:** Token expired and refresh failed → frontend should show “Reconnect [platform]”.
- **validation_error:** Platform API returned a validation error → message in response.
- **platform_error:** Network or server error from platform.
- Never log access or refresh tokens.

## Testing translators (no API calls)

```bash
npm run test:translators
```
Runs a mock listing through every translator and logs the output for manual verification.

## Project structure

```
src/
  auth/           OAuth initiate + callback + token refresh (Shopify, TikTok, eBay, Etsy, Amazon)
  db/             Supabase client, schema, encrypt, tokens, listings helpers
  middleware/     JWT auth
  publish/        Platform API callers (publishToShopify, etc.)
  routes/         auth, publish, stores, export
  translators/    Universal → platform format (shopify, tiktok, ebay, etsy, amazon, depop, vinted)
```
