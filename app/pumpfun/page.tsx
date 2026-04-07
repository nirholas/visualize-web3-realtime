'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion';
import { PumpFunProvider } from '@web3viz/providers';
import { useProviders } from '@web3viz/providers';
import type { DataProvider, DataProviderEvent, CategoryConfig, TopToken } from '@web3viz/core';
import { formatStat, formatAmount, timeAgo, truncateAddress, MONO_FONT } from '@/features/World/utils/shared';
import { DarkModeProvider, useDarkMode } from '@/features/World/DarkModeContext';
import { CHAIN_COLORS } from '@/features/World/constants';

// Lazy-load the 3D force graph to avoid SSR issues with Three.js
const ForceGraph = dynamic(() => import('@/features/World/ForceGraph'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#0a0a0f' }} />,
}) as any;

// ============================================================================
// Constants
// ============================================================================

const BG = '#0a0a0f';
const GLASS = 'rgba(12, 12, 20, 0.75)';
const GLASS_BORDER = 'rgba(255, 255, 255, 0.06)';
const ACCENT = '#a78bfa'; // PumpFun purple
const ACCENT_DIM = 'rgba(167, 139, 250, 0.15)';
const GREEN = '#34d399';
const RED = '#f87171';
const MUTED = '#64748b';
const TEXT = '#e2e8f0';
const TEXT_DIM = '#94a3b8';

// ============================================================================
// Animated Counter Hook
// ============================================================================

function useAnimatedValue(target: number, duration = 400): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number>(0);

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
// Connection Status Dot
// ============================================================================

const ConnectionDot = memo<{ connected: boolean }>(({ connected }) => (
  <span
    style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: connected ? GREEN : RED,
      boxShadow: connected ? `0 0 8px ${GREEN}` : `0 0 8px ${RED}`,
      transition: 'background 300ms, box-shadow 300ms',
    }}
  />
));
ConnectionDot.displayName = 'ConnectionDot';

// ============================================================================
// Stat Pill
// ============================================================================

const StatPill = memo<{ label: string; value: number; prefix?: string; color?: string }>(
  ({ label, value, prefix = '', color }) => {
    const animated = useAnimatedValue(value);
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 16px',
        background: GLASS,
        border: `1px solid ${GLASS_BORDER}`,
        borderRadius: 10,
        minWidth: 90,
        backdropFilter: 'blur(12px)',
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 400,
          color: MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          lineHeight: 1,
          marginBottom: 4,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 16,
          fontWeight: 600,
          color: color || TEXT,
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatStat(animated, prefix)}
        </span>
      </div>
    );
  },
);
StatPill.displayName = 'StatPill';

// ============================================================================
// Bonding Curve Bar
// ============================================================================

const BondingCurveBar = memo<{ progress: number; graduated: boolean }>(
  ({ progress, graduated }) => {
    const pct = Math.round(progress * 100);
    const barColor = graduated ? GREEN : ACCENT;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
        <div style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 2,
            background: barColor,
            transition: 'width 600ms ease',
            boxShadow: `0 0 6px ${barColor}40`,
          }} />
        </div>
        <span style={{
          fontSize: 9,
          fontWeight: 500,
          color: graduated ? GREEN : TEXT_DIM,
          minWidth: 30,
          textAlign: 'right',
        }}>
          {graduated ? 'GRAD' : `${pct}%`}
        </span>
      </div>
    );
  },
);
BondingCurveBar.displayName = 'BondingCurveBar';

// ============================================================================
// Token Card
// ============================================================================

