import { getSupabase } from './client.js';
import { encrypt, decrypt } from './encrypt.js';
import { getEnabledPlatforms } from '../config/platforms.js';
import { isDevMode, devGetTokenRow, devUpsertToken, devGetConnectedStores, devSetTokenStatus } from './devStore.js';

const DEV_USER_UUID = '00000000-0000-0000-0000-000000000001';
const clerkUuidCache = new Map();

/** Clerk production IDs (user_…) — mapped to a users-table UUID for platform_tokens FK. */
export function isClerkUserId(userId) {
  return typeof userId === 'string' && userId.startsWith('user_');
}

function clerkPlaceholderEmail(clerkUserId) {
  const safe = String(clerkUserId).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 120);
  return `clerk+${safe}@synclyst.internal`;
}

/** Map Clerk user id → users.id UUID (creates placeholder user row on first connect). */
export async function resolveStorageUserId(userId) {
  if (!isClerkUserId(userId)) return storageUserId(userId);
  if (clerkUuidCache.has(userId)) return clerkUuidCache.get(userId);

  const db = getSupabase();
  if (!db || isDevMode()) return userId;

  const email = clerkPlaceholderEmail(userId);
  const { data: existing } = await db.from('users').select('id').eq('email', email).maybeSingle();
  if (existing?.id) {
    clerkUuidCache.set(userId, existing.id);
    return existing.id;
  }

  const { data: inserted, error } = await db.from('users').insert({ email }).select('id').single();
  if (error) {
    const retry = await db.from('users').select('id').eq('email', email).maybeSingle();
    if (retry.data?.id) {
      clerkUuidCache.set(userId, retry.data.id);
      return retry.data.id;
    }
    throw error;
  }
  clerkUuidCache.set(userId, inserted.id);
  return inserted.id;
}

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

function shopifyUniversalDevTokenEnabled() {
  const tok = (process.env.SHOPIFY_DEV_ACCESS_TOKEN || '').trim();
  const domain = (process.env.SHOPIFY_DEV_SHOP_DOMAIN || '').trim();
  if (!tok || !domain) return false;
  if (isDevMode()) return true;
  return /^(1|true|yes)$/i.test(process.env.SHOPIFY_DEV_TOKEN_APPLIES_IN_PRODUCTION || '');
}

/** Legacy sync helper — prefer resolveStorageUserId for DB writes. */
export function storageUserId(userId) {
  const db = getSupabase();
  if (!db) return userId;
  if (userId === 'dev-local') return process.env.DEV_USER_UUID || DEV_USER_UUID;
  return userId;
}

export async function getTokenRow(userId, platform) {
  if (isDevMode()) {
    if (platform === 'shopify' && process.env.SHOPIFY_DEV_ACCESS_TOKEN && process.env.SHOPIFY_DEV_SHOP_DOMAIN) {
      return shopifyDevEnvRow();
    }
    return devGetTokenRow(userId, platform);
  }
  if (platform === 'shopify' && shopifyUniversalDevTokenEnabled()) {
    return shopifyDevEnvRow();
  }
  const db = getSupabase();
  if (!db) return null;
  const uid = await resolveStorageUserId(userId);
  const { data, error } = await db
    .from('platform_tokens')
    .select('*')
    .eq('user_id', uid)
    .eq('platform', platform)
    .maybeSingle();
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
  const uid = await resolveStorageUserId(row.user_id);
  const payload = {
    user_id: uid,
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
  if (isClerkUserId(row.user_id)) {
    payload.clerk_user_id = row.user_id;
  } else if (row.clerk_user_id) {
    payload.clerk_user_id = row.clerk_user_id;
  }
  const { data, error } = await db
    .from('platform_tokens')
    .upsert(payload, { onConflict: 'user_id,platform' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setTokenStatus(userId, platform, status) {
  if (isDevMode()) {
    devSetTokenStatus(userId, platform, status);
    return;
  }
  const db = getSupabase();
  if (!db) return;
  const uid = await resolveStorageUserId(userId);
  await db.from('platform_tokens').update({ status }).eq('user_id', uid).eq('platform', platform);
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

  const uid = await resolveStorageUserId(userId);
  const { data } = await db
    .from('platform_tokens')
    .select('platform, status, shop_domain, shop_id, region')
    .eq('user_id', uid);

  const out = {};
  platforms.forEach((p) => {
    out[p] = { status: 'not_connected' };
  });
  (data || []).forEach((r) => {
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
