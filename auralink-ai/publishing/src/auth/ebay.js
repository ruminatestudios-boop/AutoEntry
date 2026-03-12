import axios from 'axios';
import { upsertToken } from '../db/tokens.js';

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_RUNAME = process.env.EBAY_RUNAME || '';
const EBAY_ENV = process.env.EBAY_ENV || 'sandbox';
const APP_URL = process.env.APP_URL || 'http://localhost:8001';

const BASE = EBAY_ENV === 'production' ? 'https://api.ebay.com' : 'https://api.sandbox.ebay.com';
const AUTH_BASE = EBAY_ENV === 'production' ? 'https://auth.ebay.com' : 'https://auth.sandbox.ebay.com';

/** redirect_uri for OAuth must be the RuName value from eBay (User Tokens), not the actual URL */
function getRedirectUri() {
  if (EBAY_RUNAME && EBAY_RUNAME.trim()) return EBAY_RUNAME.trim();
  return null;
}

export function getEbayAuthUrl(state) {
  const redirectUri = getRedirectUri();
  if (!redirectUri) {
    throw new Error('EBAY_RUNAME is required. In eBay Developer Portal go to Application Keys → User Tokens (next to App ID) → add a Redirect URL and set Auth Accepted URL to your callback (e.g. http://localhost:8001/auth/ebay/callback). Copy the RuName value into .env as EBAY_RUNAME.');
  }
  const scope = 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account';
  return `${AUTH_BASE}/oauth2/authorize?client_id=${EBAY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
}

export async function handleEbayCallback(code, state) {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) throw new Error('eBay app not configured');
  let userId = state || null;
  let returnTo = '';
  try {
    const parsed = typeof state === 'string' && state.startsWith('{') ? JSON.parse(state) : null;
    if (parsed && parsed.userId) {
      userId = parsed.userId;
      returnTo = parsed.returnTo || '';
    }
  } catch (_) {
    // state is plain userId string
  }
  if (!userId) throw new Error('Missing user state');
  const redirectUri = getRedirectUri();
  if (!redirectUri) throw new Error('EBAY_RUNAME is required in .env. See EBAY-SETUP.md.');
  const creds = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  const { data } = await axios.post(
    `${BASE}/identity/v1/oauth2/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${creds}` } }
  );
  const expiresIn = data.expires_in || 7200;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const shopId = data.refresh_token?.slice(0, 20) || 'ebay_user';
  await upsertToken({
    user_id: userId,
    platform: 'ebay',
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    shop_id: shopId,
    status: 'connected',
  });
  return { shop_id: shopId, returnTo };
}

export async function refreshEbay(refreshToken) {
  const creds = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  const { data } = await axios.post(
    `${BASE}/identity/v1/oauth2/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${creds}` } }
  );
  const expiresIn = data.expires_in || 7200;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}