const TokenCard = memo<{
  token: TopToken;
  rank: number;
  isActive: boolean;
  onClick: (mint: string) => void;
}>(({ token, rank, isActive, onClick }) => {
  const volume = token.volumeSol ?? token.volume;
  const symbol = token.nativeSymbol || 'SOL';
  return (
    <button
      type="button"
      onClick={() => onClick(token.tokenAddress)}
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '10px 12px',
        background: isActive ? ACCENT_DIM : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isActive ? 'rgba(167, 139, 250, 0.3)' : GLASS_BORDER}`,
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'background 200ms, border-color 200ms',
        fontFamily: MONO_FONT,
      }}
    >
      {/* Rank */}
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: MUTED,
        minWidth: 16,
        paddingTop: 2,
      }}>
        {rank}
      </span>

      {/* Token Image */}
      {token.imageUrl ? (
        <img
          src={token.imageUrl}
          alt=""
          width={32}
          height={32}
          style={{
            borderRadius: 8,
            objectFit: 'cover',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.04)',
          }}
          loading="lazy"
        />
      ) : (
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(167, 139, 250, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
        }}>
          ⚡
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            ${token.symbol}
          </span>
          <span style={{ fontSize: 10, color: ACCENT, fontWeight: 500, flexShrink: 0 }}>
            {formatAmount(volume, symbol)}
          </span>
        </div>
        <div style={{
          fontSize: 10,
          color: TEXT_DIM,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginTop: 2,
        }}>
          {token.name}
        </div>
        {token.bondingCurveProgress !== undefined && (
          <div style={{ marginTop: 4 }}>
            <BondingCurveBar
              progress={token.bondingCurveProgress}
              graduated={token.graduated ?? false}
            />
          </div>
        )}
      </div>
    </button>
  );
});
TokenCard.displayName = 'TokenCard';

// ============================================================================
// Event Row (compact live feed)
// ============================================================================

const EventRow = memo<{
  event: DataProviderEvent;
  isNew: boolean;
  categoryMap: Map<string, CategoryConfig>;
}>(({ event, isNew, categoryMap }) => {
  const cfg = categoryMap.get(event.category);
  const color = cfg?.color || '#9090b8';
  const typeLabel = cfg?.label || event.category;
  const amount = event.amount != null
    ? formatAmount(event.amount, event.nativeSymbol)
    : event.amountUsd != null
      ? formatAmount(event.amountUsd, 'USD')
      : '';

  return (
    <m.div
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      initial={{ opacity: isNew ? 0 : 1, x: isNew ? 10 : 0 }}
      layout
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        padding: '3px 10px',
        fontSize: 10,
        color: TEXT_DIM,
        borderBottom: `1px solid ${GLASS_BORDER}`,
      }}
    >
      <span style={{
        display: 'inline-block',
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
      <span style={{
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: TEXT_DIM,
      }}>
        {event.label}
      </span>
      {amount && (
        <span style={{ flexShrink: 0, color, fontWeight: 500, fontSize: 10 }}>
          {amount}
        </span>
      )}
      <span style={{ flexShrink: 0, fontSize: 9, color: MUTED }}>
        {timeAgo(event.timestamp)}
      </span>
    </m.div>
  );
});
EventRow.displayName = 'EventRow';

// ============================================================================
// Live Feed Panel
// ============================================================================

const LiveFeedPanel = memo<{
  events: DataProviderEvent[];
  categories: CategoryConfig[];
}>(({ events, categories }) => {
  const prevIdsRef = useRef(new Set<string>());
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryConfig>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const displayEvents = events.slice(0, 50);

  useEffect(() => {
    const next = new Set(displayEvents.map((e) => e.id));
    prevIdsRef.current = next;
  }, [displayEvents]);

  const prevIds = prevIdsRef.current;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 12px 6px',
        fontSize: 10,
        fontWeight: 600,
        color: MUTED,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        borderBottom: `1px solid ${GLASS_BORDER}`,
      }}>
        Live Feed
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        <LazyMotion features={domAnimation}>
          <AnimatePresence initial={false} mode="popLayout">
            {displayEvents.map((evt) => (
              <EventRow
                key={evt.id}
                event={evt}
                isNew={!prevIds.has(evt.id)}
                categoryMap={categoryMap}
              />
            ))}
          </AnimatePresence>
        </LazyMotion>
        {displayEvents.length === 0 && (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: MUTED,
            fontSize: 11,
          }}>
            Waiting for events…
          </div>
        )}
      </div>
    </div>
  );
});
LiveFeedPanel.displayName = 'LiveFeedPanel';

// ============================================================================
// Category Toggle
// ============================================================================

const CategoryToggle = memo<{
  category: CategoryConfig;
  enabled: boolean;
  count: number;
  onToggle: (id: string) => void;
}>(({ category, enabled, count, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(category.id)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 12px',
      fontSize: 10,
      fontWeight: 500,
      fontFamily: MONO_FONT,
      color: enabled ? TEXT : MUTED,
      background: enabled ? `${category.color}18` : 'transparent',
      border: `1px solid ${enabled ? `${category.color}40` : GLASS_BORDER}`,
      borderRadius: 20,
      cursor: 'pointer',
      transition: 'all 200ms',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: enabled ? category.color : MUTED,
      transition: 'background 200ms',
    }} />
    {category.label}
    {count > 0 && (
      <span style={{
        fontSize: 9,
        color: enabled ? category.color : MUTED,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {formatStat(count)}
      </span>
    )}
  </button>
));
CategoryToggle.displayName = 'CategoryToggle';

// ============================================================================
// Page Component
// ============================================================================

export default function PumpFunPage() {
  const [activeHubMint, setActiveHubMint] = useState<string | null>(null);

  // Instantiate PumpFun provider once
  const providers = useMemo<DataProvider[]>(() => [
    new PumpFunProvider({
      rpcWsUrl: process.env.NEXT_PUBLIC_SOLANA_WS_URL || undefined,
    }),
  ], []);

  // Auto-enable and auto-play
  const {
    stats,
    filteredEvents,
    enabledCategories,
    toggleCategory,
    enabledProviders,
    toggleProvider,
    categories,
    connections,
  } = useProviders({ providers, paused: false, startEnabled: true });

  // Connection status
  const isConnected = useMemo(() => {
    const conns = Object.values(connections).flat();
    return conns.some((c) => c.connected);
  }, [connections]);

  // Volume
  const totalVolume = useMemo(
    () => Object.values(stats.totalVolume ?? {}).reduce((s, v) => s + v, 0),
    [stats.totalVolume],
  );

  // Category map for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryConfig>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const handleTokenClick = useCallback((mint: string) => {
    setActiveHubMint((prev) => (prev === mint ? null : mint));
  }, []);

  return (
    <DarkModeProvider background={BG}>
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          background: BG,
          fontFamily: MONO_FONT,
          color: TEXT,
        }}
      >
        {/* ── 3D Force Graph (full screen background) ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
        }}>
          <ForceGraph
            topTokens={stats.topTokens}
            traderEdges={stats.traderEdges}
            activeProtocol={activeHubMint}
            onSelectProtocol={setActiveHubMint}
            height="100%"
            isDark={true}
            idle={!isConnected && stats.topTokens.length === 0}
          />
        </div>

        {/* ── Header Bar ── */}
        <header style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'linear-gradient(180deg, rgba(10,10,15,0.9) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}>
          {/* Left: Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚡</span>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              PumpFun
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 400,
              color: ACCENT,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Live
            </span>
            <ConnectionDot connected={isConnected} />
          </div>

          {/* Right: Stats */}
          <div style={{
            display: 'flex',
            gap: 8,
            pointerEvents: 'auto',
          }}>
            <StatPill label="Volume" value={totalVolume} prefix="◎ " color={ACCENT} />
            <StatPill label="Launches" value={stats.counts.launches ?? 0} />
            <StatPill label="Trades" value={stats.totalTransactions} />
            <StatPill label="Whales" value={stats.counts.whales ?? 0} color="#f59e0b" />
            <StatPill label="Snipers" value={stats.counts.snipers ?? 0} color={RED} />
          </div>
        </header>

        {/* ── Left Panel: Top Tokens ── */}
        <div style={{
          position: 'absolute',
          top: 70,
          left: 16,
          bottom: 60,
          width: 280,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          background: GLASS,
          border: `1px solid ${GLASS_BORDER}`,
          borderRadius: 14,
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 14px 8px',
            fontSize: 10,
            fontWeight: 600,
            color: MUTED,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            borderBottom: `1px solid ${GLASS_BORDER}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>Top Tokens</span>
            <span style={{ color: ACCENT, fontWeight: 500 }}>
              {stats.topTokens.length}
            </span>
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            {stats.topTokens.map((token, i) => (
              <TokenCard
                key={token.tokenAddress}
                token={token}
                rank={i + 1}
                isActive={activeHubMint === token.tokenAddress}
                onClick={handleTokenClick}
              />
            ))}
            {stats.topTokens.length === 0 && (
              <div style={{
                padding: 24,
                textAlign: 'center',
                color: MUTED,
                fontSize: 11,
              }}>
                Waiting for tokens…
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Live Feed ── */}
        <div style={{
          position: 'absolute',
          top: 70,
          right: 16,
          bottom: 60,
          width: 320,
          zIndex: 10,
          background: GLASS,
          border: `1px solid ${GLASS_BORDER}`,
          borderRadius: 14,
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
        }}>
          <LiveFeedPanel
            events={filteredEvents}
            categories={categories}
          />
        </div>

        {/* ── Bottom Bar: Category Filters ── */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          gap: 6,
          padding: '8px 16px',
          background: GLASS,
          border: `1px solid ${GLASS_BORDER}`,
          borderRadius: 24,
          backdropFilter: 'blur(16px)',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 'calc(100vw - 660px)',
        }}>
          {categories.map((cat) => (
            <CategoryToggle
              key={cat.id}
              category={cat}
              enabled={enabledCategories.has(cat.id)}
              count={stats.counts[cat.id] ?? 0}
              onToggle={toggleCategory}
            />
          ))}
        </div>
      </div>
    </DarkModeProvider>
  );
}
