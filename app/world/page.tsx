'use client';

import dynamic from 'next/dynamic';
import { memo, Suspense, useCallback, useMemo, useRef, useState } from 'react';

import InfoPopover from '@/features/World/InfoPopover';
import JourneyOverlay from '@/features/World/JourneyOverlay';
import ShareOverlay from '@/features/World/ShareOverlay';
import SharePanel, { type ShareColors } from '@/features/World/SharePanel';
import {
  useDataProvider,
  CATEGORY_CONFIGS,
  type PumpFunCategory,
} from '@/hooks/useDataProvider';
import LiveFeed from '@/features/World/LiveFeed';
import StartJourney from '@/features/World/StartJourney';
import StatsBar from '@/features/World/StatsBar';
import { useJourney } from '@/features/World/useJourney';
import type { X402NetworkHandle } from '@/features/X402Flow/X402Network';
import type { X402FlowTrace } from '@/features/X402Flow/types';

// Lazy-load the 3D network to avoid SSR issues with Three.js
const X402Network = dynamic(() => import('@/features/X402Flow/X402Network'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#08080f' }} />,
}) as any;

// ---------------------------------------------------------------------------
// Map provider data → X402FlowTrace for the network visualization
// ---------------------------------------------------------------------------

function buildCategoryFlow(
  stats: ReturnType<typeof useDataProvider>['stats'],
  enabledCategories: Set<PumpFunCategory>,
): X402FlowTrace {
  const now = Date.now();

  // Each enabled category becomes an API call / hub node
  const enabledConfigs = CATEGORY_CONFIGS.filter((c) => enabledCategories.has(c.id));

  return {
    agentAddress: 'pump.fun',
    agentName: 'PumpFun Network',
    apiCalls: enabledConfigs.map((cfg, i) => ({
      amountPaid: String(stats.counts[cfg.id]),
      duration: 200,
      id: `cat-${cfg.id}`,
      paymentRequired: true,
      responseStatus: 200,
      url: cfg.label,
    })),
    duration: 0,
    events: enabledConfigs.flatMap((cfg, i) => [
      {
        amount: String(stats.counts[cfg.id]),
        apiUrl: cfg.label,
        category: cfg.id,
        sequenceIndex: i * 2,
        timestamp: now - (enabledConfigs.length - i) * 2000,
        type: 'api_call_start' as const,
      },
      {
        amount: String(stats.counts[cfg.id]),
        apiUrl: cfg.label,
        category: cfg.id,
        sequenceIndex: i * 2 + 1,
        timestamp: now - (enabledConfigs.length - i) * 1000,
        type: 'api_call_complete' as const,
      },
    ]),
    flowId: `pump-categories-${now}`,
    startedAt: now,
    status: 'active',
    totalPaid: String(stats.totalVolumeSol.toFixed(4)),
    userPrompt: 'PumpFun Live Activity',
  };
}

function formatStat(value: number, prefix = ''): string {
  if (value >= 1_000_000_000) return `${prefix}${(value / 1_000_000_000).toFixed(1)}B`;
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
// Connection status dot
// ---------------------------------------------------------------------------

const ConnectionDot = memo<{ connected: boolean; label: string }>(({ connected, label }) => (
  <div
    style={{
      display: 'flex',
      gap: 4,
      alignItems: 'center',
      padding: '3px 8px',
      fontFamily: 'monospace',
      fontSize: 9,
      color: 'rgb(176 176 200 / 30%)',
      letterSpacing: '0.04em',
    }}
    title={`${label}: ${connected ? 'Connected' : 'Disconnected'}`}
  >
    <div
      style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: connected ? '#22c55e' : '#ef4444',
      }}
    />
    {label}
  </div>
));

