import { getSupabase } from './client.js';

const DEV_EMAIL = 'dev@auralink.local';

/**
 * Get or create a dev user for local/testing. Returns user id.
 */
export async function getOrCreateDevUser() {
  const db = getSupabase();
  if (!db) return null;
  const { data: existing } = await db.from('users').select('id').eq('email', DEV_EMAIL).single();
  if (existing) return existing.id;
  const { data: inserted, error } = await db.from('users').insert({ email: DEV_EMAIL }).select('id').single();
  if (error || !inserted) return null;
  return inserted.id;
}
