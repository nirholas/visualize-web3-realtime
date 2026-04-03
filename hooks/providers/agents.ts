'use client';

/**
 * AI Agents Data Provider (stub)
 *
 * Scaffolded provider for visualizing autonomous AI agent activity on-chain.
 * This could aggregate agent activity from multiple chains (Solana, ETH, Base)
 * or connect to agent-specific platforms (Virtuals, ai16z, etc.).
 *
 * To implement:
 * 1. Connect to agent monitoring APIs or on-chain data
 * 2. Parse agent transactions into DataProviderEvent format
 * 3. Each agent wallet becomes a hub; their trades become edges
 */

import { useState } from 'react';
import type { DataProviderEvent, DataProviderStats } from '@web3viz/core';
import type { CategoryConfig, SourceConfig } from '@web3viz/core';

export const AGENTS_SOURCE: SourceConfig = {
  id: 'agents',
  label: 'AI Agents',
  color: '#f472b6',
  icon: '\u2B23',
  description: 'Autonomous AI agent on-chain activity',
};

export const AGENTS_CATEGORIES: CategoryConfig[] = [
  { id: 'trades', label: 'Agent Trades', icon: '\u2B23', color: '#f472b6', sourceId: 'agents' },
];

const EMPTY_STATS: DataProviderStats = {
  counts: { trades: 0 },
  totalVolumeSol: 0,
  totalTransactions: 0,
  totalAgents: 0,
  recentEvents: [],
  topTokens: [],
  traderEdges: [],
  rawEvents: [],
};

export interface AgentsProviderResult {
  stats: DataProviderStats;
  events: DataProviderEvent[];
  connected: boolean;
}

/**
 * Hook for AI Agent activity data.
 *
 * Ideas for data sources:
 * - Virtuals Protocol API
 * - ai16z agent registry
 * - Custom agent wallet tracker (list of known agent wallets)
 * - ElizaOS activity feed
 */
export function useAgentsProvider({ paused = false }: { paused?: boolean } = {}): AgentsProviderResult {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<DataProviderStats>(EMPTY_STATS);

  // TODO: Replace with real agent monitoring connection

  return { stats, events: stats.recentEvents, connected };
}
