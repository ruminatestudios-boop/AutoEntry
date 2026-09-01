# Partners Dashboard — manual steps (cannot be automated)

Complete these in [Shopify Partners](https://partners.shopify.com) before App Store submission.

## 1. Distribution & billing

- [ ] App distribution: **Public** (App Store), not Custom-only
- [ ] **Disable Managed Pricing** — app uses programmatic `appSubscriptionCreate` (`POST /api/billing/subscribe`)
- [ ] Listing prices match `src/billing/plans.js`: **Pro $9.99**, **Growth $29.99**, **Scale $79.99** / 30 days
- [ ] Listing copy: **Free to install — paid to publish** (not “100% free”)

## 2. URLs (must match `shopify.app.toml`)

| Field | Value |
|-------|--------|
| App URL | `https://app.synclyst.app/shopify/launch` |
| Redirect URL | `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback` |
| Compliance webhooks | `https://app.synclyst.app/api/shopify/webhooks/gdpr/compliance` |

Sync from CLI after login:

```bash
cd auralink-ai/publishing
npm run shopify:login
npm run shopify:deploy-config
```

## 3. Release & submit

- [ ] **Release** the latest app version in Partners
- [ ] Paste **[SHOPIFY-REVIEWER-INSTRUCTIONS.md](./SHOPIFY-REVIEWER-INSTRUCTIONS.md)** into the submission form (fill test credentials)
- [ ] Privacy: `https://app.synclyst.app/privacy` · Terms: `https://app.synclyst.app/terms`
- [ ] Support: `synclyst@gmail.com`

## 4. Supabase (one-time)

Run in Supabase SQL editor if not already applied:

- `src/db/migrations/20260608_platform_tokens_clerk_user_id.sql`
- `../supabase/migrations/20260608000000_developer_metered_billing.sql` (developer API metering)
