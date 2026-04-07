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
  darkMode?: boolean;
}

export function BottomHUD({ metrics, darkMode = true }: BottomHUDProps) {
  const tokensFlash = useFlash(metrics.activeTokens);
  const volumeFlash = useFlash(Math.round(metrics.totalVolume));
  const swapsFlash = useFlash(metrics.liveSwaps);

  const bg = darkMode
    ? 'bg-white/10 border-white/20 shadow-black/30'
    : 'bg-black/5 border-black/10 shadow-black/10';
  const text = darkMode ? 'text-white/90' : 'text-black/80';
  const muted = darkMode ? 'text-white/50' : 'text-black/40';
  const divider = darkMode ? 'bg-white/20' : 'bg-black/15';

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
      <div
        className={
          `flex items-center gap-6 px-8 py-3 rounded-full ` +
          `backdrop-blur-md border ` +
          `text-sm font-medium tracking-wide ` +
          `transition-all duration-300 ` +
          `${bg} ${text}`
        }
      >
        {/* Active Tokens */}
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">&#9673;</span>
          <span
            className={
              'tabular-nums transition-colors duration-300 ' +
              (tokensFlash ? 'text-emerald-300' : '')
            }
          >
            {metrics.activeTokens}
          </span>
          <span className={muted}>Agents</span>
        </span>

        <span className={`w-px h-4 ${divider}`} aria-hidden="true" />

        {/* Volume */}
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">&#9672;</span>
          <span className={muted}>Volume</span>
          <span
            className={
              'tabular-nums transition-colors duration-300 ' +
              (volumeFlash ? 'text-cyan-300' : '')
            }
          >
            {formatVolume(metrics.totalVolume)} SOL
          </span>
        </span>

        <span className={`w-px h-4 ${divider}`} aria-hidden="true" />

        {/* Live Swaps */}
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">&#11041;</span>
          <span
            className={
              'tabular-nums transition-colors duration-300 ' +
              (swapsFlash ? 'text-amber-300' : '')
            }
          >
            {metrics.liveSwaps}
          </span>
          <span className={muted}>Transactions</span>
        </span>
      </div>
    </div>
  );
}
