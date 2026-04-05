'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import InfoPopover from '@/features/World/InfoPopover';
import JourneyOverlay from '@/features/World/JourneyOverlay';
import { type ShareColors } from '@/features/World/SharePanel';
import { useProviders, CustomStreamProvider } from '@web3viz/providers';
import type { DataProvider } from '@web3viz/core';
import { providers as builtInProviders } from './providers';
import type { CustomProviderFormData } from '@/features/World/AddCustomProviderForm';
import { useJourney } from '@/features/World/useJourney';
import { captureCanvas, captureSnapshot, downloadBlob, timestampedFilename } from '@/features/World/utils/screenshot';
import { buildShareUrl, buildShareText, parseShareParams, shareOnX, shareOnLinkedIn } from '@/features/World/utils/shareUrl';
import type { ForceGraphHandle } from '@/features/World/ForceGraph';
import { DarkModeProvider } from '@/features/World/DarkModeContext';
import { DesktopShell, TASKBAR_HEIGHT } from '@/features/World/desktop';

// Lazy-load the 3D force graph to avoid SSR issues with Three.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph = dynamic(() => import('@/features/World/ForceGraph'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#0a0a12' }} />,
}) as any;

// Compute total volume across all chains
function getTotalVolume(volumeMap: Record<string, number>): number {
  return Object.values(volumeMap).reduce((sum, v) => sum + v, 0);
}

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
        color: '#e2e8f0',
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
        color: '#94a3b8',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        letterSpacing: '0.04em',
        maxWidth: 320,
        textAlign: 'center',
      }}
    >
      Open the start menu or click an app in the taskbar to begin visualizing live blockchain activity.
    </span>
  </div>
));
WelcomeOverlay.displayName = 'WelcomeOverlay';

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
  const [shareColors, setShareColors] = useState<ShareColors>({
    background: '#ffffff',
    protocol: '#1a1a1a',
    user: '#1a1a1a',
  });
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const graphRef = useRef<ForceGraphHandle>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<'world' | 'snapshot' | null>(null);

  // Custom providers added by the user at runtime
  const [customProviders, setCustomProviders] = useState<DataProvider[]>([]);
  const customProviderIds = useMemo(() => new Set(customProviders.map((p) => p.id)), [customProviders]);

  const providers = useMemo(
    () => [...builtInProviders, ...customProviders],
    [customProviders],
  );

  // We need a ref to toggleProvider since it's defined after this callback
  const toggleProviderRef = useRef<(id: string) => void>(() => {});

  const handleAddCustomProvider = useCallback((data: CustomProviderFormData) => {
    const id = `custom_${data.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const provider = new CustomStreamProvider({
      id,
      name: data.name,
      url: data.url,
      streamType: data.streamType,
      jsonPath: data.jsonPath || undefined,
      fieldMap: data.fieldMap,
    });
    setCustomProviders((prev) => [...prev, provider]);
    // Auto-enable after a tick so the provider is in the array when toggle fires
    setTimeout(() => toggleProviderRef.current(id), 0);
  }, []);

  const handleRemoveCustomProvider = useCallback((id: string) => {
    setCustomProviders((prev) => {
      const provider = prev.find((p) => p.id === id);
      if (provider) provider.disconnect();
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const {
    stats, filteredEvents, allEvents, enabledCategories, toggleCategory,
    enabledProviders, toggleProvider: rawToggleProvider, categories, sources, connections,
    allCategories, allSources
  } = useProviders({ providers, paused: !isPlaying, startEnabled: false });

  // Auto-play when first provider is enabled + sync agents toggle to URL
  const toggleProvider = useCallback((providerId: string) => {
    rawToggleProvider(providerId);
    // If enabling (not currently enabled), start playing
    if (!enabledProviders.has(providerId)) {
      setIsPlaying(true);
    }
    // Sync ?agents= URL param
    if (providerId === 'agents') {
      const url = new URL(window.location.href);
      const willEnable = !enabledProviders.has('agents');
      if (willEnable) {
        url.searchParams.set('agents', 'true');
      } else {
        url.searchParams.delete('agents');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [rawToggleProvider, enabledProviders]);

  // Keep ref in sync for use in handleAddCustomProvider's setTimeout
  toggleProviderRef.current = toggleProvider;

  const hasActiveProvider = enabledProviders.size > 0;

  // Mark canvas ready shortly after mount – don't gate on WebSocket data
  // arriving, as external services may be slow or unavailable.
  useEffect(() => {
    const timer = setTimeout(() => setCanvasReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

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
    const visibleAddresses = new Set(displayTopTokens.map((t) => t.tokenAddress));
    return stats.traderEdges.filter((e) => visibleAddresses.has(e.tokenAddress));
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
      if (!enabledProviders.has('agents')) {
        toggleProvider('agents');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Search for an address in recent events and highlight the corresponding hub
  const handleAddressSearch = useCallback((address: string) => {
    setUserAddress(address);

    const agentHub = graphRef.current?.findAgentHub(address);
    if (agentHub) {
      setSearchToast(null);
      setHighlightedAddress(address);
      graphRef.current?.focusAgent(address, 800);
      return;
    }

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

    const enabledConfigs = categories.filter((c) => enabledCategories.has(c.id));
    const categoryIdx = enabledConfigs.findIndex((c) => c.id === match.category);
    const hubIndex = categoryIdx >= 0 ? categoryIdx : 0;
    setHighlightedHubIndex(hubIndex);
    graphRef.current?.focusHub(hubIndex, 500);
  }, [allEvents, enabledCategories, categories]);

  const handleDismissHighlight = useCallback(() => {
    setHighlightedAddress(null);
    setHighlightedHubIndex(null);
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
      const t = setTimeout(() => handleAddressSearch(addr), 2000);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Download World (raw WebGL canvas) ---
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

  // --- Download Snapshot (WebGL canvas + overlay composite) ---
  const handleDownloadSnapshot = useCallback(async () => {
    const canvas = graphRef.current?.getCanvasElement();
    const overlay = overlayRef.current;
    if (!canvas) return;
    setDownloading('snapshot');
    try {
      if (overlay) {
        const blob = await captureSnapshot(canvas, overlay);
        downloadBlob(blob, timestampedFilename('pumpfun-snapshot'));
      } else {
        const blob = await captureCanvas(canvas);
        downloadBlob(blob, timestampedFilename('pumpfun-snapshot'));
      }
    } finally {
      setDownloading(null);
    }
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

  const effectiveBg = '#0a0a12';
  const isDark = true;

  return (
    <DarkModeProvider background={effectiveBg}>
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0a12' }}>
      {/* Loading screen — always mount so webgl-ready fires and boot loader dismisses */}
      <LoadingScreen ready={canvasReady || !hasActiveProvider} />

      {/* Welcome overlay — visible until a provider is enabled */}
      <WelcomeOverlay visible={!hasActiveProvider} />

      {/* 3D Force Graph — full screen, leave space for taskbar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: TASKBAR_HEIGHT + 16,
        transition: 'bottom 500ms ease',
      }}>
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
          shareColors={undefined}
          isDark={isDark}
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
            bottom: TASKBAR_HEIGHT + 30,
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

      {/* Info popover (standalone, not in desktop shell) */}
      <InfoPopover
        anchorRef={infoButtonRef}
        id="world-info-popover"
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
      />

      {/* Desktop Shell — Taskbar, Start Menu, Windows */}
      <DesktopShell
        providers={providers}
        enabledProviders={enabledProviders}
        enabledCategories={enabledCategories}
        connections={connections}
        categories={categories}
        allCategories={allCategories}
        allSources={allSources}
        stats={stats}
        filteredEvents={displayFilteredEvents}
        customProviderIds={customProviderIds}
        onToggleCategory={toggleCategory}
        onToggleProvider={toggleProvider}
        onAddCustomProvider={handleAddCustomProvider}
        onRemoveCustomProvider={handleRemoveCustomProvider}
        onAddressSearch={handleAddressSearch}
        onDismissHighlight={handleDismissHighlight}
        shareColors={shareColors}
        onShareColorsChange={setShareColors}
        onDownloadWorld={handleDownloadWorld}
        onDownloadSnapshot={handleDownloadSnapshot}
        onShareX={handleShareX}
        onShareLinkedIn={handleShareLinkedIn}
        downloading={downloading}
        shareOverlayRef={overlayRef}
        userAddress={userAddress}
        totalVolume={totalVolume}
        isPlaying={isPlaying}
        isLive={isLive}
        timeFilter={timeFilter}
        timelineTimestamps={timelineTimestamps}
        onTogglePlay={handleTogglePlay}
        onTimeChange={handleTimeChange}
        onInfoClick={() => setInfoOpen((prev) => !prev)}
        graphRef={graphRef}
        chatStats={chatStats}
        onChatFilterChange={handleChatFilterChange}
        onStartJourney={startJourney}
        journeyRunning={isRunning}
        journeyComplete={isComplete}
        hasActiveProvider={hasActiveProvider}
        highlightedAddress={highlightedAddress}
        searchError={searchError}
      />
    </div>
    </DarkModeProvider>
  );
}
