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
  /** Start with all providers enabled? Default true for backward compat. */
  startEnabled?: boolean;
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
  /** Categories from enabled providers */
  categories: CategoryConfig[];
  /** Source configs from enabled providers */
  sources: SourceConfig[];
  /** All categories from all providers (always available for UI) */
  allCategories: CategoryConfig[];
  /** All source configs from all providers (always available for UI) */
  allSources: SourceConfig[];
  /** Per-provider connection state */
  connections: Record<string, ConnectionState[]>;
}

// ============================================================================
// Constants
// ============================================================================

const FLUSH_INTERVAL_MS = 100;
const DEFAULT_MAX_EVENTS = 300;

// ============================================================================
// Hook
// ============================================================================

export function useProviders(options: UseProvidersOptions): UseProvidersReturn {
  const { providers, paused = false, maxEvents = DEFAULT_MAX_EVENTS, startEnabled = true } = options;

  // Mutable refs for event buffering (avoids re-render loops)
  const eventBufferRef = useRef<DataProviderEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const providersRef = useRef(providers);
  providersRef.current = providers;
  const maxEventsRef = useRef(maxEvents);
  maxEventsRef.current = maxEvents;

  // State
  const [allEvents, setAllEvents] = useState<DataProviderEvent[]>([]);
  const [eventFlushCount, setEventFlushCount] = useState(0);

  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(() => {
    if (!startEnabled) return new Set<string>();
    const all = new Set<string>();
    for (const p of providers) {
      for (const cat of p.categories) all.add(cat.id);
    }
    return all;
  });

  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(
    () => startEnabled ? new Set(providers.map((p) => p.id)) : new Set<string>(),
  );

  // Flush buffered events into state
  const flush = useCallback(() => {
    const buffer = eventBufferRef.current;
    if (buffer.length === 0) return;
    eventBufferRef.current = [];

    setAllEvents((prev) => {
      const merged = [...buffer, ...prev];
      merged.sort((a, b) => b.timestamp - a.timestamp);
      return merged.slice(0, maxEventsRef.current);
    });

    // Trigger stats re-derivation
    setEventFlushCount((c) => c + 1);
  }, []);

  // Schedule a debounced flush (100ms batching)
  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flush();
    }, FLUSH_INTERVAL_MS);
  }, [flush]);

  // Track which providers are currently connected
  const connectedRef = useRef<Set<string>>(new Set());
  const unsubMapRef = useRef<Map<string, () => void>>(new Map());

  // Connect/disconnect providers based on enabledProviders
  useEffect(() => {
    for (const provider of providers) {
      const isEnabled = enabledProviders.has(provider.id);
      const isConnected = connectedRef.current.has(provider.id);

      if (isEnabled && !isConnected) {
        provider.connect();
        connectedRef.current.add(provider.id);
        const unsub = provider.onEvent((event) => {
          eventBufferRef.current.push(event);
          scheduleFlush();
        });
        unsubMapRef.current.set(provider.id, unsub);
      } else if (!isEnabled && isConnected) {
        unsubMapRef.current.get(provider.id)?.();
        unsubMapRef.current.delete(provider.id);
        provider.disconnect();
        connectedRef.current.delete(provider.id);
      }
    }
  }, [providers, enabledProviders, scheduleFlush]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const unsub of unsubMapRef.current.values()) unsub();
      unsubMapRef.current.clear();
      for (const provider of providersRef.current) provider.disconnect();
      connectedRef.current.clear();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, []);

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

  // Toggle provider — also enable its categories when turning on
  const toggleProvider = useCallback((providerId: string) => {
    setEnabledProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
        providersRef.current.find((p) => p.id === providerId)?.setEnabled(false);
      } else {
        next.add(providerId);
        const provider = providersRef.current.find((p) => p.id === providerId);
        provider?.setEnabled(true);
        // Auto-enable this provider's categories
        if (provider) {
          setEnabledCategories((prevCats) => {
            const nextCats = new Set(prevCats);
            for (const cat of provider.categories) nextCats.add(cat.id);
            return nextCats;
          });
        }
      }
      return next;
    });
  }, []);

  // Collect categories from all enabled providers (deduplicated)
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: CategoryConfig[] = [];
    for (const p of providers) {
      if (enabledProviders.has(p.id)) {
        for (const cat of p.categories) {
          const key = `${cat.id}:${cat.sourceId ?? ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push(cat);
          }
        }
      }
    }
    return result;
  }, [providers, enabledProviders]);

  // Collect source configs from enabled providers
  const sources = useMemo(
    () => providers.filter((p) => enabledProviders.has(p.id)).map((p) => p.sourceConfig),
    [providers, enabledProviders],
  );

  // All categories and sources (always available for UI display)
  const allCategories = useMemo(() => {
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

  const allSources = useMemo(
    () => providers.map((p) => p.sourceConfig),
    [providers],
  );

  // Derive merged stats from enabled providers
  const stats = useMemo<MergedStats>(() => {
    const bySource: Record<string, DataProviderStats> = {};
    const mergedCounts: Record<string, number> = {};
    let totalVolumeSol = 0;
    const totalVolume: Record<string, number> = {};
    let totalTransactions = 0;
    let totalAgents = 0;
    const allTopTokens: TopToken[] = [];
    const allTraderEdges: TraderEdge[] = [];
    const allRawEvents = [];

    for (const provider of providers) {
      if (!enabledProviders.has(provider.id)) continue;
      const providerStats = provider.getStats();
      bySource[provider.id] = providerStats;

      for (const [key, value] of Object.entries(providerStats.counts || {})) {
        mergedCounts[key] = (mergedCounts[key] || 0) + value;
      }

      totalVolumeSol += providerStats.totalVolumeSol ?? 0;

      // Merge per-chain volume map; fall back to totalVolumeSol under the provider id
      if (providerStats.totalVolume && Object.keys(providerStats.totalVolume).length > 0) {
        for (const [chain, vol] of Object.entries(providerStats.totalVolume)) {
          totalVolume[chain] = (totalVolume[chain] || 0) + vol;
        }
      } else if (providerStats.totalVolumeSol) {
        totalVolume[provider.id] = (totalVolume[provider.id] || 0) + providerStats.totalVolumeSol;
      }

      totalTransactions += providerStats.totalTransactions;
      totalAgents += providerStats.totalAgents;
      allTopTokens.push(...(providerStats.topTokens || []));
      allTraderEdges.push(...(providerStats.traderEdges || []));
      allRawEvents.push(...(providerStats.rawEvents || []));
    }

    // Sort and trim top tokens
    allTopTokens.sort((a, b) => b.volumeSol - a.volumeSol);

    return {
      counts: mergedCounts,
      totalVolumeSol,
      totalVolume,
      totalTransactions,
      totalAgents,
      recentEvents: allEvents,
      topTokens: allTopTokens.slice(0, 8),
      traderEdges: allTraderEdges,
      rawEvents: allRawEvents,
      bySource,
    };
  }, [providers, enabledProviders, allEvents, eventFlushCount]);

  // Filter events by enabled categories and providers
  const filteredEvents = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          enabledCategories.has(e.category) &&
          enabledProviders.has(e.providerId ?? e.source ?? ''),
      ),
    [allEvents, enabledCategories, enabledProviders],
  );

  // Derive connections from enabled providers
  const connections = useMemo(() => {
    const conns: Record<string, ConnectionState[]> = {};
    for (const p of providers) {
      if (enabledProviders.has(p.id)) {
        conns[p.id] = p.getConnections();
      }
    }
    return conns;
  }, [providers, enabledProviders, eventFlushCount]);

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
    allCategories,
    allSources,
    connections,
  };
}
