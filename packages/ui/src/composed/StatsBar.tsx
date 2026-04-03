'use client';

import React, { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { fontFamily, fontSize, fontWeight } from '../tokens/typography';
import { borderRadius } from '../tokens/spacing';
import { TextInput } from '../primitives/Input';
import { Button } from '../primitives/Button';

// ============================================================================
// Animated value hook
// ============================================================================

export function useAnimatedValue(target: number, duration = 400): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = to;
    if (from === to) return;

    const start = performance.now();
    const diff = to - from;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + diff * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

// ============================================================================
// Number formatting
// ============================================================================

export function formatNumber(n: number, prefix = ''): string {
  if (n >= 1_000_000_000) return `${prefix}${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  return `${prefix}${n.toLocaleString()}`;
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============================================================================
// BottomStatPill
// ============================================================================

const BottomStatPill = memo<{ label: string; value: number; prefix?: string }>(
  ({ label, value, prefix = '' }) => {
    const animated = useAnimatedValue(value);
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '6px 16px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: borderRadius.lg,
          minWidth: 100,
        }}
      >
        <span
          style={{
            fontSize: fontSize['2xs'],
            fontWeight: fontWeight.medium,
            fontFamily: fontFamily.mono,
            color: 'rgba(176,176,200,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            fontFamily: fontFamily.mono,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.4,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatNumber(animated, prefix)}
        </span>
      </div>
    );
  },
);
BottomStatPill.displayName = 'BottomStatPill';

// ============================================================================
// Address Search
// ============================================================================

const AddressSearch = memo<{
  highlightedAddress?: string | null;
  onDismiss?: () => void;
  onSearch: (address: string) => void;
}>(({ onSearch, highlightedAddress, onDismiss }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (highlightedAddress) setValue(highlightedAddress);
  }, [highlightedAddress]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      onSearch(trimmed);
    },
    [value, onSearch],
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontSize: fontSize['2xs'],
          fontWeight: fontWeight.medium,
          fontFamily: fontFamily.mono,
          color: 'rgba(176,176,200,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginRight: 2,
        }}
      >
        Address
      </span>
      <TextInput
        variant="dark"
        value={highlightedAddress ? truncateAddress(highlightedAddress) : value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search address\u2026"
        inputStyle={{ width: 180 }}
      />
      {highlightedAddress ? (
        <Button variant="ghost" size="sm" onClick={onDismiss} type="button"
          style={{ color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
          \u2715
        </Button>
      ) : (
        <Button variant="ghost" size="sm" type="submit"
          style={{ color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)' }}>
          Go
        </Button>
      )}
    </form>
  );
});
AddressSearch.displayName = 'AddressSearch';

// ============================================================================
// StatsBar
// ============================================================================

export interface StatsBarProps {
  totalTokens: number;
  totalVolumeSol: number;
  totalTrades: number;
  highlightedAddress?: string | null;
  onAddressSearch?: (address: string) => void;
  onDismissHighlight?: () => void;
  style?: CSSProperties;
}

export const StatsBar = memo<StatsBarProps>(({
  totalTokens,
  totalVolumeSol,
  totalTrades,
  highlightedAddress,
  onAddressSearch,
  onDismissHighlight,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '6px 12px',
      fontFamily: fontFamily.mono,
      borderRadius: borderRadius.xl,
      background: 'rgba(8,8,15,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.06)',
      flexWrap: 'wrap',
      justifyContent: 'center',
      ...style,
    }}
  >
    <BottomStatPill label="Total Tokens" value={totalTokens} />
    <BottomStatPill label="Volume" value={totalVolumeSol} prefix="\u25CE " />
    <BottomStatPill label="Transactions" value={totalTrades} />

    <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

    {onAddressSearch && (
      <AddressSearch
        onSearch={onAddressSearch}
        highlightedAddress={highlightedAddress}
        onDismiss={onDismissHighlight}
      />
    )}
  </div>
));

StatsBar.displayName = 'StatsBar';
