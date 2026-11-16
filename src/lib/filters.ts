import { categoryBySlug } from './categories';
import type { Filters, Sort } from './types';

export const SEARCH_MAX = 100;
const SORTS: readonly Sort[] = ['new', 'low', 'high'];

export const DEFAULT_FILTERS: Filters = { category: null, q: '', min: null, max: null, sort: 'new' };

// Removes characters that carry meaning in the database's search filter, so a
// search term can only ever match text, never change the query.
export function cleanSearch(raw: string): string {
  return raw
    .replace(/[%_\\,()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_MAX);
}

function amount(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseFilters(params: URLSearchParams): Filters {
  const category = categoryBySlug(params.get('category'))?.slug ?? null;
  const q = cleanSearch(params.get('q') ?? '');
  let min = amount(params.get('min'));
  let max = amount(params.get('max'));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const sortParam = params.get('sort') as Sort | null;
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : 'new';
  return { category, q, min, max, sort };
}

export function filtersToQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.q) params.set('q', filters.q);
  if (filters.min !== null) params.set('min', String(filters.min));
  if (filters.max !== null) params.set('max', String(filters.max));
  if (filters.sort !== 'new') params.set('sort', filters.sort);
  const query = params.toString();
  return query ? `?${query}` : '';
}
