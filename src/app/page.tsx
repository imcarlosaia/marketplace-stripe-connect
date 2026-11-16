import { Suspense } from 'react';
import { HomeSkeleton, HomeView } from '@/components/HomeView';

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeView />
    </Suspense>
  );
}
