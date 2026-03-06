import axios from 'axios';
import { upsertToken } from '../db/tokens.js';

const TIKTOK_APP_KEY = process.env.TIKTOK_APP_KEY;
const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:8001';

const BASE = 'https://auth.tiktok-shop.com';

export function getTikTokAuthUrl(state) {
  const redirectUri = `${APP_URL}/auth/tiktok/callback`;
  const scope = 'product.create,product.read';
  return `${BASE}/oauth/authorize?service_id=${TIKTOK_APP_KEY}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function handleTikTokCallback(code, state) {
  if (!TIKTOK_APP_KEY || !TIKTOK_APP_SECRET) throw new Error('TikTok app not configured');
  const redirectUri = `${APP_URL}/auth/tiktok/callback`;
  const { data } = await axios.post(
    `${BASE}/api/v2/token/get`,
    new URLSearchParams({
      app_key: TIKTOK_APP_KEY,
      app_secret: TIKTOK_APP_SECRET,
      auth_code: code,
      grant_type: 'authorized_code',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const accessToken = data.data?.access_token;
  const refreshToken = data.data?.refresh_token;
  const shopId = data.data?.shop_id?.toString?.() || data.data?.seller_base_info?.shop_id;
  const expiresIn = data.data?.access_token_expire_in || 86400;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const userId = state || null;
  if (!userId) throw new Error('Missing user state');
  await upsertToken({
    user_id: userId,
    platform: 'tiktok',
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    shop_id: shopId,
    status: 'connected',
  });
  return { shop_id: shopId };
}

export async function refreshTikTok(refreshToken, shopId) {
  const { data } = await axios.post(
    `${BASE}/api/v2/token/refresh`,
    new URLSearchParams({
      app_key: TIKTOK_APP_KEY,
      app_secret: TIKTOK_APP_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const accessToken = data.data?.access_token;
  const newRefresh = data.data?.refresh_token || refreshToken;
  const expiresIn = data.data?.access_token_expire_in || 86400;
  return {
    access_token: accessToken,
    refresh_token: newRefresh,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}
