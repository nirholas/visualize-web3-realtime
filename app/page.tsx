'use client';

import dynamic from 'next/dynamic';

const LandingPage = dynamic(() => import('@/features/Landing/LandingPage'), {
  ssr: false,
  loading: () => <div style={{ width: '100vw', height: '100vh', background: '#0a0a12' }} />,
});

export default function Home() {
  return <LandingPage />;
}
