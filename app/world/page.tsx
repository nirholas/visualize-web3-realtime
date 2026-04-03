'use client';

import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';

import { usePumpFun } from '@/hooks/usePumpFun';
import LiveFeed from '@/features/World/LiveFeed';
import type { X402FlowTrace } from '@/features/X402Flow/types';

// Lazy-load the 3D network to avoid SSR issues with Three.js
const X402Network = dynamic(() => import('@/features/X402Flow/X402Network'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#08080f' }} />,
});

// ---------------------------------------------------------------------------
// Map PumpFun data → X402FlowTrace for the network visualization
// ---------------------------------------------------------------------------

function buildPumpFlow(stats: {
  totalTokens: number;
  totalTrades: number;
  totalVolumeSol: number;
  topTokens: { mint: string; symbol: string; name: string; trades: number; volumeSol: number }[];
}): X402FlowTrace {
  const now = Date.now();

  return {
    agentAddress: 'pump.fun',
    agentName: 'PumpFun Network',
    apiCalls: stats.topTokens.map((t, i) => ({
      amountPaid: String(t.volumeSol.toFixed(4)),
      duration: 200,
      id: `pump-${i}`,
      paymentRequired: true,
      responseStatus: 200,
      url: t.symbol || t.name,
    })),
    duration: 0,
    events: stats.topTokens.flatMap((t, i) => [
      {
        amount: String(t.volumeSol.toFixed(4)),
        apiUrl: t.symbol || t.name,
        sequenceIndex: i * 2,
        timestamp: now - (stats.topTokens.length - i) * 2000,
        type: 'api_call_start' as const,
      },
      {
        amount: String(t.volumeSol.toFixed(4)),
        apiUrl: t.symbol || t.name,
        sequenceIndex: i * 2 + 1,
        timestamp: now - (stats.topTokens.length - i) * 1000,
        type: 'api_call_complete' as const,
      },
    ]),
    flowId: `pump-${now}`,
    startedAt: now,
    status: 'active',
    totalPaid: String(stats.totalVolumeSol.toFixed(4)),
    userPrompt: 'PumpFun Live Activity',
  };
}

function formatStat(value: number, prefix = ''): string {
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${prefix}${(value / 1000).toFixed(1)}K`;
  return `${prefix}${value.toFixed(value < 10 ? 2 : 0)}`;
}

// ---------------------------------------------------------------------------
// Stat pills (top-left overlay)
// ---------------------------------------------------------------------------

const StatPill = memo<{ label: string; value: string }>(({ label, value }) => (
  <div
    style={{
      display: 'flex',
      gap: 5,
      alignItems: 'baseline',
      padding: '3px 10px',
      fontFamily: 'monospace',
      background: 'rgb(176 176 200 / 4%)',
      border: '1px solid rgb(176 176 200 / 6%)',
      borderRadius: 4,
    }}
  >
    <span style={{ fontSize: 9, color: 'rgb(176 176 200 / 30%)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </span>
    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgb(176 176 200 / 70%)' }}>
      {value}
    </span>
  </div>
));

StatPill.displayName = 'StatPill';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorldPage() {
  const [paused, setPaused] = useState(false);
  const { stats, connected } = usePumpFun({ paused });

  const flow = useMemo<X402FlowTrace | null>(
    () => (stats.topTokens.length > 0 ? buildPumpFlow(stats) : null),
    // Rebuild when top token count changes (not every trade)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats.topTokens.length, Math.floor(stats.totalTrades / 20)],
  );

  const apiEndpoints = useMemo(
    () => stats.topTokens.map((t) => t.symbol || t.name),
    [stats.topTokens],
  );

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#08080f' }}>
      {/* 3D Network — full screen */}
      <X402Network
        apiEndpoints={apiEndpoints}
        flow={flow}
        height="100%"
        stage={stats.totalTrades > 0 ? 'calling' : 'idle'}
        title="PumpFun · Live Network"
      />

      {/* Stats overlay — top left */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 20,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}
      >
        <StatPill label="Tokens" value={formatStat(stats.totalTokens)} />
        <StatPill label="Trades" value={formatStat(stats.totalTrades)} />
        <StatPill label="Volume" value={formatStat(stats.totalVolumeSol, '◎')} />
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: connected ? '#22c55e' : '#ef4444',
            marginLeft: 6,
          }}
          title={connected ? 'Connected to PumpFun' : 'Disconnected'}
        />
      </div>

      {/* Pause toggle — bottom left */}
      <button
        onClick={() => setPaused((p) => !p)}
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 20,
          padding: '4px 12px',
          fontFamily: 'monospace',
          fontSize: 10,
          color: 'rgb(176 176 200 / 50%)',
          background: 'rgb(176 176 200 / 4%)',
          border: '1px solid rgb(176 176 200 / 8%)',
          borderRadius: 4,
          cursor: 'pointer',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {paused ? '▶ Resume' : '⏸ Pause'}
      </button>

      {/* Live trade feed — bottom right */}
      <LiveFeed events={stats.recentEvents} />
    </div>
  );
}
