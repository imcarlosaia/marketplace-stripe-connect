// Money for checkout. Stripe works in whole cents; listing prices are dollars
// with up to two decimals.

export const PLATFORM_FEE_PERCENT = 10;
export const MIN_CHARGE_CENTS = 50; // Stripe's minimum for a USD charge

export function toCents(price: number): number {
  return Math.round(price * 100);
}

export function platformFeeCents(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
}

export function sellerShareCents(amountCents: number): number {
  return amountCents - platformFeeCents(amountCents);
}

export function canCharge(price: number): boolean {
  return toCents(price) >= MIN_CHARGE_CENTS;
}

export function formatCents(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}
