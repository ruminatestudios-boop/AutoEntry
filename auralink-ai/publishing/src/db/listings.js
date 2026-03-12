import { getSupabase } from './client.js';
import { storageUserId } from './tokens.js';
import { isDevMode, devGetListingById, devGetListingsByUser, devInsertListing, devUpdateListingStatus } from './devStore.js';

export async function getListingById(listingId) {
  if (isDevMode()) return devGetListingById(listingId);
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db.from('listings').select('*').eq('id', listingId).single();
  if (error || !data) return null;
  return data;
}

export async function getListingsByUserId(userId) {
  if (isDevMode()) return devGetListingsByUser(userId);
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db.from('listings').select('id, user_id, universal_data, status, created_at, publish_results').eq('user_id', storageUserId(userId)).order('created_at', { ascending: false }).limit(100);
  if (error) return [];
  return data || [];
}

export async function insertListing(userId, universalData) {
  if (isDevMode()) return devInsertListing(userId, universalData);
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db.from('listings').insert({
    user_id: storageUserId(userId),
    universal_data: universalData || {},
    status: 'draft',
  }).select('id').single();
  if (error || !data) return null;
  return data.id;
}

export async function updateListingStatus(listingId, status, publishResults = null) {
  if (isDevMode()) { devUpdateListingStatus(listingId, status, publishResults); return; }
  const db = getSupabase();
  if (!db) return;
  const payload = { status };
  if (publishResults != null) payload.publish_results = publishResults;
  await db.from('listings').update(payload).eq('id', listingId);
}

export async function insertPublishResults(listingId, platformResults) {
  const db = getSupabase();
  if (!db && !isDevMode()) return;
  if (isDevMode()) return; // no-op in dev
  const rows = Object.entries(platformResults).map(([platform, r]) => ({
    listing_id: listingId,
    platform,
    success: r.success,
    platform_listing_id: r.platform_listing_id ?? null,
    platform_listing_url: r.url ?? r.platform_listing_url ?? null,
    error_message: r.error ?? null,
    published_at: new Date().toISOString(),
  }));
  await db.from('publish_results').insert(rows);
}

export async function incrementUserListings(userId) {
  const db = getSupabase();
  if (!db) return;
  if (isDevMode()) return;
  const uid = storageUserId(userId);
  const { error } = await db.rpc('increment_total_listings', { uid });
  if (error) {
    const { data } = await db.from('users').select('total_listings').eq('id', uid).single();
    if (data) await db.from('users').update({ total_listings: (data.total_listings || 0) + 1 }).eq('id', uid);
  }
}

export async function getUserTotalListings(userId) {
  const db = getSupabase();
  if (!db) return 0;
  if (isDevMode()) return 0;
  const { data } = await db.from('users').select('total_listings').eq('id', storageUserId(userId)).single();
  return data?.total_listings ?? 0;
}
