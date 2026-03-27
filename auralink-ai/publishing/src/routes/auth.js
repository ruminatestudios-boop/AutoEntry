import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getEnabledPlatforms } from '../config/platforms.js';
import { upsertToken } from '../db/tokens.js';
import axios from 'axios';
import { isDevMode, devInsertConciergeRequest } from '../db/devStore.js';
import { getSupabase } from '../db/client.js';

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

authRouter.post('/waitlist', async (req, res) => {
  try {
    const email = (req.body?.email || '').toString().trim();
    const storeDomain = (req.body?.store_domain || req.body?.shop_input || req.body?.domain || '').toString().trim();
    const source = (req.body?.source || 'landing').toString().trim();
    const note = (req.body?.note || req.body?.message || '').toString().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email' });
    }
    const record = {
      user_id: req.body?.user_id || 'anonymous',
      platform: 'shopify_waitlist',
      shop_input: storeDomain || null,
      email,
      message: note || null,
      source,
    };
    const db = getSupabase();
    if (!isDevMode() && db) {
      const { error } = await db.from('waitlist_signups').insert({
        email,
        platform: 'shopify',
        store_domain: storeDomain || null,
        source,
        note: note || null,
      });
      if (error) {
        console.warn('[Waitlist] Supabase insert failed; falling back to in-memory:', error.message);
        devInsertConciergeRequest(record);
      }
    } else {
      devInsertConciergeRequest(record);
    }
    console.log('[Waitlist] Signup:', { email, store_domain: storeDomain || null, source });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

authRouter.post('/concierge/shopify', requireUser, async (req, res) => {
  try {
    const email = (req.body?.email || '').toString().trim();
    const shopInput = (req.body?.shop_input || req.body?.shop_domain || req.body?.domain || '').toString().trim();
    const message = (req.body?.message || '').toString().trim();
    const source = (req.body?.source || 'connect-store').toString().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email' });
    }
    if (!shopInput) return res.status(400).json({ error: 'Enter your store domain' });

    const record = {
      user_id: req.userId,
      platform: 'shopify',
      shop_input: shopInput,
      email,
      message: message || null,
      source,
    };

    // Persist to Supabase if available; otherwise dev store.
    const db = getSupabase();
    if (!isDevMode() && db) {
      // Table is optional; if missing, fall back to dev store + log.
      const { error } = await db.from('concierge_requests').insert(record);
      if (error) {
        console.warn('[Concierge] Supabase insert failed; falling back to in-memory:', error.message);
        devInsertConciergeRequest(record);
      }
    } else {
      devInsertConciergeRequest(record);
    }

    console.log('[Concierge] Shopify request:', { email, shop_input: shopInput, user_id: req.userId, source });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

if (enabled.includes('shopify')) {
  const {
    getShopifyAuthUrl,
    handleShopifyCallback,
    signShopifyState,
    parseShopifyState,
    resolveShopifyShopDomain,
  } = await import('../auth/shopify.js');

  authRouter.post('/shopify/custom-token', requireUser, async (req, res) => {
    try {
      const rawShop = (req.body?.shop_domain || req.body?.shop || '').toString();
      const accessToken = (req.body?.access_token || req.body?.token || '').toString().trim();
      if (!rawShop.trim()) return res.status(400).json({ error: 'Missing shop_domain' });
      if (!accessToken) return res.status(400).json({ error: 'Missing access_token' });
      // Accept either direct myshopify domain or a website domain (we resolve it).
      const resolved = await resolveShopifyShopDomain(rawShop);
      const shopDomain = (resolved?.shop_domain || '').toString().toLowerCase();
      if (!shopDomain || !shopDomain.endsWith('.myshopify.com')) {
        return res.status(400).json({ error: 'Invalid shop domain' });
      }

      // Verify token by calling Shopify Admin GraphQL.
      const gql = {
        query: `query {\n  shop {\n    name\n    myshopifyDomain\n    primaryDomain { host url }\n  }\n}`,
      };
      const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-01';
      const url = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
      const r = await axios.post(url, gql, {
        timeout: 12000,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        validateStatus: (s) => s >= 200 && s < 500,
      });
      const data = r.data || {};
      const myshopify = (data?.data?.shop?.myshopifyDomain || '').toString().toLowerCase();
      if (!myshopify || !myshopify.endsWith('.myshopify.com')) {
        const msg =
          (Array.isArray(data?.errors) && data.errors[0]?.message) ||
          (Array.isArray(data?.errors) && data.errors.map((e) => e?.message).filter(Boolean).join('; ')) ||
          (data?.error?.toString?.() || '') ||
          '';
        return res.status(401).json({
          error: 'Invalid token or insufficient permissions',
          hint: 'Make sure you pasted the Admin API access token (shpat_...) from a custom app installed on this store, with products/inventory scopes.',
          details: msg || `HTTP ${r.status}`,
        });
      }

      // Save the token as the Shopify connection for this user.
      const cleanShop = myshopify.replace(/\.myshopify\.com$/i, '') + '.myshopify.com';
      await upsertToken({
        user_id: req.userId,
        platform: 'shopify',
        access_token: accessToken,
        refresh_token: null,
        expires_at: null,
        shop_domain: cleanShop,
        shop_id: cleanShop,
        status: 'connected',
      });
      res.json({
        ok: true,
        shop_domain: cleanShop,
        strategy: 'custom_token',
        shop_name: data?.data?.shop?.name || undefined,
      });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Server error' });
    }
  });

  authRouter.get('/shopify/resolve', async (req, res) => {
    try {
      const raw = (req.query.domain || req.query.shop || '').toString();
      if (!raw || !raw.trim()) {
        return res.status(400).json({ error: 'Missing domain' });
      }
      const debug = req.query.debug === '1' || req.query.debug === 'true';
      const out = await resolveShopifyShopDomain(raw, debug ? { debug: true } : undefined);
      if (!out || !out.shop_domain) {
        return res.status(404).json({
          error: 'Could not resolve Shopify shop domain from website domain',
          hint: 'Try entering the exact domain you use for your storefront (e.g. mystore.com). If this store uses a custom domain, it must ultimately map to a Shopify shop.',
          ...(debug ? { debug: out } : {}),
        });
      }
      res.json(out);
    } catch (e) {
      res.status(500).json({ error: e.message || 'Server error' });
    }
  });

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
    let stateStr = '';
    try {
      stateStr = signShopifyState({ userId: req.userId, shop, returnTo, iat: Date.now() });
    } catch (e) {
      return res.redirect(`${base}${connectPage}?error=${encodeURIComponent(e.message || 'Shopify app not configured')}${returnQ}`);
    }
    const authUrl = getShopifyAuthUrl(shop, stateStr);
    if (!authUrl || authUrl.includes('client_id=undefined') || !authUrl.includes('.myshopify.com')) {
      return res.redirect(`${base}${connectPage}?error=${encodeURIComponent('Shopify app not configured. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET in auralink-ai/publishing/.env and restart the publishing service.')}${returnQ}`);
    }
    res.redirect(authUrl);
  });
  authRouter.get('/shopify/callback', async (req, res) => {
    try {
      const result = await handleShopifyCallback(req.query);
      const base = FRONTEND_URL.replace(/\/$/, '');
      // When returning to the listing review publish flow, auto-retry publish after connect.
      const wantsAutoPublish =
        typeof result?.returnTo === 'string' &&
        (result.returnTo === 'review' ||
          result.returnTo === '/review' ||
          result.returnTo === 'flow-3' ||
          result.returnTo === 'flow-3.html' ||
          result.returnTo === '/flow-3' ||
          result.returnTo === '/flow-3.html');
      const qs = `shopify=connected&shop=${encodeURIComponent(result.shop_domain)}${wantsAutoPublish ? '&autopublish=1' : ''}`;
      if (result && result.returnTo) {
        const path = result.returnTo.startsWith('/') ? result.returnTo : `/${result.returnTo}`;
        res.redirect(`${base}${path}?${qs}`);
      } else {
        // Default: show a success screen in-app even when return_to is missing.
        res.redirect(`${base}${LISTING_PUBLISHED_PATH}?${qs}`);
      }
    } catch (e) {
      const base = FRONTEND_URL.replace(/\/$/, '');
      let returnTo = '';
      try {
        const s = parseShopifyState(req.query.state || '{}');
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
