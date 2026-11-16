import 'server-only';
import type { SellerEmail } from './email';

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

// Sends one transactional email through Brevo. Resolves to true when Brevo
// accepted it, false when Brevo is not configured or refused it. Never throws,
// so a failed email can never undo a saved message.
export async function sendEmail(to: string, replyTo: string | null, email: SellerEmail): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) return false;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME || 'Marketplace' },
        to: [{ email: to }],
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error('Brevo refused the email', response.status, (await response.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error('Brevo request failed', error instanceof Error ? error.message : error);
    return false;
  }
}
