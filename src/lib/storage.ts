// Remembers the visitor's own email addresses between visits, so they don't
// have to retype them. Failures are ignored: the forms simply start empty.
const SELLER_KEY = 'marketplace:seller-email';
const BUYER_KEY = 'marketplace:buyer-email';

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full.
  }
}

export const loadSellerEmail = () => read(SELLER_KEY);
export const saveSellerEmail = (email: string) => write(SELLER_KEY, email);
export const loadBuyerEmail = () => read(BUYER_KEY);
export const saveBuyerEmail = (email: string) => write(BUYER_KEY, email);
