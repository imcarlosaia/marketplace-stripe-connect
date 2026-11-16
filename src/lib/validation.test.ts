import { describe, expect, it } from 'vitest';
import {
  PHOTO_MAX_BYTES,
  isEmail,
  isUuid,
  parsePrice,
  photoExtension,
  validateListing,
  validateMessage,
  validatePhoto,
} from './validation';
import type { ListingDraft } from './types';

const good: ListingDraft = {
  title: 'City bike',
  description: 'Light frame, new tyres.',
  price: '120',
  category: 'Sporting Goods',
  email: 'seller@example.com',
  location: '',
};

describe('parsePrice', () => {
  it('reads whole numbers, decimals, commas and a leading dollar sign', () => {
    expect(parsePrice('120')).toBe(120);
    expect(parsePrice(' 12.5 ')).toBe(12.5);
    expect(parsePrice('12.50')).toBe(12.5);
    expect(parsePrice('$1,250')).toBe(1250);
    expect(parsePrice('0')).toBe(0);
  });

  it('rejects anything that is not a plain amount', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('-5')).toBeNull();
    expect(parsePrice('1.234')).toBeNull();
    expect(parsePrice('1e3')).toBeNull();
  });
});

describe('isEmail', () => {
  it('accepts ordinary addresses and rejects malformed ones', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail(' a@b.co ')).toBe(true);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('a b@c.de')).toBe(false);
    expect(isEmail('@c.de')).toBe(false);
    expect(isEmail(`${'a'.repeat(250)}@b.co`)).toBe(false);
  });
});

describe('isUuid', () => {
  it('accepts a UUID and rejects other strings', () => {
    expect(isUuid('0e4f6c1a-2b3c-4d5e-8f90-123456789abc')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
  });
});

describe('validateListing', () => {
  it('accepts a complete listing', () => {
    expect(validateListing(good)).toEqual({});
  });

  it('requires every field except location', () => {
    const errors = validateListing({ title: ' ', description: '', price: '', category: '', email: '', location: '' });
    expect(Object.keys(errors).sort()).toEqual(['category', 'description', 'email', 'price', 'title']);
  });

  it('enforces the title limit of 80 characters', () => {
    expect(validateListing({ ...good, title: 'a'.repeat(80) }).title).toBeUndefined();
    expect(validateListing({ ...good, title: 'a'.repeat(81) }).title).toBe('Keep the title to 80 characters');
  });

  it('enforces the description limit of 2,000 characters', () => {
    expect(validateListing({ ...good, description: 'a'.repeat(2000) }).description).toBeUndefined();
    expect(validateListing({ ...good, description: 'a'.repeat(2001) }).description).toBe(
      'Keep the description to 2,000 characters',
    );
  });

  it('enforces the price range and format', () => {
    expect(validateListing({ ...good, price: '0' }).price).toBeUndefined();
    expect(validateListing({ ...good, price: '1000000' }).price).toBeUndefined();
    expect(validateListing({ ...good, price: '1000000.01' }).price).toBe('Price can be at most 1,000,000');
    expect(validateListing({ ...good, price: 'ten' }).price).toBe('Use a number, like 120 or 12.50');
  });

  it('only accepts one of the 19 categories', () => {
    expect(validateListing({ ...good, category: 'Weapons' }).category).toBe('Choose a category');
  });

  it('checks the email address', () => {
    expect(validateListing({ ...good, email: 'nope' }).email).toBe('Enter a valid email, like you@example.com');
  });

  it('limits the optional location to 80 characters', () => {
    expect(validateListing({ ...good, location: 'a'.repeat(80) }).location).toBeUndefined();
    expect(validateListing({ ...good, location: 'a'.repeat(81) }).location).toBe('Keep the location to 80 characters');
  });
});

describe('validateMessage', () => {
  it('accepts a valid message', () => {
    expect(validateMessage({ email: 'buyer@example.com', message: 'Is it available?' })).toEqual({});
  });

  it('requires a valid email and a message of at most 1,000 characters', () => {
    expect(validateMessage({ email: '', message: '' })).toEqual({
      email: 'Enter your email',
      message: 'Write a message',
    });
    expect(validateMessage({ email: 'b@c.de', message: 'a'.repeat(1000) }).message).toBeUndefined();
    expect(validateMessage({ email: 'b@c.de', message: 'a'.repeat(1001) }).message).toBe(
      'Keep the message to 1,000 characters',
    );
  });
});

describe('validatePhoto and photoExtension', () => {
  it('accepts JPEG, PNG and WebP up to 5 MB', () => {
    expect(validatePhoto({ type: 'image/jpeg', size: PHOTO_MAX_BYTES })).toBeNull();
    expect(validatePhoto({ type: 'image/png', size: 10 })).toBeNull();
    expect(validatePhoto({ type: 'image/webp', size: 10 })).toBeNull();
  });

  it('rejects other types and larger files', () => {
    expect(validatePhoto({ type: 'image/gif', size: 10 })).toBe('Use a JPG, PNG or WebP image.');
    expect(validatePhoto({ type: 'image/png', size: PHOTO_MAX_BYTES + 1 })).toBe('That photo is over 5MB.');
  });

  it('maps types to file extensions', () => {
    expect(photoExtension('image/jpeg')).toBe('jpg');
    expect(photoExtension('image/png')).toBe('png');
    expect(photoExtension('image/webp')).toBe('webp');
    expect(photoExtension('text/plain')).toBeNull();
  });
});
