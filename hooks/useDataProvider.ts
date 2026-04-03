'use client';

import { useCallback, useMemo, useState } from 'react';

import { usePumpFun, type PumpFunEvent, type PumpFunStats, type TraderEdge } from './usePumpFun';
import { usePumpFunClaims, type PumpFunClaimStats, type PumpFunClaim } from './usePumpFunClaims';

// ---------------------------------------------------------------------------
// Category system
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  'launches',
  'agentLaunches',
  'trades',
  'claimsWallet',
  'claimsGithub',
  'claimsFirst',
] as const;

export type PumpFunCategory = (typeof CATEGORIES)[number];

export interface CategoryConfig {
  id: PumpFunCategory;
  label: string;
  /** Monospace-safe icon character */
  icon: string;
  color: string;
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'launches', label: 'Launches', icon: '\u26A1', color: '#a78bfa' },       // purple
  { id: 'agentLaunches', label: 'Agent Launches', icon: '\u2B23', color: '#f472b6' }, // pink
  { id: 'trades', label: 'Trades', icon: '\u25B2', color: '#60a5fa' },            // blue
  { id: 'claimsWallet', label: 'Wallet Claims', icon: '\u25C6', color: '#fbbf24' }, // amber
  { id: 'claimsGithub', label: 'GitHub Claims', icon: '\u2B22', color: '#34d399' }, // emerald
  { id: 'claimsFirst', label: 'First Claims', icon: '\u2605', color: '#f87171' },  // red
];

export const CATEGORY_CONFIG_MAP = Object.fromEntries(
  CATEGORY_CONFIGS.map((c) => [c.id, c]),
) as Record<PumpFunCategory, CategoryConfig>;

// ---------------------------------------------------------------------------
// Unified event type
// ---------------------------------------------------------------------------

export interface DataProviderEvent {
  id: string;
  category: PumpFunCategory;
  timestamp: number;
  label: string;
  amount?: number;
  address: string;
  mint?: string;
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Aggregate stats
// ---------------------------------------------------------------------------

export interface DataProviderStats {
  /** Per-category event counts */
  counts: Record<PumpFunCategory, number>;
  /** Total volume in SOL */
  totalVolumeSol: number;
  /** Total transactions across all categories */
  totalTransactions: number;
  /** Total unique agents/wallets seen */
  totalAgents: number;
  /** Unified recent events (all categories) */
  recentEvents: DataProviderEvent[];
  /** Top tokens by volume (from PumpFun trades) */
  topTokens: PumpFunStats['topTokens'];
  /** Per-trader edges to tokens (for ForceGraph agent nodes) */
  traderEdges: TraderEdge[];
  /** Raw PumpFun events for LiveFeed backward compat */
  rawPumpFunEvents: PumpFunEvent[];
}

// ---------------------------------------------------------------------------
// Convert raw events to unified format
// ---------------------------------------------------------------------------

function pumpFunEventsToUnified(events: PumpFunEvent[]): DataProviderEvent[] {
  return events.map((e) => {
    if (e.type === 'tokenCreate') {
      const d = e.data;
      return {
        id: d.signature || d.mint,
        category: d.isAgent ? 'agentLaunches' as const : 'launches' as const,
        timestamp: d.timestamp,
        label: d.symbol || d.name || d.mint.slice(0, 8),
        amount: d.initialBuy ? d.initialBuy / 1e9 : undefined,
        address: d.traderPublicKey,
        mint: d.mint,
      };
    }
    // Trade
    const d = e.data;
    return {
      id: d.signature,
      category: 'trades' as const,
      timestamp: d.timestamp,
      label: d.symbol || d.name || d.mint.slice(0, 8),
      amount: d.solAmount / 1e9,
      address: d.traderPublicKey,
      mint: d.mint,
      meta: { txType: d.txType },
    };
  });
}

function claimsToUnified(claims: PumpFunClaim[]): DataProviderEvent[] {
  const results: DataProviderEvent[] = [];
  for (const c of claims) {
    // Primary category
    const primaryCat: PumpFunCategory = c.claimType === 'github' ? 'claimsGithub' : 'claimsWallet';
    results.push({
      id: c.signature,
      category: primaryCat,
      timestamp: c.timestamp,
      label: `${c.claimType === 'github' ? 'GitHub' : 'Wallet'} Claim`,
      address: c.claimer,
      meta: { programId: c.programId, isFirstClaim: c.isFirstClaim },
    });
    // If it's a first claim, also emit a firstClaim event
    if (c.isFirstClaim) {
      results.push({
        id: `${c.signature}-first`,
        category: 'claimsFirst',
        timestamp: c.timestamp,
        label: `First ${c.claimType === 'github' ? 'GitHub' : 'Wallet'} Claim`,
        address: c.claimer,
        meta: { programId: c.programId },
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const MAX_UNIFIED_EVENTS = 300;

export function useDataProvider({ paused = false }: { paused?: boolean } = {}) {
  // Underlying data sources
  const pumpFun = usePumpFun({ paused });
  const claims = usePumpFunClaims({ paused });

  // Category visibility (all enabled by default)
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

  // Build unified stats
  const stats = useMemo<DataProviderStats>(() => {
    const pumpEvents = pumpFunEventsToUnified(pumpFun.stats.recentEvents);
    const claimEvents = claimsToUnified(claims.stats.recentClaims);

    // Merge and sort by timestamp descending
    const allEvents = [...pumpEvents, ...claimEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_UNIFIED_EVENTS);

    // Count per category
    const counts = {} as Record<PumpFunCategory, number>;
    for (const cat of CATEGORIES) counts[cat] = 0;

    // Count from totals (more accurate than counting recent events)
    const launchCount = pumpFun.stats.totalTokens;
    const agentCount = pumpFun.stats.recentEvents.filter(
      (e) => e.type === 'tokenCreate' && e.data.isAgent,
    ).length;
    counts.launches = launchCount - agentCount;
    counts.agentLaunches = agentCount;
    counts.trades = pumpFun.stats.totalTrades;
    counts.claimsWallet = claims.stats.walletClaims;
    counts.claimsGithub = claims.stats.githubClaims;
    counts.claimsFirst = claims.stats.firstClaims;

    const totalTransactions =
      pumpFun.stats.totalTokens + pumpFun.stats.totalTrades + claims.stats.totalClaims;

    return {
      counts,
      totalVolumeSol: pumpFun.stats.totalVolumeSol,
      totalTransactions,
      totalAgents: pumpFun.stats.topTokens.length,
      recentEvents: allEvents,
      topTokens: pumpFun.stats.topTokens,
      traderEdges: pumpFun.stats.traderEdges,
      rawPumpFunEvents: pumpFun.stats.recentEvents,
    };
  }, [pumpFun.stats, claims.stats]);

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
