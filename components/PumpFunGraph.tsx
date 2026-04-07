'use client';

import { useMemo } from 'react';
import { usePumpFunSocket } from '@/app/pumpfun/usePumpFunSocket';
import { useGraphMetrics } from '@/app/pumpfun/useGraphMetrics';
import { BottomHUD } from '@/app/pumpfun/BottomHUD';
import { TokenFeed } from '@/app/pumpfun/TokenFeed';
import { PumpForceGraph } from '@/app/pumpfun/PumpForceGraph';

export default function PumpFunGraph() {
  const graphData = usePumpFunSocket();
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
    <>
      {/* 3D Force Graph */}
      <div className="absolute inset-0 z-0">
        <PumpForceGraph graphData={graphData} />
      </div>

      {/* HUD Overlay — pointer-events-none so clicks pass through to canvas */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Node / link count (dev HUD) */}
        <div className="pointer-events-auto absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-xs tabular-nums text-white/50 backdrop-blur">
          {graphData.nodes.length} nodes · {graphData.links.length} links
        </div>

        {/* Left panel — live token feed */}
        <TokenFeed tokens={recentTokens} />

        {/* Bottom center — metrics HUD */}
        <BottomHUD metrics={metrics} />
      </div>
    </>
  );
}

