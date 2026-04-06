'use client';

import dynamic from 'next/dynamic';

const ScrollytellingPage = dynamic(
  () => import('@/features/Scrollytelling/ScrollytellingPage'),
  {
    ssr: false,
    loading: () => <div style={{ width: '100vw', height: '100vh', background: '#0a0a12' }} />,
  },
);

export default function Home() {
  return <ScrollytellingPage />;
}
