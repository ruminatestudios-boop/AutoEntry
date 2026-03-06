import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.warn('No Supabase config — using in-memory dev mode (data resets on restart). Set SUPABASE_URL and SUPABASE_SERVICE_KEY in publishing/.env for persistent data.');
}

export const supabase = url && key ? createClient(url, key) : null;

export function getSupabase() {
  return supabase;
}
