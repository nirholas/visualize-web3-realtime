'use client';

/**
 * PumpFun Data Provider
 *
 * Wraps the existing PumpFun + Claims WebSocket hooks into the DataProvider
 * interface so they can be used alongside other data sources.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePumpFun, type PumpFunEvent, type TraderEdge } from '../usePumpFun';
import { usePumpFunClaims, type PumpFunClaim } from '../usePumpFunClaims';
import type { DataProviderEvent, DataProviderStats, RawEvent } from '@web3viz/core';
import type { CategoryConfig, SourceConfig } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Source & category config
// ---------------------------------------------------------------------------

export const PUMPFUN_SOURCE: SourceConfig = {
  id: 'pumpfun',
  label: 'PumpFun',
  color: '#a78bfa',
  icon: '\u26A1',
  description: 'Solana token launches & trades via PumpPortal',
};

export const PUMPFUN_CATEGORIES: CategoryConfig[] = [
  { id: 'launches', label: 'Launches', icon: '\u26A1', color: '#a78bfa', sourceId: 'pumpfun' },
  { id: 'agentLaunches', label: 'Agent Launches', icon: '\u2B23', color: '#f472b6', sourceId: 'pumpfun' },
  { id: 'trades', label: 'Trades', icon: '\u25B2', color: '#60a5fa', sourceId: 'pumpfun' },
  { id: 'claimsWallet', label: 'Wallet Claims', icon: '\u25C6', color: '#fbbf24', sourceId: 'pumpfun' },
  { id: 'claimsGithub', label: 'GitHub Claims', icon: '\u2B22', color: '#34d399', sourceId: 'pumpfun' },
  { id: 'claimsFirst', label: 'First Claims', icon: '\u2605', color: '#f87171', sourceId: 'pumpfun' },
];

// ---------------------------------------------------------------------------
// Convert raw PumpFun events → unified DataProviderEvent
// ---------------------------------------------------------------------------

function pumpFunEventsToUnified(events: PumpFunEvent[]): DataProviderEvent[] {
  return events.map((e) => {
    if (e.type === 'tokenCreate') {
      const d = e.data;
      return {
        id: d.signature || d.mint,
        category: d.isAgent ? 'agentLaunches' : 'launches',
        source: 'pumpfun',
        timestamp: d.timestamp,
        label: d.symbol || d.name || d.mint.slice(0, 8),
        amount: d.initialBuy ? d.initialBuy / 1e9 : undefined,
        address: d.traderPublicKey,
        mint: d.mint,
      };
    }
    const d = e.data;
    return {
      id: d.signature,
      category: 'trades',
      source: 'pumpfun',
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
    const primaryCat = c.claimType === 'github' ? 'claimsGithub' : 'claimsWallet';
    results.push({
      id: c.signature,
      category: primaryCat,
      source: 'pumpfun',
      timestamp: c.timestamp,
      label: `${c.claimType === 'github' ? 'GitHub' : 'Wallet'} Claim`,
      address: c.claimer,
      meta: { programId: c.programId, isFirstClaim: c.isFirstClaim },
    });
    if (c.isFirstClaim) {
      results.push({
        id: `${c.signature}-first`,
        category: 'claimsFirst',
        source: 'pumpfun',
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
// Hook — returns stats in the standard provider shape
// ---------------------------------------------------------------------------

const MAX_UNIFIED_EVENTS = 300;

export interface PumpFunProviderResult {
  stats: DataProviderStats;
  events: DataProviderEvent[];
  connected: { pumpFun: boolean; claims: boolean };
  rawPumpFunEvents: PumpFunEvent[];
}

export function usePumpFunProvider({ paused = false }: { paused?: boolean } = {}): PumpFunProviderResult {
  const pumpFun = usePumpFun({ paused });
  const claims = usePumpFunClaims({ paused });

  const stats = useMemo<DataProviderStats>(() => {
    const pumpEvents = pumpFunEventsToUnified(pumpFun.stats.recentEvents);
    const claimEvents = claimsToUnified(claims.stats.recentClaims);

    const allEvents = [...pumpEvents, ...claimEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_UNIFIED_EVENTS);

    const launchCount = pumpFun.stats.totalTokens;
    const agentCount = pumpFun.stats.recentEvents.filter(
      (e) => e.type === 'tokenCreate' && e.data.isAgent,
    ).length;

    const counts: Record<string, number> = {
      launches: launchCount - agentCount,
      agentLaunches: agentCount,
      trades: pumpFun.stats.totalTrades,
      claimsWallet: claims.stats.walletClaims,
      claimsGithub: claims.stats.githubClaims,
      claimsFirst: claims.stats.firstClaims,
    };

    const totalTransactions =
      pumpFun.stats.totalTokens + pumpFun.stats.totalTrades + claims.stats.totalClaims;

    // Tag top tokens and trader edges with source
    const topTokens = pumpFun.stats.topTokens.map((t) => ({ ...t, source: 'pumpfun' }));
    const traderEdges = pumpFun.stats.traderEdges.map((e) => ({ ...e, source: 'pumpfun' }));

    return {
      counts,
      totalVolumeSol: pumpFun.stats.totalVolumeSol,
      totalTransactions,
      totalAgents: pumpFun.stats.topTokens.length,
      recentEvents: allEvents,
      topTokens,
      traderEdges,
      rawEvents: [],
    };
  }, [pumpFun.stats, claims.stats]);

  return {
    stats,
    events: stats.recentEvents,
    connected: { pumpFun: pumpFun.connected, claims: claims.connected },
    rawPumpFunEvents: pumpFun.stats.recentEvents,
  };
}
