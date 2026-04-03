'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  MergedStats,
  ConnectionState,
  CategoryConfig,
  SourceConfig,
  TopToken,
  TraderEdge,
  RawEvent,
} from '@web3viz/core';

// ============================================================================
// Types
// ============================================================================

export interface UseProvidersOptions {
  /** Provider instances to manage */
  providers: DataProvider[];
  /** Start paused? */
  paused?: boolean;
  /** Max unified events to keep */
  maxEvents?: number;
}

export interface UseProvidersReturn {
  /** Merged stats from all providers */
  stats: MergedStats;
  /** All recent events filtered by enabled categories */
  filteredEvents: DataProviderEvent[];
  /** All recent events unfiltered */
  allEvents: DataProviderEvent[];
  /** Set of enabled category IDs */
  enabledCategories: Set<string>;
  /** Toggle a category on/off */
  toggleCategory: (categoryId: string) => void;
  /** Set of enabled provider IDs */
  enabledProviders: Set<string>;
  /** Toggle a provider on/off */
  toggleProvider: (providerId: string) => void;
  /** All categories from all providers */
  categories: CategoryConfig[];
  /** All source configs from all providers */
  sources: SourceConfig[];
  /** Per-provider connection state */
  connections: Record<string, ConnectionState[]>;
}

// ============================================================================
// Constants
// ============================================================================

const FLUSH_INTERVAL_MS = 100;
const DEFAULT_MAX_EVENTS = 300;

// ============================================================================
// Stats merging helper
// ============================================================================

function mergeProviderStats(
  providers: DataProvider[],
  maxEvents: number,
): MergedStats {
  const bySource: Record<string, DataProviderStats> = {};
  const mergedCounts: Record<string, number> = {};
  const mergedVolume: Record<string, number> = {};
  let totalTransactions = 0;
  let totalAgents = 0;
  const allTopTokens: TopToken[] = [];
  const allTraderEdges: TraderEdge[] = [];
  const allRecentEvents: DataProviderEvent[] = [];
  const allRawEvents: RawEvent[] = [];

  for (const provider of providers) {
    if (!provider.isEnabled()) continue;
    const stats = provider.getStats();
    bySource[provider.id] = stats;

    for (const [key, value] of Object.entries(stats.counts)) {
      mergedCounts[key] = (mergedCounts[key] || 0) + value;
    }

    for (const [chain, vol] of Object.entries(stats.totalVolume)) {
      mergedVolume[chain] = (mergedVolume[chain] || 0) + vol;
    }

    totalTransactions += stats.totalTransactions;
    totalAgents += stats.totalAgents;
    allTopTokens.push(...stats.topTokens);
    allTraderEdges.push(...stats.traderEdges);
    allRecentEvents.push(...stats.recentEvents);
    allRawEvents.push(...stats.rawEvents);
  }

  allTopTokens.sort((a, b) => b.volume - a.volume);
  allRecentEvents.sort((a, b) => b.timestamp - a.timestamp);

  return {
    counts: mergedCounts,
    totalVolume: mergedVolume,
    totalTransactions,
    totalAgents,
    recentEvents: allRecentEvents.slice(0, maxEvents),
    topTokens: allTopTokens.slice(0, 8),
    traderEdges: allTraderEdges,
    rawEvents: allRawEvents,
    bySource,
  };
}

// ============================================================================
// Empty stats constant
// ============================================================================

const EMPTY_STATS: MergedStats = {
  counts: {},
  totalVolume: {},
  totalTransactions: 0,
  totalAgents: 0,
  recentEvents: [],
  topTokens: [],
  traderEdges: [],
  rawEvents: [],
  bySource: {},
};

// ============================================================================
// Hook
// ============================================================================

export function useProviders(options: UseProvidersOptions): UseProvidersReturn {
  const { providers, paused = false, maxEvents = DEFAULT_MAX_EVENTS } = options;

  // Mutable refs for event buffering (avoids re-render loops)
  const eventBufferRef = useRef<DataProviderEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const providersRef = useRef(providers);
  providersRef.current = providers;
  const maxEventsRef = useRef(maxEvents);
  maxEventsRef.current = maxEvents;

  // State
  const [allEvents, setAllEvents] = useState<DataProviderEvent[]>([]);
  const [stats, setStats] = useState<MergedStats>(EMPTY_STATS);
  const [connections, setConnections] = useState<Record<string, ConnectionState[]>>({});

  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(() => {
    const all = new Set<string>();
    for (const p of providers) {
      for (const cat of p.categories) all.add(cat.id);
    }
    return all;
  });

  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(
    () => new Set(providers.map((p) => p.id)),
  );

  // Flush buffered events into state and refresh stats/connections
  const flush = useCallback(() => {
    const buffer = eventBufferRef.current;
    if (buffer.length === 0) return;
    eventBufferRef.current = [];

    setAllEvents((prev) => {
      const merged = [...buffer, ...prev];
      merged.sort((a, b) => b.timestamp - a.timestamp);
      return merged.slice(0, maxEventsRef.current);
    });

    setStats(mergeProviderStats(providersRef.current, maxEventsRef.current));

    const conns: Record<string, ConnectionState[]> = {};
    for (const p of providersRef.current) {
      conns[p.id] = p.getConnections();
    }
    setConnections(conns);
  }, []);

  // Schedule a debounced flush (100ms batching)
  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flush();
    }, FLUSH_INTERVAL_MS);
  }, [flush]);

  // Lifecycle: connect/disconnect and subscribe to events
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    for (const provider of providers) {
      provider.connect();
      const unsub = provider.onEvent((event) => {
        eventBufferRef.current.push(event);
        scheduleFlush();
      });
      unsubscribes.push(unsub);
    }

    // Seed initial stats & connections
    setStats(mergeProviderStats(providers, maxEventsRef.current));
    const conns: Record<string, ConnectionState[]> = {};
    for (const p of providers) {
      conns[p.id] = p.getConnections();
    }
    setConnections(conns);

    return () => {
      for (const unsub of unsubscribes) unsub();
      for (const provider of providers) provider.disconnect();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [providers, scheduleFlush]);

  // Pause/resume
  useEffect(() => {
    for (const provider of providers) {
      provider.setPaused(paused);
    }
  }, [providers, paused]);

  // Toggle category
  const toggleCategory = useCallback((categoryId: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  // Toggle provider
  const toggleProvider = useCallback((providerId: string) => {
    setEnabledProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
        providersRef.current.find((p) => p.id === providerId)?.setEnabled(false);
      } else {
        next.add(providerId);
        providersRef.current.find((p) => p.id === providerId)?.setEnabled(true);
      }
      return next;
    });
  }, []);

  // Collect categories from all providers (deduplicated)
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: CategoryConfig[] = [];
    for (const p of providers) {
      for (const cat of p.categories) {
        const key = `${cat.id}:${cat.sourceId ?? ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(cat);
        }
      }
    }
    return result;
  }, [providers]);

  // Collect source configs from all providers
  const sources = useMemo(
    () => providers.map((p) => p.sourceConfig),
    [providers],
  );

  // Filter events by enabled categories and providers
  const filteredEvents = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          enabledCategories.has(e.category) && enabledProviders.has(e.providerId),
      ),
    [allEvents, enabledCategories, enabledProviders],
  );

  return {
    stats,
    filteredEvents,
    allEvents,
    enabledCategories,
    toggleCategory,
    enabledProviders,
    toggleProvider,
    categories,
    sources,
    connections,
  };
}
