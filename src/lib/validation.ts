import { isCategoryName } from './categories';
import type { ListingDraft, ListingField } from './types';

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 2000;
export const LOCATION_MAX = 80;
export const MESSAGE_MAX = 1000;
export const EMAIL_MAX = 254;
export const PRICE_MAX = 1_000_000;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const PHOTO_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export const PHOTO_ACCEPT = Object.keys(PHOTO_EXTENSIONS).join(',');

// The same pattern the database enforces, so both sides agree.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

// Counts Unicode code points, matching char_length() in Postgres.
export function charCount(text: string): number {
  return [...text].length;
}

export function isEmail(raw: string): boolean {
  const email = raw.trim();
  return email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email);
}

export function isUuid(raw: string): boolean {
  return UUID_PATTERN.test(raw);
}

// Accepts "120", "12.50", "$1,250". Returns null for anything else.
export function parsePrice(raw: string): number | null {
  const cleaned = raw.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!PRICE_PATTERN.test(cleaned)) return null;
  return Number(cleaned);
}

function emailError(raw: string): string | undefined {
  if (raw.trim() === '') return 'Enter your email';
  if (!isEmail(raw)) return 'Enter a valid email, like you@example.com';
  return undefined;
}

export function validateListing(draft: ListingDraft): Partial<Record<ListingField, string>> {
  const errors: Partial<Record<ListingField, string>> = {};

  const title = charCount(draft.title.trim());
  if (title === 0) errors.title = 'Add a title';
  else if (title > TITLE_MAX) errors.title = `Keep the title to ${TITLE_MAX} characters`;

  const description = charCount(draft.description.trim());
  if (description === 0) errors.description = 'Add a description';
  else if (description > DESCRIPTION_MAX) errors.description = 'Keep the description to 2,000 characters';

  if (draft.price.trim() === '') errors.price = 'Enter a price, or 0 for free';
  else {
    const price = parsePrice(draft.price);
    if (price === null) errors.price = 'Use a number, like 120 or 12.50';
    else if (price > PRICE_MAX) errors.price = 'Price can be at most 1,000,000';
  }

  if (!isCategoryName(draft.category)) errors.category = 'Choose a category';

  const email = emailError(draft.email);
  if (email) errors.email = email;

  if (charCount(draft.location.trim()) > LOCATION_MAX) errors.location = `Keep the location to ${LOCATION_MAX} characters`;

  return errors;
}

export function validateMessage(input: { email: string; message: string }): Partial<Record<'email' | 'message', string>> {
  const errors: Partial<Record<'email' | 'message', string>> = {};
  const email = emailError(input.email);
  if (email) errors.email = email;
  const length = charCount(input.message.trim());
  if (length === 0) errors.message = 'Write a message';
  else if (length > MESSAGE_MAX) errors.message = 'Keep the message to 1,000 characters';
  return errors;
}

export function photoExtension(type: string): 'jpg' | 'png' | 'webp' | null {
  return PHOTO_EXTENSIONS[type as keyof typeof PHOTO_EXTENSIONS] ?? null;
}

export function validatePhoto(file: { type: string; size: number }): string | null {
  if (photoExtension(file.type) === null) return 'Use a JPG, PNG or WebP image.';
  if (file.size > PHOTO_MAX_BYTES) return 'That photo is over 5MB.';
  return null;
}
