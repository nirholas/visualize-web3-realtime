'use client';

import { useMemo } from 'react';
import { usePumpFunSocket } from '@/app/pumpfun/usePumpFunSocket';
import { useGraphMetrics } from '@/app/pumpfun/useGraphMetrics';
import { BottomHUD } from '@/app/pumpfun/BottomHUD';
import { TokenFeed } from '@/app/pumpfun/TokenFeed';
import { PumpForceGraph } from '@/app/pumpfun/PumpForceGraph';

export default function PumpFunGraph() {
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
    <>
      {/* 3D Force Graph */}
      <div className="absolute inset-0 z-0">
        <PumpForceGraph graphData={graphData} />
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
    </>
  );
}

