'use client';

/**
 * Base L2 Data Provider (stub)
 *
 * Scaffolded provider for Base (Coinbase L2) data. Connect to Base RPC,
 * The Graph subgraphs, or any Base-specific API.
 *
 * To implement:
 * 1. Add your WebSocket/API connection
 * 2. Parse incoming data into DataProviderEvent format
 * 3. Accumulate stats
 */

import { useState } from 'react';
import type { DataProviderEvent, DataProviderStats } from '@web3viz/core';
import type { CategoryConfig, SourceConfig } from '@web3viz/core';

export const BASE_SOURCE: SourceConfig = {
  id: 'base',
  label: 'Base',
  color: '#3b82f6',
  icon: '\u25B2',
  description: 'Base L2 swaps & mints',
};

export const BASE_CATEGORIES: CategoryConfig[] = [
  { id: 'swaps', label: 'Swaps', icon: '\u21C4', color: '#3b82f6', sourceId: 'base' },
  { id: 'mints', label: 'Mints', icon: '\u2726', color: '#22d3ee', sourceId: 'base' },
];

const EMPTY_STATS: DataProviderStats = {
  counts: { swaps: 0, mints: 0 },
  totalVolumeSol: 0,
  totalTransactions: 0,
  totalAgents: 0,
  recentEvents: [],
  topTokens: [],
  traderEdges: [],
  rawEvents: [],
};

export interface BaseProviderResult {
  stats: DataProviderStats;
  events: DataProviderEvent[];
  connected: boolean;
}

/**
 * Hook for Base L2 data.
 *
 * Replace with a real connection:
 * - Base RPC: wss://mainnet.base.org or Alchemy/Infura Base endpoints
 * - Poll Basescan API
 * - Subscribe to The Graph subgraph
 */
export function useBaseProvider({ paused = false }: { paused?: boolean } = {}): BaseProviderResult {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<DataProviderStats>(EMPTY_STATS);

  // TODO: Replace with real Base WebSocket/API connection

  return { stats, events: stats.recentEvents, connected };
}
