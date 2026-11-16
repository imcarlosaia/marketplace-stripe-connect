import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header, HeaderFallback } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Buy and sell locally. List an item with a photo, browse by category, and message sellers.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
