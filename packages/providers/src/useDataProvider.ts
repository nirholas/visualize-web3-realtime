'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  Token,
  Trade,
  Claim,
  TopToken,
  TraderEdge,
  RawEvent,
  DataProviderStats,
} from '@web3viz/core';
import { CATEGORIES, type CategoryId } from '@web3viz/core';

import { usePumpFun, type PumpFunStats } from './pump-fun/usePumpFun';
import { usePumpFunClaims } from './pump-fun/usePumpFunClaims';

// ============================================================================
// Unified event type
// ============================================================================

export interface UnifiedEvent {
  id: string;
  category: CategoryId;
  timestamp: number;
  label: string;
  amount?: number;
  address: string;
  mint?: string;
  meta?: Record<string, unknown>;
}

// ============================================================================
// Extended aggregate stats
// ============================================================================

export interface AggregateStats extends DataProviderStats {
  /** Per-category event counts */
  counts: Record<CategoryId, number>;
  /** Total transactions across all categories */
  totalTransactions: number;
  /** Total unique agents/wallets seen */
  totalAgents: number;
  /** Unified recent events (all categories) */
  recentEvents: UnifiedEvent[];
  /** Top tokens by volume (from PumpFun trades) */
  topTokens: TopToken[];
  /** Per-trader edges to tokens (for ForceGraph agent nodes) */
  traderEdges: TraderEdge[];
  /** Raw PumpFun events for LiveFeed backward compat */
  rawPumpFunEvents: RawEvent[];
}

// ============================================================================
// Converters
// ============================================================================

function pumpFunEventsToUnified(events: RawEvent[]): UnifiedEvent[] {
  return events.map((e) => {
    if (e.type === 'tokenCreate') {
      const d = e.data as Token;
      return {
        id: d.signature || d.mint || d.tokenAddress || '',
        category: (d.isAgent ? 'agentLaunches' : 'launches') as CategoryId,
        timestamp: d.timestamp,
        label: d.symbol || d.name || (d.mint ?? d.tokenAddress ?? '').slice(0, 8),
        amount: d.initialBuy ? d.initialBuy / 1e9 : undefined,
        address: d.traderPublicKey ?? d.creatorAddress ?? '',
        mint: d.mint,
      };
    }
    // Trade
    const d = e.data as Trade;
    return {
      id: d.signature,
      category: 'trades' as CategoryId,
      timestamp: d.timestamp,
      label: d.symbol || d.name || (d.mint ?? d.tokenAddress ?? '').slice(0, 8),
      amount: (d.solAmount ?? d.nativeAmount ?? 0) / 1e9,
      address: d.traderPublicKey ?? d.traderAddress ?? '',
      mint: d.mint,
      meta: { txType: d.txType },
    };
  });
}

function claimsToUnified(claims: RawEvent[]): UnifiedEvent[] {
  const results: UnifiedEvent[] = [];
  for (const c of claims) {
    if (c.type !== 'claim') continue;
    const d = c.data as Claim;
    results.push({
      id: d.signature,
      category: 'claimsWallet' as CategoryId,
      timestamp: d.timestamp,
      label: 'Wallet Claim',
      address: d.wallet ?? d.claimer ?? '',
      meta: { solAmount: d.solAmount },
    });
  }
  return results;
}

// ============================================================================
// Hook
// ============================================================================

const MAX_UNIFIED_EVENTS = 300;

export function useDataProvider({ paused = false }: { paused?: boolean } = {}) {
  // Underlying data sources
  const pumpFun = usePumpFun({ paused });
  const claims = usePumpFunClaims({ paused });

  // Category visibility (all enabled by default)
  const [enabledCategories, setEnabledCategories] = useState<Set<CategoryId>>(
    () => new Set(CATEGORIES),
  );

  const toggleCategory = useCallback((cat: CategoryId) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // Build unified stats
  const stats = useMemo<AggregateStats>(() => {
    const pumpEvents = pumpFunEventsToUnified(pumpFun.stats.recentEvents);
    const claimEvents = claimsToUnified(claims.stats.recentClaims);

    const allEvents = [...pumpEvents, ...claimEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_UNIFIED_EVENTS);

    const counts = {} as Record<CategoryId, number>;
    for (const cat of CATEGORIES) counts[cat] = 0;

    const launchCount = pumpFun.stats.totalTokens;
    const agentCount = pumpFun.stats.recentEvents.filter(
      (e) => e.type === 'tokenCreate' && (e.data as Token).isAgent,
    ).length;
    counts.launches = launchCount - agentCount;
    counts.agentLaunches = agentCount;
    counts.trades = pumpFun.stats.totalTrades;
    counts.claimsWallet = claims.stats.totalClaims;
    counts.claimsGithub = 0;
    counts.claimsFirst = 0;

    const totalTransactions =
      pumpFun.stats.totalTokens + pumpFun.stats.totalTrades + claims.stats.totalClaims;

    return {
      counts,
      totalTokens: pumpFun.stats.totalTokens,
      totalTrades: pumpFun.stats.totalTrades,
      totalClaims: claims.stats.totalClaims,
      totalVolumeSol: pumpFun.stats.totalVolumeSol,
      pumpFunConnected: pumpFun.connected,
      claimsConnected: claims.connected,
      totalTransactions,
      totalAgents: pumpFun.stats.topTokens.length,
      recentEvents: allEvents,
      topTokens: pumpFun.stats.topTokens,
      traderEdges: pumpFun.stats.traderEdges,
      rawEvents: pumpFun.stats.recentEvents,
      rawPumpFunEvents: pumpFun.stats.recentEvents,
    };
  }, [pumpFun.stats, pumpFun.connected, claims.stats, claims.connected]);

  // Filtered events (respecting enabled categories)
  const filteredEvents = useMemo(
    () => stats.recentEvents.filter((e) => enabledCategories.has(e.category)),
    [stats.recentEvents, enabledCategories],
  );

  return {
    stats,
    filteredEvents,
    enabledCategories,
    toggleCategory,
    connected: {
      pumpFun: pumpFun.connected,
      claims: claims.connected,
    },
  };
}
