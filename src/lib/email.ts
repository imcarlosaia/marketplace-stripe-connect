import { formatPrice } from './format';
import { PLATFORM_FEE_PERCENT, formatCents } from './money';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export interface SellerEmailInput {
  title: string;
  price: number;
  url: string;
  message: string;
  buyerEmail: string;
}

export interface SellerEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildSellerEmail({ title, price, url, message, buyerEmail }: SellerEmailInput): SellerEmail {
  const subject = `New message about "${title}"`;
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');
  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#16181D;max-width:560px">',
    '<p style="margin:0 0 4px;color:#5D6470">You have a new message about your listing</p>',
    `<p style="margin:0 0 16px;font-size:18px;font-weight:600"><a href="${escapeHtml(url)}" style="color:#1F4FA8">${escapeHtml(title)}</a> · ${escapeHtml(formatPrice(price))}</p>`,
    `<div style="background:#F4F5F7;border-radius:12px;padding:14px 16px;margin:0 0 16px">${safeMessage}</div>`,
    `<p style="margin:0 0 4px">From: ${escapeHtml(buyerEmail)}</p>`,
    '<p style="margin:0;color:#5D6470">Reply to this email to answer the buyer.</p>',
    '</div>',
  ].join('');
  const text = [
    `You have a new message about your listing "${title}" (${formatPrice(price)}).`,
    '',
    message,
    '',
    `From: ${buyerEmail}`,
    `Listing: ${url}`,
    '',
    'Reply to this email to answer the buyer.',
  ].join('\n');
  return { subject, html, text };
}

export interface SoldEmailInput {
  title: string;
  amountCents: number;
  sellerShareCents: number;
  feeCents: number;
  url: string;
  buyerEmail: string | null;
}

export function buildSoldEmail({ title, amountCents, sellerShareCents, feeCents, url, buyerEmail }: SoldEmailInput): SellerEmail {
  const subject = `Sold: "${title}"`;
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#5D6470">${label}</td><td style="padding:4px 0;text-align:right${strong ? ';font-weight:600' : ''}">${value}</td></tr>`;
  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#16181D;max-width:560px">',
    '<p style="margin:0 0 4px;color:#5D6470">Good news, your item sold</p>',
    `<p style="margin:0 0 16px;font-size:18px;font-weight:600"><a href="${escapeHtml(url)}" style="color:#1F4FA8">${escapeHtml(title)}</a></p>`,
    '<table style="border-collapse:collapse;margin:0 0 16px">',
    row('Buyer paid', escapeHtml(formatCents(amountCents))),
    row(`Marketplace fee (${PLATFORM_FEE_PERCENT}%)`, escapeHtml(formatCents(feeCents))),
    row('You receive', escapeHtml(formatCents(sellerShareCents)), true),
    '</table>',
    buyerEmail ? `<p style="margin:0 0 4px">Buyer: ${escapeHtml(buyerEmail)}</p>` : '',
    '<p style="margin:0;color:#5D6470">The payment is in your Stripe account. Reply to this email to contact the buyer.</p>',
    '</div>',
  ].join('');
  const text = [
    `Your item "${title}" sold.`,
    '',
    `Buyer paid: ${formatCents(amountCents)}`,
    `Marketplace fee (${PLATFORM_FEE_PERCENT}%): ${formatCents(feeCents)}`,
    `You receive: ${formatCents(sellerShareCents)}`,
    '',
    buyerEmail ? `Buyer: ${buyerEmail}` : '',
    `Listing: ${url}`,
    '',
    'The payment is in your Stripe account. Reply to this email to contact the buyer.',
  ].join('\n');
  return { subject, html, text };
}
