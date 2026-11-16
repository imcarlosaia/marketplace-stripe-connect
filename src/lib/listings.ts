import { categoryBySlug } from './categories';
import { PHOTO_BUCKET, client } from './supabase';
import type { Filters, Listing, ListingDraft } from './types';
import { isUuid, parsePrice, photoExtension } from './validation';

const COLUMNS = 'id, title, description, price, category, seller_email, image_path, location, created_at, sold_at';
export const LISTING_LIMIT = 100;

function toListing(row: Record<string, unknown>): Listing {
  return { ...(row as unknown as Listing), price: Number(row.price) };
}

export async function fetchListings(filters: Filters): Promise<Listing[]> {
  let query = client().from('listings').select(COLUMNS);

  const category = categoryBySlug(filters.category);
  if (category) query = query.eq('category', category.name);
  if (filters.q) query = query.or(`title.ilike.*${filters.q}*,description.ilike.*${filters.q}*`);
  if (filters.min !== null) query = query.gte('price', filters.min);
  if (filters.max !== null) query = query.lte('price', filters.max);

  if (filters.sort === 'low') query = query.order('price', { ascending: true }).order('created_at', { ascending: false });
  else if (filters.sort === 'high') query = query.order('price', { ascending: false }).order('created_at', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query.limit(LISTING_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toListing);
}

export async function fetchListing(id: string): Promise<Listing | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await client().from('listings').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toListing(data) : null;
}

export async function uploadListingPhoto(file: File): Promise<string> {
  const extension = photoExtension(file.type);
  if (!extension) throw new Error('unsupported_photo');
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await client()
    .storage.from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function createListing(draft: ListingDraft, imagePath: string): Promise<Listing> {
  const row = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    price: parsePrice(draft.price),
    category: draft.category,
    seller_email: draft.email.trim(),
    image_path: imagePath,
    location: draft.location.trim() || null,
  };
  const { data, error } = await client().from('listings').insert(row).select(COLUMNS).single();
  if (error) throw new Error(error.message.includes('too_many_listings') ? 'too_many_listings' : error.message);
  return toListing(data);
}

export function photoUrl(path: string): string {
  return client().storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Whether the seller with this email has finished Stripe onboarding and can
// take payments. Pages may read only this flag, never the Stripe account id.
export async function fetchSellerReady(email: string): Promise<boolean> {
  const { data, error } = await client()
    .from('sellers')
    .select('charges_enabled')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.charges_enabled);
}
