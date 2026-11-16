export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  seller_email: string;
  image_path: string;
  location: string | null;
  created_at: string;
  /** When the item was bought; null while it is for sale. */
  sold_at: string | null;
}

export interface ListingDraft {
  title: string;
  description: string;
  price: string;
  category: string;
  email: string;
  location: string;
}

export type ListingField = keyof ListingDraft;

export type Sort = 'new' | 'low' | 'high';

export interface Filters {
  category: string | null;
  q: string;
  min: number | null;
  max: number | null;
  sort: Sort;
}
