'use client';

import dynamic from 'next/dynamic';

const NveilDemo = dynamic(() => import('@/features/Tools/Nveil/NveilDemo'), { ssr: false });

export default function NveilPage() {
  return <NveilDemo />;
}
