import crypto from 'crypto';
import axios from 'axios';
import { upsertToken } from '../db/tokens.js';

const ETSY_API_KEY = process.env.ETSY_API_KEY;
const ETSY_SHARED_SECRET = process.env.ETSY_SHARED_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:8001';

const AUTHORIZE_URL = 'https://www.etsy.com/oauth/connect';
const API_BASE = 'https://api.etsy.com';

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function getEtsyAuthUrl(state) {
  const redirectUri = `${APP_URL}/auth/etsy/callback`;
  const scope = 'listings_w listings_r transactions_r';
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  let stateObj;
  try {
    stateObj = typeof state === 'string' ? JSON.parse(state) : { ...state };
  } catch (_) {
    stateObj = { state };
  }
  stateObj.code_verifier = codeVerifier;
  const stateStr = JSON.stringify(stateObj);
  return `${AUTHORIZE_URL}?response_type=code&client_id=${ETSY_API_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(stateStr)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;
}

export async function handleEtsyCallback(code, state) {
  if (!ETSY_API_KEY || !ETSY_SHARED_SECRET) throw new Error('Etsy app not configured');
  const redirectUri = `${APP_URL}/auth/etsy/callback`;
  let userId = null;
  let returnTo = null;
  let codeVerifier = null;
  try {
    const parsed = typeof state === 'string' ? JSON.parse(state) : state;
    userId = parsed?.userId || parsed?.sub || parsed;
    returnTo = parsed?.returnTo || parsed?.return_to;
    codeVerifier = parsed?.code_verifier;
  } catch (_) {
    userId = state;
  }
  if (!userId) throw new Error('Missing user state');
  if (!codeVerifier) throw new Error('Missing PKCE code_verifier in state');
  const { data } = await axios.post(
    `${API_BASE}/v3/public/oauth/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: ETSY_API_KEY,
      code_verifier: codeVerifier,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': ETSY_API_KEY,
      },
      auth: { username: ETSY_API_KEY, password: ETSY_SHARED_SECRET },
    }
  );
  const expiresIn = data.expires_in || 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  let shopId = '';
  try {
    const me = await axios.get(`${API_BASE}/v3/application/users/me`, {
      headers: { 'x-api-key': ETSY_API_KEY, Authorization: `Bearer ${data.access_token}` },
    });
    shopId = me.data?.results?.[0]?.shop_id?.toString() || '';
  } catch (_) {}
  await upsertToken({
    user_id: userId,
    platform: 'etsy',
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    shop_id: shopId || 'etsy_shop',
    status: 'connected',
  });
  return { shop_id: shopId || 'etsy_shop', returnTo };
}

export async function refreshEtsy(refreshToken) {
  const { data } = await axios.post(
    `${API_BASE}/v3/public/oauth/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: ETSY_API_KEY,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-key': ETSY_API_KEY },
      auth: { username: ETSY_API_KEY, password: ETSY_SHARED_SECRET },
    }
  );
  const expiresIn = data.expires_in || 3600;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}
