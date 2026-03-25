import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getEnabledPlatforms } from '../config/platforms.js';
import { upsertToken } from '../db/tokens.js';

const authRouter = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
/** Canonical frontend path after OAuth (Next rewrites to flow-success.html). */
const LISTING_PUBLISHED_PATH = '/listing/published';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const DEV_USER_ID = 'dev-local';

/** GET dev token. Always returns a JWT for dev-local; no DB or other deps. */
authRouter.get('/dev-token', (_req, res) => {
  // Never expose a shared dev token in production deployments.
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const userId = DEV_USER_ID;
    const token = jwt.sign({ sub: userId, userId }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user_id: userId });
  } catch (e) {
    console.error('Dev token error', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

function requireUser(req, res, next) {
  const userId = req.headers['x-user-id'] || req.query?.user_id || req.body?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Missing user id (x-user-id or user_id)' });
  }
  req.userId = userId;
  next();
}

const enabled = getEnabledPlatforms();

if (enabled.includes('shopify')) {
  const { getShopifyAuthUrl, handleShopifyCallback } = await import('../auth/shopify.js');
  authRouter.get('/shopify', requireUser, (req, res) => {
    const shop = (req.query.shop || '').trim().toLowerCase();
    const returnTo = req.query.return_to || req.query.returnTo || '';
    const base = FRONTEND_URL.replace(/\/$/, '');
    const connectPage = '/connect-store';
    const returnQ = returnTo ? `&return=${encodeURIComponent(returnTo)}` : '';

    if (!shop) {
      return res.redirect(`${base}${connectPage}?error=${encodeURIComponent('Enter your store name (e.g. your-store)')}${returnQ}`);
    }
    if (shop === 'admin' || shop === 'admin.myshopify.com' || /\/|\\\\/.test(req.query.shop || '')) {
      return res.redirect(`${base}${connectPage}?error=${encodeURIComponent('Use your store name only (e.g. your-store), not "admin" or a URL path.')}${returnQ}`);
    }
    const stateStr = JSON.stringify({ userId: req.userId, shop, returnTo });
    const authUrl = getShopifyAuthUrl(shop, stateStr);
    if (!authUrl || authUrl.includes('client_id=undefined') || !authUrl.includes('.myshopify.com')) {
      return res.redirect(`${base}${connectPage}?error=${encodeURIComponent('Shopify app not configured. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET in auralink-ai/publishing/.env and restart the publishing service.')}${returnQ}`);
    }
    res.redirect(authUrl);
  });
  authRouter.get('/shopify/callback', async (req, res) => {
    try {
      const result = await handleShopifyCallback(req.query.code, req.query.shop || '', req.query.state);
      const base = FRONTEND_URL.replace(/\/$/, '');
      const qs = `shopify=connected&shop=${encodeURIComponent(result.shop_domain)}`;
      res.redirect(`${base}${LISTING_PUBLISHED_PATH}?${qs}`);
    } catch (e) {
      const base = FRONTEND_URL.replace(/\/$/, '');
      let returnTo = '';
      try {
        const s = JSON.parse(req.query.state || '{}');
        returnTo = s.returnTo || s.return_to || '';
      } catch (_) {}
      const errQs = `error=shopify&message=${encodeURIComponent(e.message)}`;
      if (returnTo) {
        const path = returnTo.startsWith('/') ? returnTo : `/${returnTo}`;
        res.redirect(`${base}${path}?${errQs}`);
      } else {
        res.redirect(`${base}/dashboard?${errQs}`);
      }
    }
  });
}

if (enabled.includes('tiktok')) {
  const { getTikTokAuthUrl, handleTikTokCallback } = await import('../auth/tiktok.js');
  authRouter.get('/tiktok', requireUser, (req, res) => res.redirect(getTikTokAuthUrl(req.userId)));
  authRouter.get('/tiktok/callback', async (req, res) => {
    try {
      const result = await handleTikTokCallback(req.query.code, req.query.state);
      res.redirect(`${FRONTEND_URL}/dashboard?tiktok=connected&shop_id=${encodeURIComponent(result.shop_id || '')}`);
    } catch (e) {
      res.redirect(`${FRONTEND_URL}/dashboard?error=tiktok&message=${encodeURIComponent(e.message)}`);
    }
  });
}

if (enabled.includes('ebay')) {
  const { getEbayAuthUrl, handleEbayCallback } = await import('../auth/ebay.js');
  authRouter.get('/ebay', requireUser, (req, res) => {
    const returnTo = req.query.return_to || req.query.returnTo || '';
    const state = returnTo ? JSON.stringify({ userId: req.userId, returnTo }) : req.userId;
    res.redirect(getEbayAuthUrl(state));
  });
  authRouter.get('/ebay/callback', async (req, res) => {
    try {
      const result = await handleEbayCallback(req.query.code, req.query.state);
      const base = FRONTEND_URL.replace(/\/$/, '');
      const qs = `ebay=connected&shop_id=${encodeURIComponent(result.shop_id || '')}`;
      if (result.returnTo) {
        const path = result.returnTo.startsWith('/') ? result.returnTo : `/${result.returnTo}`;
        res.redirect(`${base}${path}?${qs}`);
      } else {
        res.redirect(`${base}/dashboard?${qs}`);
      }
    } catch (e) {
      const base = FRONTEND_URL.replace(/\/$/, '');
      let returnTo = '';
      try {
        const s = typeof req.query.state === 'string' && req.query.state.startsWith('{') ? JSON.parse(req.query.state) : null;
        returnTo = (s && s.returnTo) || '';
      } catch (_) {}
      const errQs = `error=ebay&message=${encodeURIComponent(e.message)}`;
      if (returnTo) {
        const path = returnTo.startsWith('/') ? returnTo : `/${returnTo}`;
        res.redirect(`${base}${path}?${errQs}`);
      } else {
        res.redirect(`${base}/dashboard?${errQs}`);
      }
    }
  });
} else {
  authRouter.get('/ebay', (_req, res) => {
    res.status(503).json({
      error: 'eBay is not enabled',
      hint: 'Set ENABLED_PLATFORMS=shopify,etsy,ebay in auralink-ai/publishing/.env and restart the publishing service.',
      enabledPlatforms: enabled,
    });
  });
}

if (enabled.includes('etsy')) {
  const { getEtsyAuthUrl, handleEtsyCallback } = await import('../auth/etsy.js');
  /** Debug: return Etsy auth URL as JSON (no redirect). Use ?state={"userId":"x","returnTo":"flow-3-etsy.html"} to verify server has correct www.etsy.com/oauth/connect URL. */
  authRouter.get('/etsy/url', (req, res) => {
    const state = req.query.state || JSON.stringify({ userId: 'debug', returnTo: 'flow-3-etsy.html' });
    const url = getEtsyAuthUrl(state);
    res.json({ url, expected_prefix: 'https://www.etsy.com/oauth/connect' });
  });
  authRouter.get('/etsy', requireUser, (req, res) => {
    /** Temporary: bypass Etsy login and assume connected. Set DEV_BYPASS_ETSY_LOGIN=true in .env to test the full flow without Etsy OAuth. */
    if (process.env.DEV_BYPASS_ETSY_LOGIN === 'true' || process.env.DEV_BYPASS_ETSY_LOGIN === '1') {
      const base = FRONTEND_URL.replace(/\/$/, '');
      upsertToken({
        user_id: req.userId,
        platform: 'etsy',
        access_token: 'dev-bypass-etsy',
        refresh_token: 'dev-bypass',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        shop_id: 'dev-shop',
        status: 'connected',
      }).then(() => {
        res.redirect(`${base}${LISTING_PUBLISHED_PATH}?etsy=connected&shop_id=dev-shop`);
      }).catch((e) => {
        console.error('Dev bypass Etsy upsert', e);
        res.redirect(`${base}${LISTING_PUBLISHED_PATH}?error=etsy&message=${encodeURIComponent(e.message || 'Bypass failed')}`);
      });
      return;
    }
    const returnTo = req.query.return_to || req.query.returnTo || 'flow-3-etsy.html';
    const stateStr = JSON.stringify({ userId: req.userId, returnTo });
    res.redirect(getEtsyAuthUrl(stateStr));
  });
  authRouter.get('/etsy/callback', async (req, res) => {
    try {
      const result = await handleEtsyCallback(req.query.code, req.query.state);
      const base = FRONTEND_URL.replace(/\/$/, '');
      const qs = `etsy=connected&shop_id=${encodeURIComponent(result.shop_id || '')}`;
      // After connecting Etsy, send user to success page (same flow as Shopify)
      res.redirect(`${base}${LISTING_PUBLISHED_PATH}?${qs}`);
    } catch (e) {
      const base = FRONTEND_URL.replace(/\/$/, '');
      let returnTo = '';
      try {
        const s = JSON.parse(req.query.state || '{}');
        returnTo = s.returnTo || s.return_to || '';
      } catch (_) {}
      const errQs = `error=etsy&message=${encodeURIComponent(e.message)}`;
      if (returnTo) {
        const path = returnTo.startsWith('/') ? returnTo : `/${returnTo}`;
        res.redirect(`${base}${path}?${errQs}`);
      } else {
        res.redirect(`${base}/dashboard?${errQs}`);
      }
    }
  });
}

if (enabled.includes('amazon')) {
  const { getAmazonAuthUrl, handleAmazonCallback } = await import('../auth/amazon.js');
  authRouter.get('/amazon', requireUser, (req, res) => res.redirect(getAmazonAuthUrl(req.userId)));
  authRouter.get('/amazon/callback', async (req, res) => {
    try {
      const region = req.query.region || 'uk';
      const result = await handleAmazonCallback(req.query.code, req.query.state, region);
      res.redirect(`${FRONTEND_URL}/dashboard?amazon=connected&region=${encodeURIComponent(result.region || 'uk')}`);
    } catch (e) {
      res.redirect(`${FRONTEND_URL}/dashboard?error=amazon&message=${encodeURIComponent(e.message)}`);
    }
  });
}

export { authRouter };
