import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const PHOTO_BUCKET = 'listing-images';

export const isConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}
