import { getSupabase } from './client.js';
import { encrypt, decrypt } from './encrypt.js';
import { getEnabledPlatforms } from '../config/platforms.js';
import { isDevMode, devGetTokenRow, devUpsertToken, devGetConnectedStores, devSetTokenStatus } from './devStore.js';

export async function getTokenRow(userId, platform) {
  if (isDevMode()) return devGetTokenRow(userId, platform);
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from('platform_tokens')
    .select('*')
    .eq('user_id', userId)
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
  if (!db) throw new Error('Database not configured');
  const access_enc = row.access_token ? encrypt(row.access_token) : null;
  const refresh_enc = row.refresh_token ? encrypt(row.refresh_token) : null;
  const payload = {
    user_id: row.user_id,
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
  await db.from('platform_tokens').update({ status }).eq('user_id', userId).eq('platform', platform);
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
  if (isDevMode()) return devGetConnectedStores(userId, platforms);
  const db = getSupabase();
  if (!db) return Object.fromEntries(platforms.map((p) => [p, { status: 'not_connected' }]));
  const { data } = await db.from('platform_tokens').select('platform, status, shop_domain, shop_id, region').eq('user_id', userId);
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
  return out;
}
