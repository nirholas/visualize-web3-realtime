'use client';

import { useEffect, useState } from 'react';
import type { PumpNode } from './types';

interface TokenFeedProps {
  /** The 5 most recently launched token nodes, newest first */
  tokens: PumpNode[];
}

export function TokenFeed({ tokens }: TokenFeedProps) {
  // Tick every second so relative timestamps stay fresh
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  if (tokens.length === 0) return null;

  return (
    <div className="absolute top-20 left-8 pointer-events-auto z-20 w-72">
      <div
        className={
          'flex flex-col gap-1 p-4 rounded-xl ' +
          'bg-white/5 backdrop-blur-md border border-white/10 ' +
          'shadow-lg shadow-black/30'
        }
      >
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-mono">
          Live Token Feed
        </h3>

        {tokens.map((token, i) => (
          <div
            key={token.id}
            className={
              'flex items-center gap-2 px-3 py-2 rounded-lg ' +
              'bg-white/5 hover:bg-white/10 transition-colors ' +
              'animate-[fadeSlideIn_0.3s_ease-out_both]'
            }
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono text-xs text-white/80 truncate">
              New Launch:{' '}
              <span className="text-emerald-300 font-semibold">
                ${token.ticker ?? 'UNKNOWN'}
              </span>
            </span>
            <span className="ml-auto text-[10px] text-white/30 font-mono tabular-nums">
              {formatAge(token.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Format the age of a token relative to now (e.g. "2s", "1m") */
function formatAge(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}
