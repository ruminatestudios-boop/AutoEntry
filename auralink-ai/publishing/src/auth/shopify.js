import axios from 'axios';
import { getSupabase } from '../db/client.js';
import { upsertToken } from '../db/tokens.js';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:8001';

function getRedirectUri() {
  return `${APP_URL}/auth/shopify/callback`;
}

/** Build Shopify OAuth authorize URL. Accepts (shop, stateStr) or legacy (stateJsonString). */
export function getShopifyAuthUrl(shopOrState, stateStr) {
  const scopes = 'write_products,read_products,write_inventory';
  let shop = '';
  let stateStrOut = stateStr;
  if (typeof shopOrState === 'string' && shopOrState.trim() !== '') {
    const trimmed = shopOrState.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed.shop === 'string' && parsed.shop.trim()) {
          shop = parsed.shop.trim().toLowerCase();
          stateStrOut = stateStrOut || trimmed;
        }
      } catch (_) {}
    }
    if (!shop) shop = trimmed.toLowerCase();
  }
  if (!shop) return null;
  const shopNorm = shop.replace(/\.myshopify\.com$/i, '') + '.myshopify.com';
  if (!/\.myshopify\.com$/i.test(shopNorm) || shopNorm.length < 10) return null;
  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) return null;
  return `https://${shopNorm}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(getRedirectUri())}&state=${encodeURIComponent(stateStrOut || '{}')}`;
}

export async function handleShopifyCallback(code, shop, stateStr) {
  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) throw new Error('Shopify app not configured');
  let userId = null;
  let returnTo = null;
  try {
    const state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
    userId = state?.userId || state?.sub || state;
    returnTo = state?.returnTo || state?.return_to;
  } catch (_) {
    userId = stateStr;
  }
  // When user installs via Partner Dashboard "Generate link" (Custom app), state may be missing.
  // Default to dev-local so the token is stored for the same user flow-3 / dev-token uses.
  if (!userId) {
    userId = process.env.SHOPIFY_FALLBACK_USER_ID || 'dev-local';
  }
  const cleanShop = shop.replace(/\.myshopify\.com$/, '') + '.myshopify.com';
  const { data } = await axios.post(
    `https://${cleanShop}/admin/oauth/access_token`,
    {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );
  await upsertToken({
    user_id: userId,
    platform: 'shopify',
    access_token: data.access_token,
    refresh_token: null,
    expires_at: null,
    shop_domain: cleanShop,
    shop_id: cleanShop,
    status: 'connected',
  });
  return { shop_domain: cleanShop, returnTo };
}

export async function refreshShopify() {
  return Promise.resolve(null);
}
