'use client';

import { AnimatePresence, m } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';

import type { PumpFunEvent } from '@/hooks/usePumpFun';
import type { DataProviderEvent } from '@/hooks/useDataProvider';
import { CATEGORY_CONFIG_MAP } from '@/hooks/useDataProvider';

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
// Unified event card (works with DataProviderEvent)
// ---------------------------------------------------------------------------

interface UnifiedCardProps {
  event: DataProviderEvent;
  isNew: boolean;
}

const UnifiedCard = memo<UnifiedCardProps>(({ event, isNew }) => {
  const cfg = CATEGORY_CONFIG_MAP[event.category as keyof typeof CATEGORY_CONFIG_MAP];
  const color = cfg?.color || '#9090b8';
  const typeLabel = cfg?.label || event.category;
  const amount = event.amount != null ? `${event.amount.toFixed(3)} SOL` : '';

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
        padding: '4px 12px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: '#4a4a4a',
        background: '#ffffff',
        border: '1px solid #e8e8e8',
        borderRadius: 6,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.label}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 9,
          color: color,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          maxWidth: 80,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {typeLabel}
      </span>
      {amount && (
        <span style={{ flexShrink: 0, color, fontWeight: 500 }}>{amount}</span>
      )}
      <span style={{ flexShrink: 0, fontSize: 9, color: '#999' }}>{'>'}
        {timeAgo(event.timestamp)}
      </span>
    </m.div>
  );
});

UnifiedCard.displayName = 'UnifiedCard';

// ---------------------------------------------------------------------------
// Legacy event card (PumpFun raw events, kept for backward compat)
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
        padding: '4px 12px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: '#4a4a4a',
        background: '#ffffff',
        border: '1px solid #e8e8e8',
        borderRadius: 6,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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
          color: '#999',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {typeLabel}
      </span>
      {amount && (
        <span style={{ flexShrink: 0, color: isBuy ? '#22c55e' : '#ef4444', fontWeight: 500 }}>{amount}</span>
      )}
      <span style={{ flexShrink: 0, fontSize: 9, color: '#999' }}>
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
  /** Raw PumpFun events (legacy) */
  events: PumpFunEvent[];
  /** Unified provider events (new — takes priority when provided) */
  unifiedEvents?: DataProviderEvent[];
}

const LiveFeed = memo<LiveFeedProps>(({ events, unifiedEvents }) => {
  const prevKeysRef = useRef<Set<string>>(new Set());
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());

  // Prefer unified events when available
  const useUnified = unifiedEvents && unifiedEvents.length > 0;

  const visibleUnified = unifiedEvents?.slice(0, MAX_VISIBLE) || [];
  const visibleLegacy = events.slice(0, MAX_VISIBLE);

  const getKeyLegacy = (e: PumpFunEvent) =>
    e.type === 'trade'
      ? (e.data as { signature: string }).signature
      : (e.data as { signature: string }).signature || (e.data as { mint: string }).mint;

  const getKeyUnified = (e: DataProviderEvent) => e.id;

  useEffect(() => {
    const keys = useUnified
      ? visibleUnified.map(getKeyUnified)
      : visibleLegacy.map(getKeyLegacy);
    if (!keys.length) return;

    const currentKeys = new Set(keys);
    const incoming = new Set([...currentKeys].filter((k) => !prevKeysRef.current.has(k)));
    if (incoming.size > 0) setNewKeys(incoming);
    prevKeysRef.current = currentKeys;
  }, [useUnified, visibleUnified, visibleLegacy]);

  const hasEvents = useUnified ? visibleUnified.length > 0 : visibleLegacy.length > 0;
  if (!hasEvents) return null;

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
        width: 300,
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
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          fontWeight: 600,
          color: '#999',
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
        {useUnified
          ? visibleUnified.map((e) => {
              const key = getKeyUnified(e);
              return <UnifiedCard isNew={newKeys.has(key)} key={key} event={e} />;
            })
          : visibleLegacy.map((e) => {
              const key = getKeyLegacy(e);
              return <EventCard isNew={newKeys.has(key)} key={key} event={e} />;
            })}
      </AnimatePresence>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';

export default LiveFeed;
