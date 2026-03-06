import axios from 'axios';
import { upsertToken } from '../db/tokens.js';

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_ENV = process.env.EBAY_ENV || 'sandbox';
const APP_URL = process.env.APP_URL || 'http://localhost:8001';

const BASE = EBAY_ENV === 'production' ? 'https://api.ebay.com' : 'https://api.sandbox.ebay.com';

export function getEbayAuthUrl(state) {
  const redirectUri = `${APP_URL}/auth/ebay/callback`;
  const scope = 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account';
  return `${BASE}/identity/v1/oauth2/authorize?client_id=${EBAY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
}

export async function handleEbayCallback(code, state) {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) throw new Error('eBay app not configured');
  const redirectUri = `${APP_URL}/auth/ebay/callback`;
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
  const userId = state || null;
  if (!userId) throw new Error('Missing user state');
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
  return { shop_id: shopId };
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
