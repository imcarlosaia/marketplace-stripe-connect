import { sendEmail } from '@/lib/brevo';
import { buildSellerEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';
import { isUuid, validateMessage } from '@/lib/validation';

interface SentRow {
  message_id: string;
  to_email: string;
  listing_title: string;
  listing_price: number | string;
}

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

// Saves a buyer's message through the database function send_message, then
// emails the seller. The message counts as sent once it is saved; the email
// is a best-effort extra and its outcome is reported separately.
export async function POST(request: Request) {
  if (!supabase) return json(503, { error: 'not_configured' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'invalid' });
  }
  const { listingId, email, message } = (body ?? {}) as Record<string, unknown>;
  if (typeof listingId !== 'string' || typeof email !== 'string' || typeof message !== 'string' || !isUuid(listingId)) {
    return json(400, { error: 'invalid' });
  }
  const fields = validateMessage({ email, message });
  if (Object.keys(fields).length > 0) return json(400, { error: 'invalid', fields });

  const buyerEmail = email.trim();
  const text = message.trim();
  const { data, error } = await supabase.rpc('send_message', {
    p_listing_id: listingId,
    p_buyer_email: buyerEmail,
    p_message: text,
  });

  if (error) {
    if (error.message.includes('listing_not_found')) return json(404, { error: 'not_found' });
    if (error.message.includes('too_many_messages')) return json(429, { error: 'too_many' });
    console.error('send_message failed', error.message);
    return json(500, { error: 'failed' });
  }

  const row = (Array.isArray(data) ? data[0] : data) as SentRow | undefined;
  if (!row) return json(500, { error: 'failed' });

  const listingUrl = new URL(`/item/${listingId}`, request.url).toString();
  const emailed = await sendEmail(
    row.to_email,
    buyerEmail,
    buildSellerEmail({
      title: row.listing_title,
      price: Number(row.listing_price),
      url: listingUrl,
      message: text,
      buyerEmail,
    }),
  );

  return json(200, { saved: true, emailed });
}
