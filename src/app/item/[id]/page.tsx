import { Suspense } from 'react';
import { ListingPage, ListingSkeleton } from '@/components/ListingPage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ListingPage params={params} />
    </Suspense>
  );
}
