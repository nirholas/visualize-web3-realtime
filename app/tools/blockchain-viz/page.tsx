'use client';

import dynamic from 'next/dynamic';

const BlockchainVizDemo = dynamic(() => import('@/features/Tools/BlockchainViz/BlockchainVizDemo'), { ssr: false });

export default function BlockchainVizPage() {
  return <BlockchainVizDemo />;
}
