import { getTokenRow, upsertToken, setTokenStatus, getDecryptedAccessToken, getDecryptedRefreshToken } from '../db/tokens.js';
import { refreshShopify } from './shopify.js';
import { refreshTikTok } from './tiktok.js';
import { refreshEbay } from './ebay.js';
import { refreshEtsy } from './etsy.js';
import { refreshAmazon } from './amazon.js';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Get a valid access token for the user+platform. Refreshes if expires within 1 hour.
 * @param {string} userId - UUID
 * @param {string} platform - 'shopify'|'tiktok'|'ebay'|'etsy'|'amazon'
 * @returns {Promise<{ accessToken: string, row: object }>}
 */
export async function getValidToken(userId, platform) {
  const row = await getTokenRow(userId, platform);
  if (!row) {
    const e = new Error(`Not connected: ${platform}`);
    e.code = 'NOT_CONNECTED';
    throw e;
  }
  if (row.status !== 'connected') {
    const e = new Error(`Token ${row.status}: ${platform}`);
    e.code = 'AUTH_ERROR';
    e.platform = platform;
    throw e;
  }

  const accessToken = getDecryptedAccessToken(row);
  if (!accessToken) {
    await setTokenStatus(userId, platform, 'expired');
    const e = new Error(`Invalid token: ${platform}`);
    e.code = 'AUTH_ERROR';
    e.platform = platform;
    throw e;
  }

  // Shopify: permanent token, no refresh
  if (platform === 'shopify') {
    return { accessToken, row };
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const now = Date.now();
  if (expiresAt && expiresAt - now > ONE_HOUR_MS) {
    return { accessToken, row };
  }

  const refreshToken = getDecryptedRefreshToken(row);
  if (!refreshToken) {
    await setTokenStatus(userId, platform, 'expired');
    const e = new Error(`No refresh token: ${platform}`);
    e.code = 'AUTH_ERROR';
    e.platform = platform;
    throw e;
  }

  let refreshed;
  try {
    switch (platform) {
      case 'tiktok':
        refreshed = await refreshTikTok(refreshToken, row.shop_id);
        break;
      case 'ebay':
        refreshed = await refreshEbay(refreshToken);
        break;
      case 'etsy':
        refreshed = await refreshEtsy(refreshToken);
        break;
      case 'amazon':
        refreshed = await refreshAmazon(refreshToken, row.region);
        break;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  } catch (err) {
    await setTokenStatus(userId, platform, 'expired');
    const e = new Error(err.message || `Refresh failed: ${platform}`);
    e.code = 'AUTH_ERROR';
    e.platform = platform;
    throw e;
  }

  await upsertToken({
    user_id: userId,
    platform,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? refreshToken,
    expires_at: refreshed.expires_at ?? null,
    shop_id: row.shop_id,
    shop_domain: row.shop_domain,
    region: row.region,
    status: 'connected',
  });

  return { accessToken: refreshed.access_token, row: { ...row, access_token: refreshed.access_token } };
}
