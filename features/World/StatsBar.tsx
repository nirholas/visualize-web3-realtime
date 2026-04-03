'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Animated Counter Hook
// ---------------------------------------------------------------------------

function useAnimatedValue(target: number, duration = 400): number {
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
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + diff * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

function formatNumber(n: number, prefix = ''): string {
  if (n >= 1_000_000_000) return `${prefix}${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  return `${prefix}${n.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Stat Pill
// ---------------------------------------------------------------------------

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
          borderRadius: 8,
          minWidth: 100,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
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
            fontSize: 14,
            fontWeight: 600,
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

// ---------------------------------------------------------------------------
// Address Search
// ---------------------------------------------------------------------------

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const AddressSearch = memo<{
  highlightedAddress?: string | null;
  onDismiss?: () => void;
  onSearch: (address: string) => void;
}>(({ onSearch, highlightedAddress, onDismiss }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input value when highlight changes
  useEffect(() => {
    if (highlightedAddress) {
      setValue(highlightedAddress);
    }
  }, [highlightedAddress]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      setError(false);
      onSearch(trimmed);
    },
    [value, onSearch],
  );

  const handleDismiss = useCallback(() => {
    setValue('');
    onDismiss?.();
  }, [onDismiss]);

  // Flash red border on error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(false), 1200);
      return () => clearTimeout(t);
    }
  }, [error]);

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 500,
          color: 'rgba(176,176,200,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginRight: 2,
        }}
      >
        Address
      </span>
      <input
        ref={inputRef}
        type="text"
        value={highlightedAddress ? truncateAddress(highlightedAddress) : value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search address…"
        style={{
          width: 180,
          padding: '5px 10px',
          fontSize: 11,
          fontFamily: 'inherit',
          color: 'rgba(255,255,255,0.8)',
          background: highlightedAddress
            ? 'rgba(61,99,255,0.12)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${error ? 'rgba(239,68,68,0.7)' : highlightedAddress ? 'rgba(61,99,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 6,
          outline: 'none',
          transition: 'border-color 0.3s ease',
        }}
      />
      {highlightedAddress ? (
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            padding: '5px 14px',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'inherit',
            color: '#fff',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      ) : (
      <button
        type="submit"
        style={{
          padding: '5px 14px',
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'inherit',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#fff',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
        }}
      >
        Go
      </button>
      )}
    </form>
  );
});

AddressSearch.displayName = 'AddressSearch';

// ---------------------------------------------------------------------------
// Stats Bar (exported)
// ---------------------------------------------------------------------------

export interface StatsBarProps {
  totalTokens: number;
  totalVolumeSol: number;
  totalTrades: number;
  /** The currently highlighted address (null = none) */
  highlightedAddress?: string | null;
  /** Called with the searched address. Parent should handle camera pan / not-found. */
  onAddressSearch?: (address: string) => void;
  /** Called when the user dismisses the highlight */
  onDismissHighlight?: () => void;
}

export default memo<StatsBarProps>(function StatsBar({
  totalTokens,
  totalVolumeSol,
  totalTrades,
  highlightedAddress,
  onAddressSearch,
  onDismissHighlight,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial address from URL
  useEffect(() => {
    const addr = searchParams.get('address');
    if (addr && onAddressSearch) {
      onAddressSearch(addr);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(
    (address: string) => {
      // Sync to URL
      const params = new URLSearchParams(searchParams.toString());
      params.set('address', address);
      router.replace(`?${params.toString()}`, { scroll: false });

      onAddressSearch?.(address);
    },
    [router, searchParams, onAddressSearch],
  );

  return (
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
        fontFamily: "'IBM Plex Mono', monospace",
        borderRadius: 12,
        background: 'rgba(8,8,15,0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <BottomStatPill label="Total Tokens" value={totalTokens} />
      <BottomStatPill label="Volume" value={totalVolumeSol} prefix="◎ " />
      <BottomStatPill label="Transactions" value={totalTrades} />

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 28,
          background: 'rgba(255,255,255,0.08)',
          margin: '0 4px',
        }}
      />

      <AddressSearch onSearch={handleSearch} highlightedAddress={highlightedAddress} onDismiss={onDismissHighlight} />
    </div>
  );
});
