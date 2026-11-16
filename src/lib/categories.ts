export interface Category {
  name: string;
  slug: string;
}

export const CATEGORIES: readonly Category[] = [
  { name: 'Vehicles', slug: 'vehicles' },
  { name: 'Property Rentals', slug: 'property-rentals' },
  { name: 'Apparel', slug: 'apparel' },
  { name: 'Classifieds', slug: 'classifieds' },
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Entertainment', slug: 'entertainment' },
  { name: 'Family', slug: 'family' },
  { name: 'Free Stuff', slug: 'free-stuff' },
  { name: 'Garden & Outdoor', slug: 'garden-outdoor' },
  { name: 'Hobbies', slug: 'hobbies' },
  { name: 'Home Goods', slug: 'home-goods' },
  { name: 'Home Improvement', slug: 'home-improvement' },
  { name: 'Home Sales', slug: 'home-sales' },
  { name: 'Musical Instruments', slug: 'musical-instruments' },
  { name: 'Office Supplies', slug: 'office-supplies' },
  { name: 'Pet Supplies', slug: 'pet-supplies' },
  { name: 'Sporting Goods', slug: 'sporting-goods' },
  { name: 'Toys & Games', slug: 'toys-games' },
  { name: 'Buy and sell groups', slug: 'buy-and-sell-groups' },
];

export function categoryBySlug(slug: string | null | undefined): Category | null {
  return CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function categoryByName(name: string): Category | null {
  return CATEGORIES.find((category) => category.name === name) ?? null;
}

export function isCategoryName(name: string): boolean {
  return categoryByName(name) !== null;
}
