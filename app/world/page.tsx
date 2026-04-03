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
import { useProviders } from '@web3viz/providers';
import { providers } from './providers';
import LiveFeed from '@/features/World/LiveFeed';
import TimelineBar from '@/features/World/TimelineBar';
import StartJourney from '@/features/World/StartJourney';
import StatsBar from '@/features/World/StatsBar';
import { useJourney } from '@/features/World/useJourney';
import EmbedConfigurator from '@/features/World/EmbedConfigurator';
import { timestampedFilename } from '@/features/World/utils/screenshot';
import { buildShareUrl, buildShareText, parseShareParams, shareOnX, shareOnLinkedIn } from '@/features/World/utils/shareUrl';
import type { ForceGraphHandle } from '@/features/World/ForceGraph';
import { WorldChat } from '@/features/World/ai/WorldChat';

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

// Compute total volume across all chains
function getTotalVolume(volumeMap: Record<string, number>): number {
  return Object.values(volumeMap).reduce((sum, v) => sum + v, 0);
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
// Welcome overlay — shown when no providers are active
// ---------------------------------------------------------------------------

const WelcomeOverlay = memo<{ visible: boolean }>(({ visible }) => (
  <div
    style={{
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      left: '50%',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'auto' : 'none',
      position: 'absolute',
      top: '42%',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity 600ms ease',
      zIndex: 30,
    }}
  >
    <span
      style={{
        color: '#161616',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 16,
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      Web3 Realtime
    </span>
    <span
      style={{
        color: '#555',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        letterSpacing: '0.04em',
        maxWidth: 320,
        textAlign: 'center',
      }}
    >
      Enable a data source from the sidebar to begin visualizing live blockchain activity.
    </span>
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        gap: 6,
        marginTop: 4,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.4 }}>
        <path d="M10 3L5 8L10 13" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span
        style={{
          color: '#666',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        toggle providers
      </span>
    </div>
  </div>
));
WelcomeOverlay.displayName = 'WelcomeOverlay';

// ---------------------------------------------------------------------------
// Fade wrapper — generic opacity transition container
// ---------------------------------------------------------------------------

const FadeIn = memo<{ visible: boolean; children: React.ReactNode; zIndex?: number }>(
  ({ visible, children, zIndex }) => (
    <div
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 400ms ease',
        ...(zIndex != null ? { position: 'relative' as const, zIndex } : {}),
      }}
    >
      {children}
    </div>
  ),
);
FadeIn.displayName = 'FadeIn';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorldPage() {
  const [isPlaying, setIsPlaying] = useState(false);
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

  const {
    stats, filteredEvents, allEvents, enabledCategories, toggleCategory,
    enabledProviders, toggleProvider: rawToggleProvider, categories, sources, connections,
    allCategories, allSources
  } = useProviders({ providers, paused: !isPlaying, startEnabled: false });

  // Auto-play when first provider is enabled
  const toggleProvider = useCallback((providerId: string) => {
    rawToggleProvider(providerId);
    // If enabling (not currently enabled), start playing
    if (!enabledProviders.has(providerId)) {
      setIsPlaying(true);
    }
  }, [rawToggleProvider, enabledProviders]);

  const hasActiveProvider = enabledProviders.size > 0;

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
    for (const evt of allEvents) {
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
  }, [allEvents]);

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
  const displayFilteredEvents = useMemo(() => {
    if (timeFilter === null) return filteredEvents;
    return filteredEvents.filter((e) => e.timestamp <= timeFilter);
  }, [filteredEvents, timeFilter]);

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

  // Read ?protocols= and ?agents= params on mount to restore filter and agent toggle
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proto = params.get('protocols');
    if (proto) {
      setActiveHubMint(proto);
    }
    const agentsParam = params.get('agents');
    if (agentsParam === 'true') {
      // toggleProvider only when agents should be enabled
      if (!enabledProviders.has('agents')) {
        toggleProvider('agents');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    const match = allEvents.find(
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
    const enabledConfigs = categories.filter((c) => enabledCategories.has(c.id));
    const categoryIdx = enabledConfigs.findIndex((c) => c.id === match.category);
    const hubIndex = categoryIdx >= 0 ? categoryIdx : 0;
    setHighlightedHubIndex(hubIndex);
    graphRef.current?.focusHub(hubIndex, 500);
  }, [allEvents, enabledCategories, categories]);

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

  // --- Download World (raw WebGL canvas) ---
  const handleDownloadWorld = useCallback(() => {
    const dataURL = graphRef.current?.takeSnapshot();
    if (!dataURL) return;
    const link = document.createElement('a');
    link.download = timestampedFilename('pumpfun-world');
    link.href = dataURL;
    link.click();
  }, []);

  // --- Download Snapshot (WebGL canvas capture) ---
  const handleDownloadSnapshot = useCallback(() => {
    const dataURL = graphRef.current?.takeSnapshot();
    if (!dataURL) return;
    const link = document.createElement('a');
    link.download = timestampedFilename('pumpfun-snapshot');
    link.href = dataURL;
    link.click();
  }, []);

  // --- Share on X ---
  const totalVolume = getTotalVolume(stats.totalVolume ?? {});
  const handleShareX = useCallback(() => {
    const url = buildShareUrl(shareColors, userAddress || undefined);
    const text = buildShareText(
      {
        tokens: (stats.counts.launches ?? 0) + (stats.counts.agentLaunches ?? 0),
        volume: Math.round(totalVolume),
        transactions: stats.totalTransactions,
      },
      url,
    );
    shareOnX(text, url);
  }, [shareColors, userAddress, stats, totalVolume]);

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

  // Get first two connection entries for display
  const connectionEntries = useMemo(() => Object.entries(connections), [connections]);

  // --- AI Chat handlers ---
  const handleChatFilterChange = useCallback((filters: { protocols?: string[]; timeRange?: string }) => {
    if (filters.protocols && filters.protocols.length > 0) {
      setActiveHubMint(filters.protocols[0]);
    }
  }, []);

  const chatStats = useMemo(() => ({
    totalEvents: stats.totalTransactions,
    totalVolume: Math.round(totalVolume),
    connections: connectionEntries.length,
  }), [stats.totalTransactions, totalVolume, connectionEntries.length]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#ffffff' }}>
      {/* Loading screen — only show when a provider is enabled */}
      {hasActiveProvider && <LoadingScreen ready={canvasReady} />}

      {/* Welcome overlay — visible until a provider is enabled */}
      <WelcomeOverlay visible={!hasActiveProvider} />

      {/* Timeline scrubber — top bar (fade in when active) */}
      <div
        style={{
          opacity: hasActiveProvider ? 1 : 0,
          pointerEvents: hasActiveProvider ? 'auto' : 'none',
          transition: 'opacity 500ms ease',
        }}
      >
        <TimelineBar
          eventTimestamps={timelineTimestamps}
          isLive={isLive}
          isPlaying={isPlaying}
          onInfoClick={() => setInfoOpen((prev) => !prev)}
          onTimeChange={handleTimeChange}
          onTogglePlay={handleTogglePlay}
          timeFilter={timeFilter}
        />
      </div>

      {/* 3D Force Graph — full screen, offset for timeline bar */}
      <div style={{ position: 'absolute', top: hasActiveProvider ? 48 : 0, left: 0, right: 0, bottom: 0, transition: 'top 500ms ease' }}>
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
          idle={!hasActiveProvider}
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

      {/* Header — always visible */}
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 8,
          left: '50%',
          position: 'absolute',
          top: hasActiveProvider ? 60 : 16,
          transform: 'translateX(-50%)',
          transition: 'top 500ms ease',
          zIndex: 40,
        }}
      >
        <span
          style={{
            color: '#444',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Web3 Realtime
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

      {/* Connection status — top left (only when active) */}
      {hasActiveProvider && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 12,
            zIndex: 20,
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            flexWrap: 'wrap',
            opacity: hasActiveProvider ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          {Object.entries(connections).map(([providerId, conns]) =>
            conns.map(conn => (
              <ConnectionDot key={`${providerId}-${conn.name}`} connected={conn.connected} label={providerId.toUpperCase().slice(0, 2)} />
            ))
          )}
        </div>
      )}

      {/* Category filter sidebar — left */}
      <ProtocolFilterSidebar
        categories={allCategories}
        sources={allSources}
        enabledCategories={enabledCategories}
        onToggleCategory={toggleCategory}
        enabledProviders={enabledProviders}
        onToggleProvider={toggleProvider}
      />

      {/* Bottom stats bar (fade in when active) */}
      {hasActiveProvider && (
        <Suspense fallback={null}>
          <StatsBar
            totalTokens={(stats.counts.launches ?? 0) + (stats.counts.agentLaunches ?? 0)}
            totalVolumeSol={Math.round(totalVolume)}
            totalTrades={stats.totalTransactions}
            highlightedAddress={highlightedAddress}
            onAddressSearch={handleAddressSearch}
            onDismissHighlight={handleDismissHighlight}
            searchError={searchError}
          />
        </Suspense>
      )}

      {/* Live trade feed — bottom right (fade in when active) */}
      {hasActiveProvider && (
        <LiveFeed events={displayFilteredEvents} categories={categories} />
      )}

      {hasActiveProvider && (
        <StartJourney
          disabled={isRunning}
          isRunning={isRunning}
          onClick={startJourney}
          restarted={isComplete}
        />
      )}

      {/* Share trigger button — bottom right, next to Start Journey */}
      {hasActiveProvider && !shareOpen && (
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
            volume={Math.round(totalVolume)}
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

      {/* AI Chat interface — bottom left */}
      {hasActiveProvider && (
        <WorldChat
          graphRef={graphRef}
          onColorChange={setShareColors}
          onFilterChange={handleChatFilterChange}
          stats={chatStats}
        />
      )}

      {/* Embed button — bottom left, above pause */}
      {hasActiveProvider && (
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
      )}
    </div>
  );
}
