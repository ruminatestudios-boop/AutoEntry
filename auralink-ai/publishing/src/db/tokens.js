import { getSupabase } from './client.js';
import { encrypt, decrypt } from './encrypt.js';
import { getEnabledPlatforms } from '../config/platforms.js';
import { isDevMode, devGetTokenRow, devUpsertToken, devGetConnectedStores, devSetTokenStatus } from './devStore.js';

const DEV_USER_UUID = '00000000-0000-0000-0000-000000000001';

/** Synthetic Shopify row from SHOPIFY_DEV_* env (local or optional production demo). */
function shopifyDevEnvRow() {
  const shop = (process.env.SHOPIFY_DEV_SHOP_DOMAIN || '')
    .trim()
    .replace(/\.myshopify\.com$/i, '') + '.myshopify.com';
  return {
    access_token: process.env.SHOPIFY_DEV_ACCESS_TOKEN,
    refresh_token: null,
    expires_at: null,
    shop_id: shop,
    shop_domain: shop,
    status: 'connected',
  };
}

/**
 * Use env Admin API token for Shopify when:
 * - in-memory dev (no Supabase), or
 * - SHOPIFY_DEV_TOKEN_APPLIES_IN_PRODUCTION=1 (single-store demo on Cloud Run; disable for real multi-tenant).
 */
function shopifyUniversalDevTokenEnabled() {
  const tok = (process.env.SHOPIFY_DEV_ACCESS_TOKEN || '').trim();
  const domain = (process.env.SHOPIFY_DEV_SHOP_DOMAIN || '').trim();
  if (!tok || !domain) return false;
  if (isDevMode()) return true;
  return /^(1|true|yes)$/i.test(process.env.SHOPIFY_DEV_TOKEN_APPLIES_IN_PRODUCTION || '');
}

/** When using Supabase, map dev-local to the dev user UUID so FK to users(id) is satisfied. */
export function storageUserId(userId) {
  const db = getSupabase();
  if (!db) return userId;
  if (userId === 'dev-local') return process.env.DEV_USER_UUID || DEV_USER_UUID;
  return userId;
}

export async function getTokenRow(userId, platform) {
  if (isDevMode()) {
    // Dev-token bypass: use env Shopify token so publish works without OAuth (survives restarts).
    if (platform === 'shopify' && process.env.SHOPIFY_DEV_ACCESS_TOKEN && process.env.SHOPIFY_DEV_SHOP_DOMAIN) {
      return shopifyDevEnvRow();
    }
    return devGetTokenRow(userId, platform);
  }
  // Production + Supabase: optional same env token for all users (demo only).
  if (platform === 'shopify' && shopifyUniversalDevTokenEnabled()) {
    return shopifyDevEnvRow();
  }
  const db = getSupabase();
  if (!db) return null;
  const uid = storageUserId(userId);
  const { data, error } = await db
    .from('platform_tokens')
    .select('*')
    .eq('user_id', uid)
    .eq('platform', platform)
    .single();
  if (error || !data) return null;
  return data;
}

export async function upsertToken(row) {
  if (isDevMode()) {
    devUpsertToken(row);
    return row;
  }
  const db = getSupabase();
  if (!db) {
    devUpsertToken(row);
    return row;
  }
  const access_enc = row.access_token ? encrypt(row.access_token) : null;
  const refresh_enc = row.refresh_token ? encrypt(row.refresh_token) : null;
  const payload = {
    user_id: storageUserId(row.user_id),
    platform: row.platform,
    access_token: access_enc ?? row.access_token,
    refresh_token: refresh_enc ?? row.refresh_token,
    expires_at: row.expires_at ?? null,
    shop_id: row.shop_id ?? null,
    shop_domain: row.shop_domain ?? null,
    region: row.region ?? null,
    status: row.status ?? 'connected',
    connected_at: row.connected_at || new Date().toISOString(),
  };
  const { data, error } = await db
    .from('platform_tokens')
    .upsert(payload, { onConflict: 'user_id,platform' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setTokenStatus(userId, platform, status) {
  if (isDevMode()) { devSetTokenStatus(userId, platform, status); return; }
  const db = getSupabase();
  if (!db) return;
  await db.from('platform_tokens').update({ status }).eq('user_id', storageUserId(userId)).eq('platform', platform);
}

export function getDecryptedAccessToken(row) {
  if (!row || !row.access_token) return null;
  try {
    return decrypt(row.access_token);
  } catch {
    return row.access_token;
  }
}

export function getDecryptedRefreshToken(row) {
  if (!row || !row.refresh_token) return null;
  try {
    return decrypt(row.refresh_token);
  } catch {
    return row.refresh_token;
  }
}

export async function getConnectedStores(userId) {
  const platforms = getEnabledPlatforms();
  if (isDevMode()) {
    const out = devGetConnectedStores(userId, platforms);
    if (platforms.includes('shopify') && process.env.SHOPIFY_DEV_ACCESS_TOKEN && process.env.SHOPIFY_DEV_SHOP_DOMAIN) {
      const shop = process.env.SHOPIFY_DEV_SHOP_DOMAIN.replace(/\.myshopify\.com$/i, '') + '.myshopify.com';
      out.shopify = { status: 'connected', shop_domain: shop, shop_id: shop };
    }
    return out;
  }
  const db = getSupabase();
  if (!db) return Object.fromEntries(platforms.map((p) => [p, { status: 'not_connected' }]));
  const { data } = await db.from('platform_tokens').select('platform, status, shop_domain, shop_id, region').eq('user_id', storageUserId(userId));
  const out = {};
  platforms.forEach(p => { out[p] = { status: 'not_connected' }; });
  (data || []).forEach(r => {
    if (platforms.includes(r.platform)) {
      out[r.platform] = {
        status: r.status,
        shop_domain: r.shop_domain ?? undefined,
        shop_id: r.shop_id ?? undefined,
        region: r.region ?? undefined,
      };
    }
  });
  if (platforms.includes('shopify') && shopifyUniversalDevTokenEnabled()) {
    const shop = (process.env.SHOPIFY_DEV_SHOP_DOMAIN || '')
      .trim()
      .replace(/\.myshopify\.com$/i, '') + '.myshopify.com';
    out.shopify = { status: 'connected', shop_domain: shop, shop_id: shop };
  }
  return out;
}
