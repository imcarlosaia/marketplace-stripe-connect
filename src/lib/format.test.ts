import { describe, expect, it } from 'vitest';
import { formatPrice, isNew, relativeTime } from './format';

const NOW = new Date('2026-11-16T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatPrice', () => {
  it('shows Free for zero', () => {
    expect(formatPrice(0)).toBe('Free');
  });

  it('shows whole amounts without cents and with thousands separators', () => {
    expect(formatPrice(120)).toBe('$120');
    expect(formatPrice(1250)).toBe('$1,250');
    expect(formatPrice(1000000)).toBe('$1,000,000');
  });

  it('shows two decimals when there are cents', () => {
    expect(formatPrice(12.5)).toBe('$12.50');
    expect(formatPrice(0.99)).toBe('$0.99');
  });
});

describe('relativeTime', () => {
  it('covers each range', () => {
    expect(relativeTime(ago(30 * 1000), NOW)).toBe('just now');
    expect(relativeTime(ago(-5000), NOW)).toBe('just now');
    expect(relativeTime(ago(5 * MIN), NOW)).toBe('5m ago');
    expect(relativeTime(ago(3 * HOUR), NOW)).toBe('3h ago');
    expect(relativeTime(ago(2 * DAY), NOW)).toBe('2d ago');
    expect(relativeTime(ago(29 * DAY), NOW)).toBe('29d ago');
    expect(relativeTime('2026-01-03T09:00:00.000Z', NOW)).toBe('3 Jan');
    expect(relativeTime('bad', NOW)).toBe('');
  });
});

describe('isNew', () => {
  it('is true under 24 hours and false after', () => {
    expect(isNew(ago(23 * HOUR), NOW)).toBe(true);
    expect(isNew(ago(DAY), NOW)).toBe(false);
  });
});
