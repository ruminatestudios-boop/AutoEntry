/**
 * Mandatory compliance webhooks — single HTTPS endpoint for App Store apps.
 */
import { Router } from 'express';
import {
  verifyShopifyWebhookHmac,
  redactShopFromDatabase,
  handleCustomerRedact,
  handleCustomerDataRequest,
  normalizeShopifyDomain,
} from '../webhooks/shopifyCompliance.js';

export const shopifyComplianceRouter = Router();

shopifyComplianceRouter.post('/', async (req, res) => {
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    console.warn(
      '[compliance] invalid body type=%s content-type=%s',
      typeof rawBody,
      (req.get('content-type') || '').toString()
    );
    return res.status(400).json({ error: 'Expected raw body' });
  }

  const hmac =
    req.get('X-Shopify-Hmac-Sha256') ||
    req.get('X-Shopify-Hmac-SHA256') ||
    req.get('x-shopify-hmac-sha256');
  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    const topic = (req.get('X-Shopify-Topic') || '').trim();
    const shop = normalizeShopifyDomain(req.get('X-Shopify-Shop-Domain'));
    const secretConfigured = !!(
      (process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_CLIENT_SECRET || '').toString().trim()
    );
    console.warn(
      '[compliance] HMAC verification failed topic=%s shop=%s secret_configured=%s hmac_present=%s body_bytes=%s',
      topic || '?',
      shop || '?',
      secretConfigured ? 'yes' : 'no',
      hmac ? 'yes' : 'no',
      rawBody.length
    );
    return res.status(401).send('Unauthorized');
  }

  let payload = {};
  if (rawBody.length > 0) {
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const topic = (req.get('X-Shopify-Topic') || '').trim();
  const shopFromHeaders = normalizeShopifyDomain(req.get('X-Shopify-Shop-Domain'));

  try {
    if (topic === 'customers/data_request') {
      await handleCustomerDataRequest(payload);
      // App Store / automated checks expect JSON for data requests when you hold no customer PII.
      return res.status(200).json({ customers: {} });
    }

    if (topic === 'customers/redact') {
      await handleCustomerRedact(payload);
      return res.status(200).send();
    }

    if (topic === 'shop/redact') {
      const shop = normalizeShopifyDomain(payload?.shop_domain) || shopFromHeaders;
      // Acknowledge immediately; do cleanup asynchronously to avoid timeouts in Shopify’s checks.
      res.status(200).send();
      if (!shop) {
        console.warn('[compliance] shop/redact missing shop domain');
        return;
      }
      setImmediate(async () => {
        try {
          const result = await redactShopFromDatabase(shop);
          if (!result.ok) console.error('[compliance] shop/redact failed', shop, result.error);
          else console.log('[compliance] shop/redact ok', shop, result.mode);
        } catch (e) {
          console.error('[compliance] shop/redact async error', shop, e?.message || e);
        }
      });
      return;
    }

    if (topic === 'app/uninstalled') {
      const shop =
        shopFromHeaders ||
        normalizeShopifyDomain(
          payload?.domain || payload?.shop_domain || payload?.shop?.domain || payload?.shop?.myshopify_domain
        );
      // Acknowledge immediately; do cleanup asynchronously to avoid timeouts.
      res.status(200).send();
      if (!shop) {
        console.warn('[compliance] app/uninstalled missing shop domain');
        return;
      }
      setImmediate(async () => {
        try {
          const result = await redactShopFromDatabase(shop);
          if (!result.ok) console.error('[compliance] app/uninstalled cleanup failed', shop, result.error);
          else console.log('[compliance] app/uninstalled ok', shop, result.mode);
        } catch (e) {
          console.error('[compliance] app/uninstalled async error', shop, e?.message || e);
        }
      });
      return;
    }

    console.warn('[compliance] unknown topic', topic);
    return res.status(200).send();
  } catch (e) {
    console.error('[compliance] handler error', topic, e?.message || e);
    return res.status(500).json({ error: 'Handler error' });
  }
});
