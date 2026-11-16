import { describe, expect, it } from 'vitest';
import { cleanSearch, filtersToQuery, parseFilters } from './filters';

const parse = (query: string) => parseFilters(new URLSearchParams(query));

describe('parseFilters', () => {
  it('returns defaults for an empty query', () => {
    expect(parse('')).toEqual({ category: null, q: '', min: null, max: null, sort: 'new' });
  });

  it('reads a known category, search, prices and sort', () => {
    expect(parse('category=electronics&q=laptop&min=10&max=500&sort=low')).toEqual({
      category: 'electronics',
      q: 'laptop',
      min: 10,
      max: 500,
      sort: 'low',
    });
  });

  it('ignores an unknown category, bad numbers and an unknown sort', () => {
    expect(parse('category=weapons&min=abc&max=-3&sort=random')).toEqual({
      category: null,
      q: '',
      min: null,
      max: null,
      sort: 'new',
    });
  });

  it('swaps a minimum that is above the maximum', () => {
    expect(parse('min=500&max=10')).toMatchObject({ min: 10, max: 500 });
  });
});

describe('filtersToQuery', () => {
  it('omits defaults', () => {
    expect(filtersToQuery({ category: null, q: '', min: null, max: null, sort: 'new' })).toBe('');
  });

  it('round-trips through parseFilters', () => {
    const filters = { category: 'home-goods', q: 'sofa bed', min: 0, max: 300, sort: 'high' as const };
    const query = filtersToQuery(filters);
    expect(query.startsWith('?')).toBe(true);
    expect(parse(query.slice(1))).toEqual(filters);
  });
});

describe('cleanSearch', () => {
  it('trims, collapses spaces and removes characters that would change the query', () => {
    expect(cleanSearch('  red   bike  ')).toBe('red bike');
    expect(cleanSearch('50% off, (new)_\\"x"')).toBe('50 off new x');
  });

  it('limits the term to 100 characters', () => {
    expect(cleanSearch('a'.repeat(150))).toHaveLength(100);
  });
});
