import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getEnabledPlatforms } from '../config/platforms.js';
import { getOrCreateDevUser } from '../db/users.js';
import { isDevMode, getDevUserId } from '../db/devStore.js';

const authRouter = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/** GET dev token for local testing. Creates/gets dev user and returns JWT. No auth required. */
authRouter.get('/dev-token', async (_req, res) => {
  try {
    let userId = await getOrCreateDevUser();
    if (!userId && isDevMode()) userId = getDevUserId();
    if (!userId) return res.status(500).json({ error: 'Could not get or create dev user (check DB). Set SUPABASE_URL and SUPABASE_SERVICE_KEY in publishing/.env for full flow, or see CONNECT.md.' });
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
    const shop = req.query.shop || '';
    if (!shop) return res.status(400).json({ error: 'Query "shop" required (e.g. mystore.myshopify.com)' });
    const returnTo = req.query.return_to || req.query.returnTo || '';
    const state = JSON.stringify({ userId: req.userId, shop, returnTo });
    res.redirect(getShopifyAuthUrl(state));
  });
  authRouter.get('/shopify/callback', async (req, res) => {
    try {
      const result = await handleShopifyCallback(req.query.code, req.query.shop || '', req.query.state);
      const base = FRONTEND_URL.replace(/\/$/, '');
      const qs = `shopify=connected&shop=${encodeURIComponent(result.shop_domain)}`;
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
  authRouter.get('/ebay', requireUser, (req, res) => res.redirect(getEbayAuthUrl(req.userId)));
  authRouter.get('/ebay/callback', async (req, res) => {
    try {
      const result = await handleEbayCallback(req.query.code, req.query.state);
      res.redirect(`${FRONTEND_URL}/dashboard?ebay=connected&shop_id=${encodeURIComponent(result.shop_id || '')}`);
    } catch (e) {
      res.redirect(`${FRONTEND_URL}/dashboard?error=ebay&message=${encodeURIComponent(e.message)}`);
    }
  });
}

if (enabled.includes('etsy')) {
  const { getEtsyAuthUrl, handleEtsyCallback } = await import('../auth/etsy.js');
  authRouter.get('/etsy', requireUser, (req, res) => res.redirect(getEtsyAuthUrl(req.userId)));
  authRouter.get('/etsy/callback', async (req, res) => {
    try {
      const result = await handleEtsyCallback(req.query.code, req.query.state);
      res.redirect(`${FRONTEND_URL}/dashboard?etsy=connected&shop_id=${encodeURIComponent(result.shop_id || '')}`);
    } catch (e) {
      res.redirect(`${FRONTEND_URL}/dashboard?error=etsy&message=${encodeURIComponent(e.message)}`);
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
