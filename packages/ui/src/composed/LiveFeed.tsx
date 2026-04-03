'use client';

import React, { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import type { DataProviderEvent, CategoryConfig } from '@web3viz/core';
import { fontFamily, fontSize } from '../tokens/typography';
import { borderRadius, shadows } from '../tokens/spacing';
import { StatusDot } from '../primitives/Badge';

// ============================================================================
// Helpers
// ============================================================================

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

// ============================================================================
// Event Card
// ============================================================================

interface EventCardProps {
  event: DataProviderEvent;
  isNew: boolean;
  categoryMap?: Record<string, CategoryConfig>;
}

const EventCard = memo<EventCardProps>(({ event, isNew, categoryMap }) => {
  const cfg = categoryMap?.[event.category];
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
        fontFamily: fontFamily.mono,
        fontSize: fontSize.sm,
        color: 'var(--w3v-fg, #4a4a4a)',
        background: 'var(--w3v-bg, #ffffff)',
        border: '1px solid var(--w3v-border, #e8e8e8)',
        borderRadius: borderRadius.md,
        boxShadow: shadows.sm,
      }}
    >
      <StatusDot color={color} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.label}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: fontSize['2xs'],
          color,
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
      {amount && <span style={{ flexShrink: 0, color, fontWeight: 500 }}>{amount}</span>}
      <span style={{ flexShrink: 0, fontSize: fontSize['2xs'], color: 'var(--w3v-muted, #999)' }}>
        {timeAgo(event.timestamp)}
      </span>
    </m.div>
  );
});
EventCard.displayName = 'EventCard';

// ============================================================================
// LiveFeed
// ============================================================================

export interface LiveFeedProps {
  events: DataProviderEvent[];
  categoryMap?: Record<string, CategoryConfig>;
  maxVisible?: number;
  style?: CSSProperties;
}

export const LiveFeed = memo<LiveFeedProps>(({
  events,
  categoryMap,
  maxVisible = 12,
  style,
}) => {
  const prevKeysRef = useRef<Set<string>>(new Set());
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const visible = events.slice(0, maxVisible);

  useEffect(() => {
    const keys = visible.map((e) => e.id);
    if (!keys.length) return;
    const currentKeys = new Set(keys);
    const incoming = new Set([...currentKeys].filter((k) => !prevKeysRef.current.has(k)));
    if (incoming.size > 0) setNewKeys(incoming);
    prevKeysRef.current = currentKeys;
  }, [visible]);

  if (!visible.length) return null;

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
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          padding: '2px 0',
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs,
          fontWeight: 600,
          color: 'var(--w3v-muted, #999)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        <StatusDot color="var(--w3v-success, #22c55e)" pulse />
        LIVE
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            isNew={newKeys.has(e.id)}
            categoryMap={categoryMap}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';
