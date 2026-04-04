'use client';

import dynamic from 'next/dynamic';

const AIOfficeDemo = dynamic(() => import('@/features/Tools/AIOffice/AIOfficeDemo'), { ssr: false });

export default function AIOfficePage() {
  return <AIOfficeDemo />;
}
