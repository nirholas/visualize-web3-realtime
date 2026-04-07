'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { usePumpFunSocket } from './usePumpFunSocket';
import { useGraphMetrics } from './useGraphMetrics';
import { BottomHUD } from './BottomHUD';
import { TokenFeed } from './TokenFeed';

// Lazy-load the 2D canvas graph to avoid SSR issues with d3-force
const PumpFunGraph = dynamic(() => import('./PumpFunGraph'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0f' }} />
  ),
});

export default function PumpFunPage() {
  const { graphData, connected } = usePumpFunSocket();
  const metrics = useGraphMetrics(graphData);

  const recentTokens = useMemo(
    () =>
      graphData.nodes
        .filter((n) => n.type === 'token')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5),
    [graphData],
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050505]">
      {/* 3D canvas — fixed at z-index 0 */}
      <div className="absolute inset-0 z-0">
        <PumpFunGraph graphData={graphData} />
      </div>

      {/* HUD Overlay — pointer-events-none so clicks pass through to canvas */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Connection status badge */}
        <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? 'bg-green-400' : 'bg-red-500'
            }`}
          />
          {connected ? 'Live' : 'Connecting…'}
        </div>

        {/* Node / link count (dev HUD) */}
        <div className="pointer-events-auto absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-xs tabular-nums text-white/50 backdrop-blur">
          {graphData.nodes.length} nodes · {graphData.links.length} links
        </div>

        {/* Left panel — live token feed */}
        <TokenFeed tokens={recentTokens} />

        {/* Bottom center — metrics HUD */}
        <BottomHUD metrics={metrics} />
      </div>
    </div>
  );
}
