'use client';

import { AnimatePresence, m } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';

import type { PumpFunEvent } from '@/hooks/usePumpFun';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol < 0.001) return '<0.001 SOL';
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}k SOL`;
  if (sol >= 1) return `${sol.toFixed(2)} SOL`;
  return `${sol.toFixed(3)} SOL`;
}

// ---------------------------------------------------------------------------
// Single event card
// ---------------------------------------------------------------------------

interface EventCardProps {
  event: PumpFunEvent;
  isNew: boolean;
}

const EventCard = memo<EventCardProps>(({ event, isNew }) => {
  const isTrade = event.type === 'trade';
  const data = event.data;

  const label = isTrade
    ? (data as { symbol?: string; mint: string }).symbol || (data as { mint: string }).mint.slice(0, 8)
    : (data as { symbol?: string }).symbol || '???';

  const isBuy = isTrade && (data as { txType: string }).txType === 'buy';
  const statusColor = isTrade ? (isBuy ? '#22c55e' : '#ef4444') : '#8b5cf6';
  const typeLabel = isTrade ? (isBuy ? 'BUY' : 'SELL') : 'NEW';
  const amount = isTrade ? formatSol((data as { solAmount: number }).solAmount) : '';
  const timestamp = (data as { timestamp: number }).timestamp;

  return (
    <m.div
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      initial={{ opacity: isNew ? 0 : 1, x: isNew ? 12 : 0 }}
      layout
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        padding: '3px 10px',
        fontFamily: 'monospace',
        fontSize: 11,
        color: 'rgb(176 176 200 / 70%)',
        background: 'rgb(176 176 200 / 4%)',
        border: '1px solid rgb(176 176 200 / 6%)',
        borderRadius: 4,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: statusColor,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 9,
          color: 'rgb(176 176 200 / 30%)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {typeLabel}
      </span>
      {amount && (
        <span style={{ flexShrink: 0, color: isBuy ? '#22c55e' : '#ef4444' }}>{amount}</span>
      )}
      <span style={{ flexShrink: 0, fontSize: 9, color: 'rgb(176 176 200 / 30%)' }}>
        {timeAgo(timestamp)}
      </span>
    </m.div>
  );
});

EventCard.displayName = 'EventCard';

// ---------------------------------------------------------------------------
// Live Feed container
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 12;

interface LiveFeedProps {
  events: PumpFunEvent[];
}

const LiveFeed = memo<LiveFeedProps>(({ events }) => {
  const prevKeysRef = useRef<Set<string>>(new Set());
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());

  const visible = events.slice(0, MAX_VISIBLE);

  const getKey = (e: PumpFunEvent) =>
    e.type === 'trade'
      ? (e.data as { signature: string }).signature
      : (e.data as { signature: string }).signature || (e.data as { mint: string }).mint;

  useEffect(() => {
    if (!visible.length) return;
    const currentKeys = new Set(visible.map(getKey));
    const incoming = new Set([...currentKeys].filter((k) => !prevKeysRef.current.has(k)));
    if (incoming.size > 0) setNewKeys(incoming);
    prevKeysRef.current = currentKeys;
  }, [visible]);

  if (visible.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 60,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: 280,
        maxHeight: '40vh',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          padding: '2px 0',
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: 600,
          color: 'rgb(176 176 200 / 40%)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            background: '#22c55e',
            borderRadius: '50%',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        LIVE
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((e) => {
          const key = getKey(e);
          return <EventCard isNew={newKeys.has(key)} key={key} event={e} />;
        })}
      </AnimatePresence>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';

export default LiveFeed;
