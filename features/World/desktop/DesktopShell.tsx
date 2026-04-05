'use client';

import { memo, Suspense, useCallback, useEffect, useState } from 'react';
import type { DataProvider, ConnectionState, CategoryConfig, SourceConfig } from '@web3viz/core';
import type { CustomProviderFormData } from '../AddCustomProviderForm';
import type { ShareColors } from '../SharePanel';
import type { ForceGraphHandle } from '../ForceGraph';
import type { WindowId } from './desktopTypes';

import { useWindowManager } from './useWindowManager';
import { TASKBAR_HEIGHT } from './desktopConstants';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { StartMenu } from './StartMenu';
import { getAppIcon } from './AppIcons';

/* ------------------------------------------------------------------ */
/*  Lazy-loaded content components (avoid circular deps)              */
/* ------------------------------------------------------------------ */

import ProtocolFilterSidebar from '../ProtocolFilterSidebar';
import LiveFeed from '../LiveFeed';
import StatsBar from '../StatsBar';
import SharePanel from '../SharePanel';
import EmbedConfigurator from '../EmbedConfigurator';
import ProviderPanel from '../ProviderPanel';
import { WorldChat } from '../ai/WorldChat';
import TimelineBar from '../TimelineBar';
import ShareOverlay from '../ShareOverlay';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { ConnectionToasts } from './ConnectionToasts';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface DesktopShellProps {
  /* Provider data */
  providers: DataProvider[];
  enabledProviders: Set<string>;
  enabledCategories: Set<string>;
  connections: Record<string, ConnectionState[]>;
  categories: CategoryConfig[];
  allCategories: CategoryConfig[];
  allSources: SourceConfig[];
  stats: {
    topTokens: any[];
    traderEdges: any[];
    counts: Record<string, number>;
    totalVolume: Record<string, number>;
    totalTransactions: number;
  };
  filteredEvents: any[];
  customProviderIds: Set<string>;

  /* Callbacks */
  onToggleCategory: (id: string) => void;
  onToggleProvider: (id: string) => void;
  onAddCustomProvider: (data: CustomProviderFormData) => void;
  onRemoveCustomProvider: (id: string) => void;
  onAddressSearch: (addr: string) => void;
  onDismissHighlight: () => void;

  /* Share */
  shareColors: ShareColors;
  onShareColorsChange: (c: ShareColors) => void;
  onDownloadWorld: () => void;
  onDownloadSnapshot: () => void;
  onShareX: () => void;
  onShareLinkedIn: () => void;
  downloading: 'world' | 'snapshot' | null;
  shareOverlayRef: React.RefObject<HTMLDivElement>;
  userAddress: string;
  totalVolume: number;

  /* Timeline */
  isPlaying: boolean;
  isLive: boolean;
  timeFilter: number | null;
  timelineTimestamps: number[];
  onTogglePlay: () => void;
  onTimeChange: (ts: number | null) => void;
  onInfoClick: () => void;

  /* Graph */
  graphRef: React.RefObject<ForceGraphHandle | null>;

  /* Chat */
  chatStats: { totalEvents: number; totalVolume: number; connections: number };
  onChatFilterChange: (filters: { protocols?: string[]; timeRange?: string }) => void;

  /* Journey */
  onStartJourney: () => void;
  journeyRunning: boolean;
  journeyComplete: boolean;

  /* UI state */
  hasActiveProvider: boolean;
  highlightedAddress: string | null;
  searchError: boolean;

  /* Demo */
  demoMode: boolean;
  onToggleDemo: () => void;

  /* Onboarding */
  onStartOnboarding?: () => void;

  /* External access to window manager */
  onRegisterOpenWindow?: (fn: (id: WindowId) => void) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export const DesktopShell = memo<DesktopShellProps>((props) => {
  const {
    providers, enabledProviders, enabledCategories, connections,
    categories, allCategories, allSources, stats, filteredEvents,
    customProviderIds,
    onToggleCategory, onToggleProvider, onAddCustomProvider, onRemoveCustomProvider,
    onAddressSearch, onDismissHighlight,
    shareColors, onShareColorsChange, onDownloadWorld, onDownloadSnapshot,
    onShareX, onShareLinkedIn, downloading, shareOverlayRef, userAddress, totalVolume,
    isPlaying, isLive, timeFilter, timelineTimestamps,
    onTogglePlay, onTimeChange, onInfoClick,
    graphRef,
    chatStats, onChatFilterChange,
    onStartJourney, journeyRunning,
    hasActiveProvider, highlightedAddress, searchError,
    demoMode, onToggleDemo,
    onStartOnboarding,
    onRegisterOpenWindow,
  } = props;

  const wm = useWindowManager();
  const [startMenuOpen, setStartMenuOpen] = useState(false);

  // Expose openWindow to parent via callback registration
  useEffect(() => {
    onRegisterOpenWindow?.(wm.openWindow);
  }, [onRegisterOpenWindow, wm.openWindow]);

  const toggleStartMenu = useCallback(() => setStartMenuOpen((p) => !p), []);
  const closeStartMenu = useCallback(() => setStartMenuOpen(false), []);

  // Helper to check if share window is open (for overlay + bg color changes)
  const shareWindowOpen = wm.windows.share.isOpen && !wm.windows.share.isMinimized;

  /* ---------------------------------------------------------------- */
  /*  Render window content by id                                     */
  /* ---------------------------------------------------------------- */

  const renderWindowContent = useCallback((id: WindowId): React.ReactNode => {
    switch (id) {
      case 'filters':
        return (
          <ProtocolFilterSidebar
            categories={allCategories}
            sources={allSources}
            enabledCategories={enabledCategories}
            onToggleCategory={onToggleCategory}
            enabledProviders={enabledProviders}
            onToggleProvider={onToggleProvider}
          />
        );

      case 'livefeed':
        return <LiveFeed events={filteredEvents} categories={categories} />;

      case 'stats':
        return (
          <Suspense fallback={null}>
            <StatsBar
              totalTokens={(stats.counts.launches ?? 0) + (stats.counts.agentLaunches ?? 0)}
              totalVolume={stats.totalVolume ?? {}}
              totalTrades={stats.totalTransactions}
              highlightedAddress={highlightedAddress}
              onAddressSearch={onAddressSearch}
              onDismissHighlight={onDismissHighlight}
              searchError={searchError}
            />
          </Suspense>
        );

      case 'aichat':
        return (
          <WorldChat
            graphRef={graphRef}
            onColorChange={onShareColorsChange}
            onFilterChange={onChatFilterChange}
            stats={chatStats}
          />
        );

      case 'share':
        return (
          <SharePanel
            colors={shareColors}
            onChange={onShareColorsChange}
            onClose={() => wm.closeWindow('share')}
            onDownloadWorld={onDownloadWorld}
            onDownloadSnapshot={onDownloadSnapshot}
            onShareX={onShareX}
            onShareLinkedIn={onShareLinkedIn}
            downloading={downloading}
          />
        );

      case 'embed':
        return (
          <EmbedConfigurator onClose={() => wm.closeWindow('embed')} />
        );

      case 'sources':
        return (
          <ProviderPanel
            open={true}
            onClose={() => wm.closeWindow('sources')}
            providers={providers}
            enabledProviders={enabledProviders}
            onToggleProvider={onToggleProvider}
            connections={connections}
            stats={stats}
            onAddCustomProvider={onAddCustomProvider}
            onRemoveCustomProvider={onRemoveCustomProvider}
            customProviderIds={customProviderIds}
            demoMode={demoMode}
            onToggleDemo={onToggleDemo}
          />
        );

      case 'timeline':
        return (
          <TimelineBar
            eventTimestamps={timelineTimestamps}
            isLive={isLive}
            isPlaying={isPlaying}
            onInfoClick={onInfoClick}
            onTimeChange={onTimeChange}
            onTogglePlay={onTogglePlay}
            timeFilter={timeFilter}
          />
        );

      default:
        return null;
    }
  }, [
    allCategories, allSources, enabledCategories, onToggleCategory,
    enabledProviders, onToggleProvider, filteredEvents, categories,
    stats, highlightedAddress, onAddressSearch, onDismissHighlight, searchError,
    graphRef, onShareColorsChange, onChatFilterChange, chatStats,
    shareColors, onDownloadWorld, onDownloadSnapshot, onShareX, onShareLinkedIn, downloading,
    providers, connections, onAddCustomProvider, onRemoveCustomProvider, customProviderIds,
    timelineTimestamps, isLive, isPlaying, onInfoClick, onTimeChange, onTogglePlay, timeFilter,
    wm, demoMode, onToggleDemo,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Window titles & icons                                           */
  /* ---------------------------------------------------------------- */

  const windowMeta: Record<WindowId, { title: string; iconKey: string }> = {
    filters: { title: 'Filters', iconKey: 'filters' },
    livefeed: { title: 'Live Feed', iconKey: 'livefeed' },
    stats: { title: 'Stats', iconKey: 'stats' },
    aichat: { title: 'AI Chat', iconKey: 'aichat' },
    share: { title: 'Share & Export', iconKey: 'share' },
    embed: { title: 'Embed Widget', iconKey: 'embed' },
    sources: { title: 'Data Sources', iconKey: 'sources' },
    timeline: { title: 'Timeline', iconKey: 'timeline' },
  };

  return (
    <>
      {/* Share overlay — rendered behind windows when share is open */}
      {shareWindowOpen && (
        <ShareOverlay
          ref={shareOverlayRef}
          address={userAddress || 'web3viz'}
          activeSince="Jan 2025"
          transactionCount={stats.totalTransactions}
          volume={Math.round(totalVolume)}
        />
      )}

      {/* Windows */}
      {wm.openWindows.map((w) => {
        const meta = windowMeta[w.id];
        const Icon = getAppIcon(meta.iconKey);
        return (
          <Window
            key={w.id}
            windowId={w.id}
            title={meta.title}
            icon={<Icon />}
            zIndex={w.zIndex}
            position={w.position}
            size={w.size}
            onClose={() => wm.closeWindow(w.id)}
            onMinimize={() => wm.minimizeWindow(w.id)}
            onFocus={() => wm.focusWindow(w.id)}
            onPositionChange={(pos) => wm.updatePosition(w.id, pos)}
          >
            {renderWindowContent(w.id)}
          </Window>
        );
      })}

      {/* Start Menu */}
      <StartMenu
        isOpen={startMenuOpen}
        onClose={closeStartMenu}
        onOpenWindow={wm.openWindow}
        onStartJourney={hasActiveProvider ? onStartJourney : undefined}
        journeyDisabled={journeyRunning}
        onStartOnboarding={onStartOnboarding}
      />

      {/* Taskbar */}
      <Taskbar
        windows={wm.windows}
        onToggleWindow={wm.toggleWindow}
        onToggleStartMenu={toggleStartMenu}
        startMenuOpen={startMenuOpen}
        connections={connections}
        isLive={isLive}
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
      />

      {/* Keyboard shortcuts overlay (press ?) */}
      <KeyboardShortcuts
        onToggleWindow={wm.toggleWindow}
        onTogglePlay={onTogglePlay}
      />

      {/* Connection status toasts */}
      <ConnectionToasts connections={connections} />
    </>
  );
});

DesktopShell.displayName = 'DesktopShell';
