'use client';

import type { GraphMetrics } from './useGraphMetrics';

function formatVolume(sol: number): string {
  if (sol >= 1_000_000) return `${(sol / 1_000_000).toFixed(1)}M`;
  if (sol >= 1_000) return `${(sol / 1_000).toFixed(1)}K`;
  return sol.toFixed(1);
}

interface BottomHUDProps {
  metrics: GraphMetrics;
}

export function BottomHUD({ metrics }: BottomHUDProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
      <div
        className={
          'flex items-center gap-6 px-8 py-3 rounded-full ' +
          'bg-white/10 backdrop-blur-md border border-white/20 ' +
          'text-white/90 text-sm font-medium tracking-wide shadow-lg shadow-black/30'
        }
      >
        {/* Active Tokens */}
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">◉</span>
          <span className="tabular-nums">{metrics.activeTokens}</span>
          <span className="text-white/50">Agents</span>
        </span>

        <span className="w-px h-4 bg-white/20" aria-hidden="true" />

        {/* Volume */}
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">◈</span>
          <span className="text-white/50">Volume</span>
          <span className="tabular-nums">{formatVolume(metrics.totalVolume)} SOL</span>
        </span>

        <span className="w-px h-4 bg-white/20" aria-hidden="true" />

        {/* Live Swaps */}
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">⬡</span>
          <span className="tabular-nums">{metrics.liveSwaps}</span>
          <span className="text-white/50">Transactions</span>
        </span>
      </div>
    </div>
  );
}
