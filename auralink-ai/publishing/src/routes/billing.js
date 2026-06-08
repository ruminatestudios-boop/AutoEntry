import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getValidToken } from '../auth/tokenManager.js';
import { BILLING_PLANS, isPaidTier } from '../billing/plans.js';
import { createAppSubscription } from '../billing/shopifyBilling.js';
import {
  getUserBillingState,
  syncShopifyBillingForUser,
} from '../db/billingSync.js';

export const billingRouter = Router();

billingRouter.get('/plans', (_req, res) => {
  res.json({
    provider: 'shopify',
    plans: Object.values(BILLING_PLANS),
    note: 'Paid plans are billed through Shopify App Billing on your connected store.',
  });
});

billingRouter.get('/status', authMiddleware, async (req, res) => {
  try {
    const state = await getUserBillingState(req.userId);
    res.json(state);
  } catch (e) {
    console.error('[billing/status]', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

billingRouter.post('/sync', authMiddleware, async (req, res) => {
  try {
    const state = await syncShopifyBillingForUser(req.userId);
    res.json(state);
  } catch (e) {
    console.error('[billing/sync]', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

billingRouter.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const tier = String(req.body?.tier || '').toLowerCase();
    if (!isPaidTier(tier)) {
      return res.status(400).json({ error: 'invalid_tier', hint: 'Use pro, growth, or scale' });
    }

    const returnUrl =
      String(req.body?.return_url || req.body?.returnUrl || '').trim() ||
      `${(process.env.FRONTEND_URL || 'https://app.synclyst.app').split(',')[0].replace(/\/$/, '')}/billing?shopify_billing=success`;

    const { accessToken, row } = await getValidToken(req.userId, 'shopify');
    const shop = row?.shop_domain;
    if (!shop) {
      return res.status(400).json({
        error: 'shopify_not_connected',
        hint: 'Connect your Shopify store before subscribing.',
      });
    }

    const { confirmationUrl, subscription } = await createAppSubscription(
      shop,
      accessToken,
      tier,
      returnUrl
    );

    res.json({
      confirmationUrl,
      subscription,
      tier,
      shop_domain: shop,
    });
  } catch (e) {
    console.error('[billing/subscribe]', e);
    const msg = e.message || 'Subscription failed';
    if (e.code === 'NOT_CONNECTED') {
      return res.status(400).json({ error: 'shopify_not_connected', message: msg });
    }
    res.status(500).json({ error: 'subscription_failed', message: msg });
  }
});
