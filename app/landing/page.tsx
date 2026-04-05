'use client';

import dynamic from 'next/dynamic';

const LandingEngine = dynamic(() => import('@/features/Landing/LandingEngine'), {
  ssr: false,
});

export default function LandingPage() {
  return <LandingEngine />;
}
