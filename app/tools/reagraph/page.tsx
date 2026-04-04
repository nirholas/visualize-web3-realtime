'use client';

import dynamic from 'next/dynamic';

const ReagraphDemo = dynamic(() => import('@/features/Tools/Reagraph/ReagraphDemo'), { ssr: false });

export default function ReagraphPage() {
  return <ReagraphDemo />;
}
