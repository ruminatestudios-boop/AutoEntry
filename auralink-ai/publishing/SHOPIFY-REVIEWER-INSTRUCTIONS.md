# Shopify App Review — testing instructions (paste into submission)

**App name:** SyncLyst  
**App URL:** https://app.synclyst.app/shopify/launch  
**Distribution:** Public · Standalone (not embedded) · Freemium (free install, paid to publish)

## What SyncLyst does

Merchants photograph inventory; SyncLyst drafts a Shopify product listing (title, description, price, tags) and publishes it as a **draft** in Shopify Admin. Starter tier includes limited scans; **publishing requires Pro, Growth, or Scale** billed through **Shopify App Billing**.

## Test store setup

1. Install SyncLyst from the App Store listing (or open App URL with `?shop={your-dev-store}.myshopify.com`).
2. Complete Shopify OAuth when prompted.
3. Sign in or create a SyncLyst account (Clerk) with a test email when redirected.
4. Connect the same Shopify store if prompted at `/connect-store`.

## Core flow (≈5 minutes)

| Step | URL / action | Expected result |
|------|----------------|-----------------|
| 1 | Open **https://app.synclyst.app/list** | Scan / upload UI loads |
| 2 | Upload a product photo | Redirect to `/reading-product`; AI extraction completes |
| 3 | Review draft at **/review** | Editable title, description, price, tags |
| 4 | Tap **Upgrade to publish** (if no paid plan) | Redirect to `/billing` |
| 5 | Subscribe to **Pro** ($9.99/30 days) | Shopify billing approval screen; charge on test store |
| 6 | Return to `/review` → **Publish to Shopify** | Product created as **draft** in Shopify Admin → Products |
| 7 | Shopify Admin → Products | New draft with listing content from scan |

## Billing

- Plans: **Pro $9.99**, **Growth $29.99**, **Scale $79.99** per 30 days (USD).
- Billed via **Shopify Billing API** on the connected store (not Stripe).
- Change or cancel: **Shopify Admin → Settings → Apps → SyncLyst**.
- Do **not** enable Managed Pricing in Partners — app uses programmatic `appSubscriptionCreate`.

## Compliance

- Mandatory webhooks: `https://app.synclyst.app/api/shopify/webhooks/gdpr/compliance`
- Topics: `customers/data_request`, `customers/redact`, `shop/redact`, `app/uninstalled`
- App does not store Shopify customer PII; product photos processed for listing generation.

## Scopes used

`read_products`, `write_products`, `write_inventory` — to create/update product drafts and inventory.

## Support

- Email: synclyst@gmail.com  
- Privacy: https://app.synclyst.app/privacy  
- Terms: https://app.synclyst.app/terms  

## Known notes for reviewers

- App is **standalone** (`embedded=false`): after install, merchants may use **https://app.synclyst.app** directly (not only inside Shopify Admin iframe).
- If Admin shows a configuration toast, open **https://app.synclyst.app/list** in a new tab — full flow works there.
- Chrome extension and marketing site use **Stripe** for non-Shopify subscribers; the **Shopify App Store app** uses **Shopify Billing only**.

## Test credentials (fill before submit)

- SyncLyst test account: `[your-test-email]` / `[password or magic-link note]`
- Dev store: `[store-name].myshopify.com`
