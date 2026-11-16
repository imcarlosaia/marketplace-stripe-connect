export type OrderStatus = 'pending' | 'paid' | 'refunded';

export type CheckoutDecision = 'ignore' | 'already_done' | 'mark_paid' | 'refund';

export interface CheckoutFacts {
  /** Our order for this Checkout Session, or null if we didn't create it. */
  order: { id: string; status: OrderStatus } | null;
  /** Checkout Session payment_status: 'paid', 'unpaid' or 'no_payment_required'. */
  paymentStatus: string;
  /** True when the listing is already sold through a different order. */
  soldByOtherOrder: boolean;
}

// What the webhook should do with a completed Checkout Session. Kept pure so
// every branch is unit tested; the route only carries out the decision.
export function decideCheckout({ order, paymentStatus, soldByOtherOrder }: CheckoutFacts): CheckoutDecision {
  if (!order) return 'ignore';
  if (order.status !== 'pending') return 'already_done';
  if (paymentStatus !== 'paid') return 'ignore';
  return soldByOtherOrder ? 'refund' : 'mark_paid';
}