ConnectionDot.displayName = 'ConnectionDot';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorldPage() {
  const [paused, setPaused] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareColors, setShareColors] = useState<ShareColors>({
    background: '#ffffff',
    protocol: '#1a1a1a',
    user: '#1a1a1a',
  });
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const networkRef = useRef<X402NetworkHandle | null>(null);

  const { stats, filteredEvents, enabledCategories, toggleCategory, connected } =
    useDataProvider({ paused });

  const handleAddressSearch = useCallback((address: string) => {
    setUserAddress(address);
  }, []);

  const shareTheme = useMemo(
    () => ({
      bg: shareColors.background,
      nodeColor: shareColors.protocol,
      userColor: shareColors.user,
    }),
    [shareColors],
  );

  const handleOpenShare = useCallback(() => setShareOpen(true), []);
  const handleCloseShare = useCallback(() => setShareOpen(false), []);

  const { isComplete, isRunning, overlay, skipJourney, startJourney } = useJourney({
    enabledCategories,
    networkRef,
    stats,
    userAddress,
  });

  const flow = useMemo<X402FlowTrace | null>(
    () =>
      enabledCategories.size > 0
        ? buildCategoryFlow(stats, enabledCategories)
        : null,
    // Rebuild periodically, not on every event
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabledCategories, Math.floor(stats.totalTransactions / 20)],
  );

  const apiEndpoints = useMemo(
    () =>
      CATEGORY_CONFIGS
        .filter((c) => enabledCategories.has(c.id))
        .map((c) => c.label),
    [enabledCategories],
  );

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#08080f' }}>
      {/* 3D Network — full screen */}
      <X402Network
        apiEndpoints={apiEndpoints}
        categoryColors={CATEGORY_CONFIGS.filter((c) => enabledCategories.has(c.id)).map((c) => c.color)}
        flow={flow}
        height="100%"
        onShare={handleOpenShare}
        ref={networkRef}
        stage={stats.totalTransactions > 0 ? 'calling' : 'idle'}
        theme={shareTheme}
        title="PumpFun · Live Network"
      />

      <JourneyOverlay
        description={overlay.description}
        isVisible={overlay.visible}
        label={overlay.label}
        onSkip={skipJourney}
        title={overlay.title}
      />

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 8,
          left: '50%',
          position: 'absolute',
          top: 12,
          transform: 'translateX(-50%)',
          zIndex: 40,
        }}
      >
        <span
          style={{
            color: 'rgba(176 176 200 / 55%)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          World of PumpFun
        </span>
        <div style={{ position: 'relative' }}>
          <button
            aria-controls="world-info-popover"
            aria-expanded={infoOpen}
            aria-label="Open world information"
            onClick={() => setInfoOpen((prev) => !prev)}
            ref={infoButtonRef}
            style={{
              alignItems: 'center',
              background: 'rgba(176 176 200 / 12%)',
              border: '1px solid rgba(176 176 200 / 35%)',
              borderRadius: '50%',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              height: 20,
              justifyContent: 'center',
              width: 20,
            }}
            type="button"
          >
            i
          </button>
          <InfoPopover
            anchorRef={infoButtonRef}
            id="world-info-popover"
            isOpen={infoOpen}
            onClose={() => setInfoOpen(false)}
          />
        </div>
      </div>

      {/* Connection status — top left */}
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
        <ConnectionDot connected={connected.pumpFun} label="PF" />
        <ConnectionDot connected={connected.claims} label="SOL" />
      </div>

      {/* Category filter sidebar — left */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {CATEGORY_CONFIGS.map((cfg) => {
          const isActive = enabledCategories.has(cfg.id);
          return (
            <button
              key={cfg.id}
              onClick={() => toggleCategory(cfg.id)}
              style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                padding: '5px 10px',
                fontFamily: 'monospace',
                fontSize: 10,
                color: isActive ? cfg.color : 'rgb(176 176 200 / 20%)',
                background: isActive ? 'rgb(176 176 200 / 6%)' : 'rgb(176 176 200 / 2%)',
                border: `1px solid ${isActive ? cfg.color + '40' : 'rgb(176 176 200 / 6%)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                letterSpacing: '0.04em',
              }}
              title={`Toggle ${cfg.label}`}
            >
              <span style={{ fontSize: 10, opacity: isActive ? 1 : 0.3 }}>{cfg.icon}</span>
              {cfg.label}
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 9,
                  color: isActive ? 'rgb(176 176 200 / 40%)' : 'rgb(176 176 200 / 15%)',
                }}
              >
                {formatStat(stats.counts[cfg.id])}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pause toggle — top right of bottom bar */}
      <button
        onClick={() => setPaused((p) => !p)}
        style={{
          position: 'absolute',
          bottom: 68,
          left: 12,
          zIndex: 20,
          padding: '4px 12px',
          fontFamily: "'IBM Plex Mono', monospace",
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
        {paused ? '\u25B6 Resume' : '\u23F8 Pause'}
      </button>

      {/* Bottom stats bar */}
      <Suspense fallback={null}>
        <StatsBar
          totalTokens={stats.counts.launches + stats.counts.agentLaunches}
          totalVolumeSol={Math.round(stats.totalVolumeSol)}
          totalTrades={stats.totalTransactions}
          onAddressSearch={handleAddressSearch}
        />
      </Suspense>

      {/* Live trade feed — bottom right */}
      <LiveFeed events={stats.rawPumpFunEvents} unifiedEvents={filteredEvents} />

      <StartJourney
        disabled={isRunning}
        isRunning={isRunning}
        onClick={startJourney}
        restarted={isComplete}
      />

      {/* Share panel + overlay */}
      {shareOpen && (
        <>
          <ShareOverlay
            address={userAddress || 'pump.fun'}
            activeSince="Jan 2025"
            transactionCount={stats.totalTransactions}
            volume={Math.round(stats.totalVolumeSol)}
          />
          <SharePanel
            colors={shareColors}
            onChange={setShareColors}
            onClose={handleCloseShare}
          />
        </>
      )}
    </div>
  );
}
