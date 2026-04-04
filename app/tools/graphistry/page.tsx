'use client';

import dynamic from 'next/dynamic';

const GraphistryDemo = dynamic(() => import('@/features/Tools/Graphistry/GraphistryDemo'), { ssr: false });

export default function GraphistryPage() {
  return <GraphistryDemo />;
}
