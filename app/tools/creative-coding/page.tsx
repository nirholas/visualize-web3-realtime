'use client';

import dynamic from 'next/dynamic';

const CreativeCodingDemo = dynamic(() => import('@/features/Tools/CreativeCoding/CreativeCodingDemo'), { ssr: false });

export default function CreativeCodingPage() {
  return <CreativeCodingDemo />;
}
