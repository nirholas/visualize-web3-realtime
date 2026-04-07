'use client';

import { useEffect, useState } from 'react';
import type { PumpNode } from './types';

interface TokenFeedProps {
  /** The 5 most recently launched token nodes, newest first */
  tokens: PumpNode[];
  darkMode?: boolean;
}

export function TokenFeed({ tokens, darkMode = true }: TokenFeedProps) {
  // Tick every second so relative timestamps stay fresh
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  if (tokens.length === 0) return null;

  const panelBg = darkMode
    ? 'bg-white/5 border-white/10 shadow-black/30'
    : 'bg-black/[0.03] border-black/10 shadow-black/5';
  const heading = darkMode ? 'text-white/40' : 'text-black/40';
  const rowBg = darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/[0.03] hover:bg-black/[0.06]';
  const rowText = darkMode ? 'text-white/80' : 'text-black/70';
  const accent = darkMode ? 'text-emerald-300' : 'text-emerald-600';
  const muted = darkMode ? 'text-white/30' : 'text-black/30';

  return (
    <div className="absolute top-20 left-8 pointer-events-auto z-20 w-72">
      <div
        className={
          `flex flex-col gap-1 p-4 rounded-xl ` +
          `backdrop-blur-md border ` +
          `transition-all duration-300 ` +
          `${panelBg}`
        }
      >
        <h3 className={`text-[10px] uppercase tracking-[0.2em] mb-2 font-mono ${heading}`}>
          Live Token Feed
        </h3>

        {tokens.map((token, i) => (
          <div
            key={token.id}
            className={
              `flex items-center gap-2 px-3 py-2 rounded-lg ` +
              `transition-colors ` +
              `animate-[fadeSlideIn_0.3s_ease-out_both] ` +
              `${rowBg}`
            }
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className={`font-mono text-xs truncate ${rowText}`}>
              New Launch:{' '}
              <span className={`font-semibold ${accent}`}>
                ${token.ticker ?? 'UNKNOWN'}
              </span>
            </span>
            <span className={`ml-auto text-[10px] font-mono tabular-nums ${muted}`}>
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
