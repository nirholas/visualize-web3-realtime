'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  usePumpFunProvider,
  PUMPFUN_SOURCE,
  PUMPFUN_CATEGORIES,
  useEthereumProvider,
  ETHEREUM_SOURCE,
  ETHEREUM_CATEGORIES,
  useBaseProvider,
  BASE_SOURCE,
  BASE_CATEGORIES,
  useAgentsProvider,
  AGENTS_SOURCE,
  AGENTS_CATEGORIES,
  useERC8004Provider,
  ERC8004_SOURCE,
  ERC8004_CATEGORIES,
  useCEXProvider,
  CEX_SOURCE,
  CEX_CATEGORIES,
  ALL_SOURCES,
} from './providers';
import type { PumpFunEvent } from './usePumpFun';
import type { DataProviderEvent, DataProviderStats, TopToken, TraderEdge, MergedStats } from '@web3viz/core';
import type { CategoryConfig, SourceConfig } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Source system — re-export for backward compat
// ---------------------------------------------------------------------------

export { ALL_SOURCES };

/** All registered source configs */
export const SOURCE_CONFIGS: SourceConfig[] = ALL_SOURCES;

export const SOURCE_CONFIG_MAP = Object.fromEntries(
  SOURCE_CONFIGS.map((s) => [s.id, s]),
) as Record<string, SourceConfig>;

// ---------------------------------------------------------------------------
// Category system — flatten all provider categories
// ---------------------------------------------------------------------------

export const ALL_CATEGORIES: CategoryConfig[] = [
  ...PUMPFUN_CATEGORIES,
  ...ETHEREUM_CATEGORIES,
  ...BASE_CATEGORIES,
  ...AGENTS_CATEGORIES,
  ...ERC8004_CATEGORIES,
  ...CEX_CATEGORIES,
];

// Backward compat: the old PumpFun-specific category IDs
export const CATEGORIES = [
  'launches',
  'agentLaunches',
  'trades',
  'claimsWallet',
  'claimsGithub',
  'claimsFirst',
] as const;

export type PumpFunCategory = (typeof CATEGORIES)[number];

// Re-export the PumpFun categories as CATEGORY_CONFIGS for backward compat
export const CATEGORY_CONFIGS = PUMPFUN_CATEGORIES;

export const CATEGORY_CONFIG_MAP = Object.fromEntries(
  PUMPFUN_CATEGORIES.map((c) => [c.id, c]),
) as Record<PumpFunCategory, CategoryConfig>;

// ---------------------------------------------------------------------------
// Unified event type — re-export from core
// ---------------------------------------------------------------------------

export type { DataProviderEvent, MergedStats };

// ---------------------------------------------------------------------------
// Aggregate stats — backward compatible + multi-source
// ---------------------------------------------------------------------------

export interface MultiSourceStats extends DataProviderStats {
  /** Per-source breakdown */
  bySource: Record<string, DataProviderStats>;
  /** Raw PumpFun events for LiveFeed backward compat */
  rawPumpFunEvents: PumpFunEvent[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const MAX_UNIFIED_EVENTS = 500;

export function useDataProvider({ paused = false }: { paused?: boolean } = {}) {
  // --- All data source hooks ---
  const pumpfun = usePumpFunProvider({ paused });
  const ethereum = useEthereumProvider({ paused });
  const base = useBaseProvider({ paused });
  const agents = useAgentsProvider({ paused });
  const erc8004 = useERC8004Provider({ paused });
  const cex = useCEXProvider({ paused });

  // --- Source visibility (all enabled by default) ---
  const [enabledSources, setEnabledSources] = useState<Set<string>>(
    () => new Set(ALL_SOURCES.map((s) => s.id)),
  );

  const toggleSource = useCallback((sourceId: string) => {
    setEnabledSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  }, []);

  // --- Category visibility (backward compat) ---
  const [enabledCategories, setEnabledCategories] = useState<Set<PumpFunCategory>>(
    () => new Set(CATEGORIES),
  );

  const toggleCategory = useCallback((cat: PumpFunCategory) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  // --- Merge all provider stats ---
  const stats = useMemo<MultiSourceStats>(() => {
    const allProviderStats: { id: string; stats: DataProviderStats }[] = [
      { id: 'pumpfun', stats: pumpfun.stats },
      { id: 'ethereum', stats: ethereum.stats },
      { id: 'base', stats: base.stats },
      { id: 'agents', stats: agents.stats },
      { id: 'erc8004', stats: erc8004.stats },
      { id: 'cex', stats: cex.stats },
    ];

    // Only include enabled sources
    const enabledProviders = allProviderStats.filter((p) => enabledSources.has(p.id));

    // Merge events from all enabled sources
    const allEvents: DataProviderEvent[] = enabledProviders
      .flatMap((p) => p.stats.recentEvents)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_UNIFIED_EVENTS);

    // Merge counts
    const counts: Record<string, number> = {};
    for (const p of enabledProviders) {
      for (const [cat, count] of Object.entries(p.stats.counts)) {
        const key = `${p.id}:${cat}`;
        counts[key] = (counts[key] || 0) + count;
        // Also keep bare category for backward compat
        counts[cat] = (counts[cat] || 0) + count;
      }
    }

    // Merge topTokens & traderEdges from all enabled sources
    const topTokens: TopToken[] = enabledProviders
      .flatMap((p) => p.stats.topTokens)
      .sort((a, b) => b.volumeSol - a.volumeSol)
      .slice(0, 20); // Allow more hubs with multiple sources

    const traderEdges: TraderEdge[] = enabledProviders
      .flatMap((p) => p.stats.traderEdges)
      .slice(0, 8000);

    const totalVolumeSol = enabledProviders.reduce((sum, p) => sum + p.stats.totalVolumeSol, 0);
    const totalTransactions = enabledProviders.reduce((sum, p) => sum + p.stats.totalTransactions, 0);
    const totalAgents = enabledProviders.reduce((sum, p) => sum + p.stats.totalAgents, 0);

    // Per-source breakdown
    const bySource: Record<string, DataProviderStats> = {};
    for (const p of allProviderStats) {
      bySource[p.id] = p.stats;
    }

    return {
      counts,
      totalVolumeSol,
      totalTransactions,
      totalAgents,
      recentEvents: allEvents,
      topTokens,
      traderEdges,
      rawEvents: [],
      bySource,
      rawPumpFunEvents: pumpfun.rawPumpFunEvents,
    };
  }, [pumpfun, ethereum, base, agents, erc8004, cex, enabledSources]);

  // --- Filtered events ---
  const filteredEvents = useMemo(
    () => stats.recentEvents.filter((e) => enabledSources.has(e.source)),
    [stats.recentEvents, enabledSources],
  );

  // --- Connection status ---
  const connected = useMemo(() => ({
    pumpFun: pumpfun.connected.pumpFun,
    claims: pumpfun.connected.claims,
    ethereum: ethereum.connected,
    base: base.connected,
    agents: agents.connected,
    erc8004: erc8004.connected,
    cex: cex.connected,
  }), [pumpfun.connected, ethereum.connected, base.connected, agents.connected, erc8004.connected, cex.connected]);

  return {
    stats,
    filteredEvents,
    enabledSources,
    toggleSource,
    enabledCategories,
    toggleCategory,
    connected,
  };
}
