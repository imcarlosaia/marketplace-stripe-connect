import { describe, expect, it } from 'vitest';
import { buildSellerEmail, buildSoldEmail, escapeHtml } from './email';

describe('buildSoldEmail', () => {
  const email = buildSoldEmail({
    title: 'Lamp <i>',
    amountCents: 12000,
    sellerShareCents: 10800,
    feeCents: 1200,
    url: 'https://example.com/item/1',
    buyerEmail: 'buyer@example.com',
  });

  it('says the item sold', () => {
    expect(email.subject).toBe('Sold: "Lamp <i>"');
  });

  it('shows the split and escapes the title', () => {
    expect(email.html).toContain('Lamp &lt;i&gt;');
    expect(email.html).not.toContain('<i>');
    expect(email.html).toContain('$120');
    expect(email.html).toContain('$108');
    expect(email.html).toContain('$12');
    expect(email.text).toContain('You receive: $108');
    expect(email.text).toContain('Marketplace fee (10%): $12');
    expect(email.text).toContain('buyer@example.com');
  });
});

describe('escapeHtml', () => {
  it('escapes the five special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('buildSellerEmail', () => {
  const email = buildSellerEmail({
    title: 'Chair <b>',
    price: 45,
    url: 'https://example.com/item/1',
    message: 'Hi,\n<script>alert(1)</script>',
    buyerEmail: 'buyer@example.com',
  });

  it('names the listing in the subject', () => {
    expect(email.subject).toBe('New message about "Chair <b>"');
  });

  it('escapes user text in the HTML and keeps line breaks', () => {
    expect(email.html).toContain('Chair &lt;b&gt;');
    expect(email.html).toContain('Hi,<br>&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('href="https://example.com/item/1"');
    expect(email.html).toContain('$45');
  });

  it('has a plain-text version with the message and reply hint', () => {
    expect(email.text).toContain('Hi,\n<script>alert(1)</script>');
    expect(email.text).toContain('buyer@example.com');
    expect(email.text).toContain('Reply to this email to answer the buyer.');
  });
});
