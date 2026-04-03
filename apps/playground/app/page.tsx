'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MockProvider } from '@web3viz/providers';
import type { RawEvent } from '@web3viz/core';
import { CATEGORY_BY_ID, type CategoryId } from '@web3viz/core';
import { truncateAddress } from '@web3viz/utils';

// Dynamic import for the 3D graph (avoid SSR for Three.js)
import dynamic from 'next/dynamic';
const ForceGraph = dynamic(
  () => import('@web3viz/react-graph').then((m) => m.ForceGraph),
  { ssr: false },
);

// ============================================================================
// Playground page — demonstrates @web3viz SDK with mock data
// ============================================================================

export default function PlaygroundPage() {
  const providerRef = useRef<MockProvider | null>(null);
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [stats, setStats] = useState({ tokens: 0, trades: 0, claims: 0 });
  const [running, setRunning] = useState(true);

  // Boot mock provider
  useEffect(() => {
    const provider = new MockProvider(400);
    providerRef.current = provider;

    const unsub = provider.onEvent((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 100));
      setStats((prev) => ({
        tokens: prev.tokens + (event.type === 'tokenCreate' ? 1 : 0),
        trades: prev.trades + (event.type === 'trade' ? 1 : 0),
        claims: prev.claims + (event.type === 'claim' ? 1 : 0),
      }));
    });

    provider.connect();

    return () => {
      unsub();
      provider.disconnect();
    };
  }, []);

  const togglePause = useCallback(() => {
    setRunning((prev) => {
      const next = !prev;
      providerRef.current?.setPaused(!next);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--w3v-border)]">
        <div>
          <h1 className="text-lg font-bold tracking-tight">@web3viz/playground</h1>
          <p className="text-xs text-[var(--w3v-text-muted)] mt-0.5">
            Interactive SDK demo with mock data
          </p>
        </div>
        <button
          onClick={togglePause}
          className="px-4 py-1.5 text-xs font-medium rounded border border-[var(--w3v-border)] hover:border-[var(--w3v-accent)] transition-colors"
        >
          {running ? '\u23F8 Pause' : '\u25B6 Resume'}
        </button>
      </header>

      {/* Stats bar */}
      <div className="flex gap-6 px-6 py-3 text-xs border-b border-[var(--w3v-border)]">
        <span>
          Tokens: <strong>{stats.tokens}</strong>
        </span>
        <span>
          Trades: <strong>{stats.trades}</strong>
        </span>
        <span>
          Claims: <strong>{stats.claims}</strong>
        </span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* 3D Graph */}
        <div className="flex-1 relative">
          <ForceGraph
            background="#0a0a0f"
            groundColor="#1a1a2f"
            showLabels
            showGround
          />
        </div>

        {/* Live feed */}
        <aside className="w-80 border-l border-[var(--w3v-border)] overflow-y-auto">
          <div className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--w3v-text-muted)] border-b border-[var(--w3v-border)]">
            Live Feed
          </div>
          <div className="divide-y divide-[var(--w3v-border)]">
            {events.slice(0, 50).map((event, i) => (
              <EventCard key={`${event.type}-${i}`} event={event} />
            ))}
            {events.length === 0 && (
              <div className="p-4 text-xs text-[var(--w3v-text-muted)]">
                Waiting for events…
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ============================================================================
// Event card sub-component
// ============================================================================

function EventCard({ event }: { event: RawEvent }) {
  const category: CategoryId =
    event.type === 'tokenCreate'
      ? 'launches'
      : event.type === 'trade'
        ? 'trades'
        : 'claimsWallet';

  const config = CATEGORY_BY_ID[category];
  const data = event.data as Record<string, unknown>;

  return (
    <div className="px-4 py-2.5 text-xs flex items-start gap-2">
      <span style={{ color: config?.color || '#888' }} className="text-sm mt-0.5">
        {config?.icon || '\u25CF'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">
          {(data.symbol as string) || (data.name as string) || event.type}
        </div>
        <div className="text-[var(--w3v-text-muted)] truncate">
          {truncateAddress(
            (data.traderPublicKey as string) || (data.wallet as string) || '',
            6,
          )}
        </div>
      </div>
      <span className="text-[var(--w3v-text-muted)] whitespace-nowrap">
        {config?.label || event.type}
      </span>
    </div>
  );
}
