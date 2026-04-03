'use client';

import dynamic from 'next/dynamic';
import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import InfoPopover from '@/features/World/InfoPopover';
import JourneyOverlay from '@/features/World/JourneyOverlay';
import LoadingScreen from '@/features/World/LoadingScreen';
import ProtocolFilterSidebar from '@/features/World/ProtocolFilterSidebar';
import ShareOverlay from '@/features/World/ShareOverlay';
import SharePanel, { type ShareColors } from '@/features/World/SharePanel';
import {
  useDataProvider,
  CATEGORY_CONFIGS,
} from '@/hooks/useDataProvider';
import LiveFeed from '@/features/World/LiveFeed';
import TimelineBar from '@/features/World/TimelineBar';
import StartJourney from '@/features/World/StartJourney';
import StatsBar from '@/features/World/StatsBar';
import { useJourney } from '@/features/World/useJourney';
import EmbedConfigurator from '@/features/World/EmbedConfigurator';
import { captureCanvas, downloadBlob, timestampedFilename } from '@/features/World/utils/screenshot';
import { buildShareUrl, buildShareText, parseShareParams, shareOnX, shareOnLinkedIn } from '@/features/World/utils/shareUrl';
import type { ForceGraphHandle } from '@/features/World/ForceGraph';

// Lazy-load the 3D force graph to avoid SSR issues with Three.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph = dynamic(() => import('@/features/World/ForceGraph'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#ffffff' }} />,
}) as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      padding: '4px 12px',
      fontFamily: "'IBM Plex Mono', monospace",
      background: '#ffffff',
      border: '1px solid #e8e8e8',
      borderRadius: 6,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}
  >
    <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>
      {label}
    </span>
    <span style={{ fontSize: 14, fontWeight: 500, color: '#161616' }}>
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
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 9,
      color: '#999',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeFilter, setTimeFilter] = useState<number | null>(null);
  const isLive = timeFilter === null;
  const [infoOpen, setInfoOpen] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [canvasReady, setCanvasReady] = useState(false);
  const [highlightedAddress, setHighlightedAddress] = useState<string | null>(null);
  const [highlightedHubIndex, setHighlightedHubIndex] = useState<number | null>(null);
  const [activeHubMint, setActiveHubMint] = useState<string | null>(null);
  const [searchToast, setSearchToast] = useState<string | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [shareColors, setShareColors] = useState<ShareColors>({
    background: '#ffffff',
    protocol: '#1a1a1a',
    user: '#1a1a1a',
  });
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const graphRef = useRef<ForceGraphHandle>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<'world' | 'snapshot' | null>(null);

  const { stats, enabledCategories, connected, showAgents, toggleAgents, enabledSources } =
    useDataProvider({ paused: !isPlaying });

  // Mark canvas ready once first data arrives
  useEffect(() => {
    if (!canvasReady && stats.topTokens.length > 0) {
      setCanvasReady(true);
    }
  }, [canvasReady, stats.topTokens.length]);

  // -- Timeline timestamp accumulation --
  const [timelineTimestamps, setTimelineTimestamps] = useState<number[]>([]);
  const seenEventIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const newTs: number[] = [];
    for (const evt of stats.recentEvents) {
      if (!seenEventIdsRef.current.has(evt.id)) {
        seenEventIdsRef.current.add(evt.id);
        newTs.push(evt.timestamp);
      }
    }
    if (newTs.length > 0) {
      setTimelineTimestamps((prev) => {
        const next = [...prev, ...newTs];
        return next.length > 5000 ? next.slice(-5000) : next;
      });
    }
  }, [stats.recentEvents]);

  // -- Time range for auto-advance --
  const timeRange = useMemo(() => {
    if (timelineTimestamps.length === 0) return { min: 0, max: 0 };
    let min = Infinity;
    let max = -Infinity;
    for (const ts of timelineTimestamps) {
      if (ts < min) min = ts;
      if (ts > max) max = ts;
    }
    return { min, max };
  }, [timelineTimestamps]);

  const timeRangeRef = useRef(timeRange);
  timeRangeRef.current = timeRange;

  // -- Playback auto-advance --
  useEffect(() => {
    if (!isPlaying || isLive) return;
    const interval = setInterval(() => {
      const { min: tMin, max: tMax } = timeRangeRef.current;
      const range = tMax - tMin;
      if (range === 0) return;
      const step = range / 200;
      setTimeFilter((prev) => {
        if (prev === null) return null;
        const next = prev + step;
        if (next >= tMax) return null; // reached live
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, isLive]);

  // -- Timeline handlers --
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleTimeChange = useCallback((ts: number | null) => {
    setTimeFilter(ts);
    if (ts !== null) {
      setIsPlaying(false);
    }
  }, []);

  // -- Time-filtered data for ForceGraph --
  const displayTopTokens = useMemo(() => {
    if (timeFilter === null) return stats.topTokens;
    const { min, max } = timeRange;
    const range = max - min;
    if (range === 0) return stats.topTokens;
    const frac = Math.max(0, Math.min(1, (timeFilter - min) / range));
    const count = Math.max(1, Math.ceil(stats.topTokens.length * frac));
    return stats.topTokens.slice(0, count);
  }, [stats.topTokens, timeFilter, timeRange]);

  const displayTraderEdges = useMemo(() => {
    if (timeFilter === null) return stats.traderEdges;
    const visibleMints = new Set(displayTopTokens.map((t) => t.mint));
    return stats.traderEdges.filter((e) => visibleMints.has(e.mint));
  }, [stats.traderEdges, displayTopTokens, timeFilter]);

  // -- Time-filtered events for LiveFeed --
  const displayRawEvents = useMemo(() => {
    if (timeFilter === null) return stats.rawPumpFunEvents;
    return stats.rawPumpFunEvents.filter((e) => e.data.timestamp <= timeFilter);
  }, [stats.rawPumpFunEvents, timeFilter]);

  // Protocol filter sidebar: toggle highlight by mint (single select)
  const handleProtocolToggle = useCallback((mint: string) => {
    setActiveHubMint((prev) => {
      const next = prev === mint ? null : mint;
      // Sync to URL
      const url = new URL(window.location.href);
      if (next) {
        url.searchParams.set('protocols', next);
      } else {
        url.searchParams.delete('protocols');
      }
      window.history.replaceState({}, '', url.toString());
      return next;
    });
  }, []);

  // Read ?protocols= param on mount to restore filter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proto = params.get('protocols');
    if (proto) {
      setActiveHubMint(proto);
    }
  }, []);

  // Search for an address in recent events and highlight the corresponding hub
  const handleAddressSearch = useCallback((address: string) => {
    setUserAddress(address);

    // First try finding the agent in the graph simulation
    const agentHub = graphRef.current?.findAgentHub(address);
    if (agentHub) {
      setSearchToast(null);
      setHighlightedAddress(address);
      // Don't set hub index — the agent gets its own marker + highlighting
      graphRef.current?.focusAgent(address, 800);
      return;
    }

    // Fallback: search in recent events
    const match = stats.recentEvents.find(
      (evt) => evt.address.toLowerCase() === address.toLowerCase(),
    );

    if (!match) {
      setSearchToast('Address not found in current data');
      setSearchError(true);
      setTimeout(() => setSearchError(false), 1200);
      setHighlightedAddress(null);
      setHighlightedHubIndex(null);
      return;
    }

    setSearchToast(null);
    setHighlightedAddress(address);

    // Map category → hub index (best-effort fallback)
    const enabledConfigs = CATEGORY_CONFIGS.filter((c) => (enabledCategories as Set<string>).has(c.id));
    const categoryIdx = enabledConfigs.findIndex((c) => c.id === match.category);
    const hubIndex = categoryIdx >= 0 ? categoryIdx : 0;
    setHighlightedHubIndex(hubIndex);
    graphRef.current?.focusHub(hubIndex, 500);
  }, [stats.recentEvents, enabledCategories]);

  const handleDismissHighlight = useCallback(() => {
    setHighlightedAddress(null);
    setHighlightedHubIndex(null);
    // Clear address from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('address');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Clear toast after 3 seconds
  useEffect(() => {
    if (!searchToast) return;
    const t = setTimeout(() => setSearchToast(null), 3000);
    return () => clearTimeout(t);
  }, [searchToast]);

  // Auto-search from URL ?address= param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const addr = params.get('address');
    if (addr) {
      // Delay to allow data to stream in
      const t = setTimeout(() => handleAddressSearch(addr), 2000);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenShare = useCallback(() => setShareOpen(true), []);
  const handleCloseShare = useCallback(() => setShareOpen(false), []);

  // --- Download World (raw canvas) ---
  const handleDownloadWorld = useCallback(async () => {
    const canvas = graphRef.current?.getCanvasElement();
    if (!canvas) return;
    setDownloading('world');
    try {
      const blob = await captureCanvas(canvas);
      downloadBlob(blob, timestampedFilename('pumpfun-world'));
    } finally {
      setDownloading(null);
    }
  }, []);

  // --- Download Snapshot (canvas + overlay) ---
  const handleDownloadSnapshot = useCallback(async () => {
    const canvas = graphRef.current?.getCanvasElement();
    if (!canvas) return;
    setDownloading('snapshot');
    try {
      const blob = await captureCanvas(canvas, overlayRef.current ?? undefined);
      downloadBlob(blob, timestampedFilename('pumpfun-snapshot'));
    } finally {
      setDownloading(null);
    }
  }, []);

  // --- Share on X ---
  const handleShareX = useCallback(() => {
    const url = buildShareUrl(shareColors, userAddress || undefined);
    const text = buildShareText(
      {
        tokens: stats.counts.launches + stats.counts.agentLaunches,
        volume: Math.round(stats.totalVolumeSol),
        transactions: stats.totalTransactions,
      },
      url,
    );
    shareOnX(text, url);
  }, [shareColors, userAddress, stats]);

  // --- Share on LinkedIn ---
  const handleShareLinkedIn = useCallback(() => {
    const url = buildShareUrl(shareColors, userAddress || undefined);
    shareOnLinkedIn(url);
  }, [shareColors, userAddress]);

  // --- Parse share URL color params on mount ---
  useEffect(() => {
    const { colors } = parseShareParams(window.location.search);
    if (colors.background || colors.protocol || colors.user) {
      setShareColors((prev) => ({ ...prev, ...colors }));
    }
  }, []);

  const { isComplete, isRunning, overlay, skipJourney, startJourney } = useJourney({
    enabledCategories,
    graphRef,
    stats,
    userAddress,
  });

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#ffffff' }}>
      {/* Loading screen */}
      <LoadingScreen ready={canvasReady} />

      {/* Timeline scrubber — top bar */}
      <TimelineBar
        eventTimestamps={timelineTimestamps}
        isLive={isLive}
        isPlaying={isPlaying}
        onInfoClick={() => setInfoOpen((prev) => !prev)}
        onTimeChange={handleTimeChange}
        onTogglePlay={handleTogglePlay}
        timeFilter={timeFilter}
      />

      {/* 3D Force Graph — full screen, offset for timeline bar */}
      <div style={{ position: 'absolute', top: 48, left: 0, right: 0, bottom: 0 }}>
        <ForceGraph
          ref={graphRef}
          topTokens={displayTopTokens}
          traderEdges={displayTraderEdges}
          activeProtocol={activeHubMint}
          highlightedHubIndex={highlightedHubIndex}
          highlightedAddress={highlightedAddress}
          onSelectProtocol={setActiveHubMint}
          onDismissHighlight={handleDismissHighlight}
          height="100%"
          shareColors={shareOpen ? shareColors : undefined}
        />
      </div>

      <JourneyOverlay
        description={overlay.description}
        isVisible={overlay.visible}
        label={overlay.label}
        onSkip={skipJourney}
        title={overlay.title}
      />

      {/* Address search toast */}
      {searchToast && (
        <div
          style={{
            background: 'rgba(0,0,0,0.75)',
            borderRadius: 8,
            bottom: 80,
            color: '#fff',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            left: '50%',
            padding: '8px 16px',
            pointerEvents: 'none',
            position: 'absolute',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            zIndex: 30,
          }}
        >
          {searchToast}
        </div>
      )}

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 8,
          left: '50%',
          position: 'absolute',
          top: 60,
          transform: 'translateX(-50%)',
          zIndex: 40,
        }}
      >
        <span
          style={{
            color: '#999',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          World of PumpFun
        </span>
        <Link
          href="/agents"
          style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#c084fc',
            textDecoration: 'none',
            padding: '2px 8px',
            border: '1px solid rgba(192,132,252,0.3)',
            borderRadius: 10,
          }}
        >
          ⬡ Agents
        </Link>
        <div style={{ position: 'relative' }}>
          <button
            aria-controls="world-info-popover"
            aria-expanded={infoOpen}
            aria-label="Open world information"
            onClick={() => setInfoOpen((prev) => !prev)}
            ref={infoButtonRef}
            style={{
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: '50%',
              color: '#161616',
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
          top: 60,
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

      {/* Protocol filter sidebar — left */}
      <ProtocolFilterSidebar
        tokens={displayTopTokens}
        activeMint={activeHubMint}
        onToggle={handleProtocolToggle}
        showAgents={showAgents}
        onToggleAgents={toggleAgents}
      />

      {/* Bottom stats bar */}
      <Suspense fallback={null}>
        <StatsBar
          totalTokens={stats.counts.launches + stats.counts.agentLaunches}
          totalVolumeSol={Math.round(stats.totalVolumeSol)}
          totalTrades={stats.totalTransactions}
          highlightedAddress={highlightedAddress}
          onAddressSearch={handleAddressSearch}
          onDismissHighlight={handleDismissHighlight}
          searchError={searchError}
        />
      </Suspense>

      {/* Live trade feed — bottom right */}
      <LiveFeed events={displayRawEvents} />

      <StartJourney
        disabled={isRunning}
        isRunning={isRunning}
        onClick={startJourney}
        restarted={isComplete}
      />

      {/* Share trigger button — bottom right, next to Start Journey */}
      {!shareOpen && (
        <button
          onClick={handleOpenShare}
          style={{
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #e8e8e8',
            borderRadius: 20,
            bottom: 18,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            color: '#666',
            cursor: 'pointer',
            display: 'flex',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            gap: 6,
            letterSpacing: '0.06em',
            padding: '8px 18px',
            position: 'absolute',
            right: 100,
            textTransform: 'uppercase',
            zIndex: 35,
          }}
          type="button"
        >
          Share
        </button>
      )}

      {/* Share panel + overlay */}
      {shareOpen && (
        <>
          <ShareOverlay
            ref={overlayRef}
            address={userAddress || 'pump.fun'}
            activeSince="Jan 2025"
            transactionCount={stats.totalTransactions}
            volume={Math.round(stats.totalVolumeSol)}
          />
          <SharePanel
            colors={shareColors}
            onChange={setShareColors}
            onClose={handleCloseShare}
            onDownloadWorld={handleDownloadWorld}
            onDownloadSnapshot={handleDownloadSnapshot}
            onShareX={handleShareX}
            onShareLinkedIn={handleShareLinkedIn}
            downloading={downloading}
          />
        </>
      )}

      {/* Embed widget configurator */}
      {embedOpen && (
        <EmbedConfigurator onClose={() => setEmbedOpen(false)} />
      )}

      {/* Embed button — bottom left, above pause */}
      <button
        onClick={() => setEmbedOpen(true)}
        style={{
          alignItems: 'center',
          background: '#ffffff',
          border: '1px solid #e8e8e8',
          borderRadius: 6,
          bottom: 92,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          color: '#666',
          cursor: 'pointer',
          display: 'flex',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          gap: 4,
          left: 12,
          letterSpacing: '0.06em',
          padding: '4px 12px',
          position: 'absolute',
          textTransform: 'uppercase',
          zIndex: 20,
        }}
      >
        {'</>'}  Embed
      </button>
    </div>
  );
}
