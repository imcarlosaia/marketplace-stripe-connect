import { describe, expect, it } from 'vitest';
import { decideCheckout } from './orders';

describe('decideCheckout', () => {
  const pending = { id: 'o1', status: 'pending' as const };

  it('ignores sessions it did not create', () => {
    expect(decideCheckout({ order: null, paymentStatus: 'paid', soldByOtherOrder: false })).toBe('ignore');
  });

  it('does nothing twice for the same session', () => {
    expect(decideCheckout({ order: { id: 'o1', status: 'paid' }, paymentStatus: 'paid', soldByOtherOrder: false })).toBe('already_done');
    expect(decideCheckout({ order: { id: 'o1', status: 'refunded' }, paymentStatus: 'paid', soldByOtherOrder: true })).toBe('already_done');
  });

  it('waits when the payment is not paid yet', () => {
    expect(decideCheckout({ order: pending, paymentStatus: 'unpaid', soldByOtherOrder: false })).toBe('ignore');
  });

  it('refunds a second payment for an item that already sold', () => {
    expect(decideCheckout({ order: pending, paymentStatus: 'paid', soldByOtherOrder: true })).toBe('refund');
  });

  it('marks the order paid otherwise', () => {
    expect(decideCheckout({ order: pending, paymentStatus: 'paid', soldByOtherOrder: false })).toBe('mark_paid');
  });
});
