'use client';

import dynamic from 'next/dynamic';

const CosmographDemo = dynamic(() => import('@/features/Tools/Cosmograph/CosmographDemo'), { ssr: false });

export default function CosmographPage() {
  return <CosmographDemo />;
}
