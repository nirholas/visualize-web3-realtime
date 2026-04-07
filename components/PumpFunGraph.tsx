'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePumpFunSocket } from '@/app/pumpfun/usePumpFunSocket';
import { useDemoData } from '@/app/pumpfun/useDemoData';
import { useGraphMetrics } from '@/app/pumpfun/useGraphMetrics';
import { BottomHUD } from '@/app/pumpfun/BottomHUD';
import { TokenFeed } from '@/app/pumpfun/TokenFeed';
import { PumpForceGraph } from '@/app/pumpfun/PumpForceGraph';

/** Seconds to wait for live data before falling back to demo */
const FALLBACK_TIMEOUT_MS = 5_000;

export default function PumpFunGraph() {
  const liveData = usePumpFunSocket();
  const demoData = useDemoData();

  // Fall back to demo data if no live nodes arrive after timeout
  const [useDemo, setUseDemo] = useState(false);
  useEffect(() => {
    if (liveData.nodes.length > 0) {
      setUseDemo(false);
      return;
    }
    const id = setTimeout(() => {
      if (liveData.nodes.length === 0) setUseDemo(true);
    }, FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [liveData.nodes.length]);

  const graphData = useDemo ? demoData : liveData;
  const metrics = useGraphMetrics(graphData);

  const recentTokens = useMemo(
    () =>
      graphData.nodes
        .filter((n) => n.type === 'token')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5),
    [graphData],
  );

  const isLive = !useDemo && graphData.nodes.length > 0;

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
              graphData.nodes.length > 0 ? 'bg-green-400' : 'bg-red-500'
            }`}
          />
          {isLive ? 'Live' : useDemo ? 'Demo' : 'Connecting…'}
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
