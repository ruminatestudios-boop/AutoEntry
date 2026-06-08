import { Router } from 'express';
import {
  verifyShopifyWebhookHmac,
  normalizeShopifyDomain,
} from '../webhooks/shopifyCompliance.js';
import { getSupabase } from '../db/client.js';
import { syncShopifyBillingForUser } from '../db/billingSync.js';

export const shopifyBillingWebhookRouter = Router();

shopifyBillingWebhookRouter.post('/', async (req, res) => {
  const rawBody = req.body;
  const hmac = req.headers['x-shopify-hmac-sha256'];
  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return res.status(401).send('Unauthorized');
  }

  let payload = {};
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('Bad JSON');
  }

  const shopHeader = normalizeShopifyDomain(req.headers['x-shopify-shop-domain'] || '');
  const shop =
    shopHeader ||
    normalizeShopifyDomain(payload?.shop_domain || payload?.app_subscription?.admin_graphql_api_shop_id || '');

  res.status(200).send('OK');

  if (!shop) return;

  setImmediate(async () => {
    try {
      const db = getSupabase();
      if (!db) return;
      const { data: rows } = await db
        .from('platform_tokens')
        .select('user_id, clerk_user_id')
        .eq('platform', 'shopify')
        .eq('shop_domain', shop);
      for (const row of rows || []) {
        const uid = row.clerk_user_id || row.user_id;
        if (uid) await syncShopifyBillingForUser(String(uid));
      }
    } catch (e) {
      console.error('[billing/webhook] sync error', shop, e.message);
    }
  });
});
