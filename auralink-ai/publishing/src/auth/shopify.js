import axios from 'axios';
import { getSupabase } from '../db/client.js';
import { upsertToken } from '../db/tokens.js';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:8001';

function getRedirectUri() {
  return `${APP_URL}/auth/shopify/callback`;
}

export function getShopifyAuthUrl(state) {
  const shop = state?.shop || '';
  const scopes = 'write_products,read_products,write_inventory';
  const stateStr = typeof state === 'string' ? state : JSON.stringify(state || {});
  return `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(getRedirectUri())}&state=${encodeURIComponent(stateStr)}`;
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
  const cleanShop = shop.replace(/\.myshopify\.com$/, '') + '.myshopify.com';
  if (!userId) throw new Error('Missing user state');
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
