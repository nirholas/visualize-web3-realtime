'use client';

import { useEffect, useRef, useState } from 'react';
import type { GraphMetrics } from './useGraphMetrics';

function formatVolume(sol: number): string {
  if (sol >= 1_000_000) return `${(sol / 1_000_000).toFixed(1)}M`;
  if (sol >= 1_000) return `${(sol / 1_000).toFixed(1)}K`;
  return sol.toFixed(1);
}

/** Returns true for one render cycle whenever `value` changes */
function useFlash(value: number): boolean {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(id);
    }
  }, [value]);

  return flash;
}

interface BottomHUDProps {
  metrics: GraphMetrics;
}

export function BottomHUD({ metrics }: BottomHUDProps) {
  const tokensFlash = useFlash(metrics.activeTokens);
  const volumeFlash = useFlash(Math.round(metrics.totalVolume));
  const swapsFlash = useFlash(metrics.liveSwaps);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
      <div
        className={
          'flex items-center gap-6 px-8 py-3 rounded-full ' +
          'bg-white/10 backdrop-blur-md border border-white/20 ' +
          'text-white/90 text-sm font-medium tracking-wide ' +
          'shadow-lg shadow-black/30 transition-shadow duration-500'
        }
      >
        {/* Active Tokens */}
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">◉</span>
          <span
            className={
              'tabular-nums transition-colors duration-300 ' +
              (tokensFlash ? 'text-emerald-300' : '')
            }
          >
            {metrics.activeTokens}
          </span>
          <span className="text-white/50">Agents</span>
        </span>

        <span className="w-px h-4 bg-white/20" aria-hidden="true" />

        {/* Volume */}
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">◈</span>
          <span className="text-white/50">Volume</span>
          <span
            className={
              'tabular-nums transition-colors duration-300 ' +
              (volumeFlash ? 'text-cyan-300' : '')
            }
          >
            {formatVolume(metrics.totalVolume)} SOL
          </span>
        </span>

        <span className="w-px h-4 bg-white/20" aria-hidden="true" />

        {/* Live Swaps */}
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">⬡</span>
          <span
            className={
              'tabular-nums transition-colors duration-300 ' +
              (swapsFlash ? 'text-amber-300' : '')
            }
          >
            {metrics.liveSwaps}
          </span>
          <span className="text-white/50">Transactions</span>
        </span>
      </div>
    </div>
  );
}
