/**
 * In-memory store for development when Supabase is not configured or unavailable.
 * Allows dev-token, connect, create listing, and publish to work without a database.
 */
import { getSupabase } from './client.js';

const DEV_USER_ID = 'dev-local';

const listings = new Map(); // listingId -> { user_id, universal_data, status }
const tokens = new Map();   // `${userId}:${platform}` -> { access_token, shop_domain, shop_id, status, ... }
let nextListingId = 1;

export function getDevUserId() {
  return DEV_USER_ID;
}

/** True when Supabase is not configured OR client failed to init (e.g. wrong key format). When DEV_BYPASS_ETSY_LOGIN is set, use in-memory store so we never hit Supabase. */
export function isDevMode() {
  if (process.env.DEV_BYPASS_ETSY_LOGIN === 'true' || process.env.DEV_BYPASS_ETSY_LOGIN === '1') return true;
  if (process.env.SUPABASE_URL == null || process.env.SUPABASE_URL === '') return true;
  if (getSupabase() === null) return true;
  return false;
}

// --- Listings (used by publish router when no Supabase)
export function devInsertListing(userId, universalData) {
  const id = String(nextListingId++);
  listings.set(id, { user_id: userId, universal_data: universalData || {}, status: 'draft' });
  return id;
}

export function devGetListingById(listingId) {
  const row = listings.get(String(listingId));
  if (!row) return null;
  return {
    id: listingId,
    user_id: row.user_id,
    universal_data: row.universal_data,
    status: row.status,
    publish_results: row.publish_results || null,
  };
}

export function devUpdateListingStatus(listingId, status, publishResults = null) {
  const row = listings.get(String(listingId));
  if (row) {
    row.status = status;
    if (publishResults != null) row.publish_results = publishResults;
  }
}

/** List all listings for a user (newest first by id). */
export function devGetListingsByUser(userId) {
  const out = [];
  for (const [id, row] of listings) {
    if (row.user_id === userId) {
      out.push({
        id,
        user_id: row.user_id,
        universal_data: row.universal_data,
        status: row.status,
        publish_results: row.publish_results || null,
      });
    }
  }
  out.sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }));
  return out;
}

// --- Tokens (used by tokens.js and auth when no Supabase)
export function devUpsertToken(row) {
  const key = `${row.user_id}:${row.platform}`;
  tokens.set(key, {
    ...row,
    access_token: row.access_token,
    refresh_token: row.refresh_token ?? null,
    status: row.status ?? 'connected',
  });
}

export function devGetTokenRow(userId, platform) {
  const key = `${userId}:${platform}`;
  const row = tokens.get(key);
  if (!row) return null;
  return {
    ...row,
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.expires_at,
    shop_id: row.shop_id,
    shop_domain: row.shop_domain,
    region: row.region,
    status: row.status,
  };
}

export function devSetTokenStatus(userId, platform, status) {
  const key = `${userId}:${platform}`;
  const row = tokens.get(key);
  if (row) row.status = status;
}

export function devGetConnectedStores(userId, enabledPlatforms) {
  const out = {};
  enabledPlatforms.forEach((p) => { out[p] = { status: 'not_connected' }; });
  for (const [key, row] of tokens) {
    if (key.startsWith(userId + ':') && enabledPlatforms.includes(row.platform)) {
      out[row.platform] = {
        status: row.status || 'connected',
        shop_domain: row.shop_domain,
        shop_id: row.shop_id,
        region: row.region,
      };
    }
  }
  return out;
}
