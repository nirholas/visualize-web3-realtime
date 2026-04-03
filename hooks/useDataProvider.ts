'use client';

/**
 * @deprecated Use useProviders() from @web3viz/providers with DataProvider instances instead.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAllProviders,
  type DataProvider,
  type DataProviderEvent,
  type DataProviderStats,
  type TopToken,
  type TraderEdge,
  type CategoryConfig,
  type RawEvent,
} from '@web3viz/core';

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

const MAX_UNIFIED_EVENTS = 500;

function mergeStats(providers: DataProvider[]): DataProviderStats {
  const counts: Record<string, number> = {};
  const totalVolume: Record<string, number> = {};
  let totalTransactions = 0;
  let totalAgents = 0;
  const allEvents: DataProviderEvent[] = [];
  const allTopTokens: TopToken[] = [];
  const allTraderEdges: TraderEdge[] = [];
  const allRawEvents: RawEvent[] = [];

  for (const provider of providers) {
    const stats = provider.getStats();

    // Merge counts
    for (const [key, val] of Object.entries(stats.counts)) {
      counts[key] = (counts[key] || 0) + val;
    }

    // Merge volumes per chain
    for (const [chain, vol] of Object.entries(stats.totalVolume ?? {})) {
      totalVolume[chain] = (totalVolume[chain] || 0) + vol;
    }

    totalTransactions += stats.totalTransactions;
    totalAgents += stats.totalAgents;
    allEvents.push(...stats.recentEvents);
    allTopTokens.push(...stats.topTokens);
    allTraderEdges.push(...stats.traderEdges);
    allRawEvents.push(...stats.rawEvents);
  }

  // Sort events newest first, cap
  allEvents.sort((a, b) => b.timestamp - a.timestamp);
  allEvents.length = Math.min(allEvents.length, MAX_UNIFIED_EVENTS);

  // Sort top tokens by volume descending, take top 12
  allTopTokens.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
  allTopTokens.length = Math.min(allTopTokens.length, 12);

  return {
    counts,
    totalVolume,
    totalTransactions,
    totalAgents,
    recentEvents: allEvents,
    topTokens: allTopTokens,
    traderEdges: allTraderEdges,
    rawEvents: allRawEvents,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDataProvider({ paused = false }: { paused?: boolean } = {}) {
  const [stats, setStats] = useState<DataProviderStats>({
    counts: {},
    totalVolume: {},
    totalTransactions: 0,
    totalAgents: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
    rawEvents: [],
  });

  // Track registered providers
  const [providers, setProviders] = useState<DataProvider[]>([]);
  const providersRef = useRef<DataProvider[]>([]);

  // Collect all categories from registered providers
  const allCategories = useMemo<CategoryConfig[]>(() => {
    const seen = new Set<string>();
    const result: CategoryConfig[] = [];
    for (const p of providers) {
      for (const cat of p.categories) {
        if (!seen.has(cat.id)) {
          seen.add(cat.id);
          result.push(cat);
        }
      }
    }
    return result;
  }, [providers]);

  // Category visibility (all enabled by default)
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(() => new Set());

  // When categories change, enable new ones by default
  useEffect(() => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      for (const cat of allCategories) {
        // Only add if we haven't seen it before (don't re-enable user-disabled ones)
        if (!next.has(cat.id) && !prev.has(cat.id)) {
          next.add(cat.id);
        }
      }
      // On first load, enable all
      if (prev.size === 0 && allCategories.length > 0) {
        return new Set(allCategories.map((c) => c.id));
      }
      return next;
    });
  }, [allCategories]);

  const toggleCategory = useCallback((catId: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  // Poll for providers and connect/disconnect
  useEffect(() => {
    const check = () => {
      const current = getAllProviders();
      if (current.length !== providersRef.current.length) {
        providersRef.current = current;
        setProviders(current);
      }
    };
    check();
    // Poll every 2s for newly registered providers
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  // Connect all providers, set paused state
  useEffect(() => {
    for (const p of providers) {
      p.setPaused(paused);
      p.connect();
    }
    return () => {
      for (const p of providers) {
        p.disconnect();
      }
    };
  }, [providers, paused]);

  // Subscribe to events and rebuild stats
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    for (const p of providers) {
      const unsub = p.onEvent(() => {
        // Rebuild merged stats on any event
        setStats(mergeStats(providersRef.current));
      });
      unsubs.push(unsub);
    }

    // Initial stats
    if (providers.length > 0) {
      setStats(mergeStats(providers));
    }

    return () => unsubs.forEach((u) => u());
  }, [providers]);

  // Connection states
  const connections = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const p of providers) {
      for (const conn of p.getConnections()) {
        result[conn.name] = conn.connected;
      }
    }
    return result;
  }, [providers, stats]); // re-derive when stats change (proxy for connection changes)

  // Filtered events
  const filteredEvents = useMemo(
    () => stats.recentEvents.filter((e) => enabledCategories.has(e.category)),
    [stats.recentEvents, enabledCategories],
  );

  // Build category config map for consumers
  const categoryConfigMap = useMemo(() => {
    return Object.fromEntries(allCategories.map((c) => [c.id, c])) as Record<string, CategoryConfig>;
  }, [allCategories]);

  return {
    stats,
    filteredEvents,
    enabledCategories,
    toggleCategory,
    connections,
    allCategories,
    categoryConfigMap,
    providers,
  };
}
