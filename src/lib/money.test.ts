import { describe, expect, it } from 'vitest';
import { MIN_CHARGE_CENTS, PLATFORM_FEE_PERCENT, canCharge, formatCents, platformFeeCents, sellerShareCents, toCents } from './money';

describe('toCents', () => {
  it('converts whole and decimal prices', () => {
    expect(toCents(120)).toBe(12000);
    expect(toCents(12.5)).toBe(1250);
    expect(toCents(1250.5)).toBe(125050);
  });

  it('is not thrown off by floating point', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(19.99)).toBe(1999);
  });
});

describe('platformFeeCents', () => {
  it('takes 10 percent', () => {
    expect(PLATFORM_FEE_PERCENT).toBe(10);
    expect(platformFeeCents(12000)).toBe(1200);
    expect(platformFeeCents(1250)).toBe(125);
  });

  it('rounds to the nearest cent', () => {
    expect(platformFeeCents(55)).toBe(6);
    expect(platformFeeCents(54)).toBe(5);
    expect(platformFeeCents(1999)).toBe(200);
  });
});

describe('sellerShareCents', () => {
  it('is the amount minus the fee', () => {
    expect(sellerShareCents(12000)).toBe(10800);
    expect(sellerShareCents(1999)).toBe(1799);
  });
});

describe('canCharge', () => {
  it('needs at least 50 cents', () => {
    expect(MIN_CHARGE_CENTS).toBe(50);
    expect(canCharge(0)).toBe(false);
    expect(canCharge(0.49)).toBe(false);
    expect(canCharge(0.5)).toBe(true);
    expect(canCharge(120)).toBe(true);
  });
});

describe('formatCents', () => {
  it('shows dollars, with cents only when needed', () => {
    expect(formatCents(12000)).toBe('$120');
    expect(formatCents(1250)).toBe('$12.50');
    expect(formatCents(125050)).toBe('$1,250.50');
    expect(formatCents(0)).toBe('$0');
  });
});
