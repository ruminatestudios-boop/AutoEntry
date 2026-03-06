import axios from 'axios';
import { upsertToken } from '../db/tokens.js';

const AMAZON_CLIENT_ID = process.env.AMAZON_CLIENT_ID;
const AMAZON_CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:8001';

const LWA_URL = 'https://api.amazon.com/auth/o2/token';

export function getAmazonAuthUrl(state) {
  const redirectUri = `${APP_URL}/auth/amazon/callback`;
  return `https://sellercentral.amazon.co.uk/apps/authorize/consent?application_id=${AMAZON_CLIENT_ID}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function handleAmazonCallback(code, state, region = 'uk') {
  if (!AMAZON_CLIENT_ID || !AMAZON_CLIENT_SECRET) throw new Error('Amazon app not configured');
  const redirectUri = `${APP_URL}/auth/amazon/callback`;
  const { data } = await axios.post(
    LWA_URL,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: AMAZON_CLIENT_ID,
      client_secret: AMAZON_CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const expiresIn = data.expires_in || 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const userId = state || null;
  if (!userId) throw new Error('Missing user state');
  await upsertToken({
    user_id: userId,
    platform: 'amazon',
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    region,
    shop_id: region,
    status: 'connected',
  });
  return { region, shop_id: region };
}

export async function refreshAmazon(refreshToken, region) {
  const { data } = await axios.post(
    LWA_URL,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: AMAZON_CLIENT_ID,
      client_secret: AMAZON_CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const expiresIn = data.expires_in || 3600;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}
