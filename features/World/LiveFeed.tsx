'use client';

import { AnimatePresence, m } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';

import type { DataProviderEvent, CategoryConfig } from '@web3viz/core';
import { CHAIN_COLORS } from './constants';
import { formatAmount, timeAgo } from './utils/shared';

// ---------------------------------------------------------------------------
// Event Card (unified events)
// ---------------------------------------------------------------------------

interface EventCardProps {
  event: DataProviderEvent;
  isNew: boolean;
  categoryMap: Map<string, CategoryConfig>;
}

const EventCard = memo<EventCardProps>(({ event, isNew, categoryMap }) => {
  const cfg = categoryMap.get(event.category);
  const color = cfg?.color || '#9090b8';
  const typeLabel = cfg?.label || event.category;
  const amount = event.amount != null
    ? formatAmount(event.amount, event.nativeSymbol)
    : event.amountUsd != null
      ? formatAmount(event.amountUsd, 'USD')
      : '';
  const chainColor = CHAIN_COLORS[event.chain ?? 'unknown'] || CHAIN_COLORS.unknown;

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
      {event.chain && (
        <span style={{ fontSize: 9, color: chainColor, opacity: 0.7, flexShrink: 0 }}>
          {event.chain.toUpperCase().slice(0, 3)}
        </span>
      )}
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
      <span style={{ flexShrink: 0, fontSize: 9, color: '#999' }}>
        {'>'}
        {timeAgo(event.timestamp)}
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
  /** Unified provider events */
  events: DataProviderEvent[];
  /** All available categories for styling and labels */
  categories?: CategoryConfig[];
}

const LiveFeed = memo<LiveFeedProps>(({ events, categories = [] }) => {
  const prevKeysRef = useRef<Set<string>>(new Set());
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());

  // Build category map from categories array
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  const visibleEvents = events.slice(0, MAX_VISIBLE);

  const getKey = (e: DataProviderEvent) => e.id;

  useEffect(() => {
    const keys = visibleEvents.map(getKey);
    if (!keys.length) return;

    const currentKeys = new Set(keys);
    const incoming = new Set([...currentKeys].filter((k) => !prevKeysRef.current.has(k)));
    if (incoming.size > 0) setNewKeys(incoming);
    prevKeysRef.current = currentKeys;
  }, [visibleEvents]);

  const hasEvents = visibleEvents.length > 0;
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
        {visibleEvents.map((e) => {
          const key = getKey(e);
          return <EventCard isNew={newKeys.has(key)} key={key} event={e} categoryMap={categoryMap} />;
        })}
      </AnimatePresence>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';

export default LiveFeed;
