'use client';

/**
 * ERC-8004 Data Provider (stub)
 *
 * Scaffolded provider for ERC-8004 (Native Asset Issuance) events.
 * ERC-8004 enables native asset creation on EVM chains.
 *
 * To implement:
 * 1. Subscribe to ERC-8004 contract events on Ethereum/L2s
 * 2. Parse issuance and burn events into DataProviderEvent format
 * 3. Track top issuers as hubs, holders as edges
 */

import { useState } from 'react';
import type { DataProviderEvent, DataProviderStats } from '@web3viz/core';
import type { CategoryConfig, SourceConfig } from '@web3viz/core';

export const ERC8004_SOURCE: SourceConfig = {
  id: 'erc8004',
  label: 'ERC-8004',
  color: '#34d399',
  icon: '\u2B22',
  description: 'ERC-8004 native asset issuance & burns',
};

export const ERC8004_CATEGORIES: CategoryConfig[] = [
  { id: 'mints', label: 'Issuance', icon: '\u2B22', color: '#34d399', sourceId: 'erc8004' },
  { id: 'burns', label: 'Burns', icon: '\u2716', color: '#f87171', sourceId: 'erc8004' },
];

const EMPTY_STATS: DataProviderStats = {
  counts: { mints: 0, burns: 0 },
  totalVolumeSol: 0,
  totalTransactions: 0,
  totalAgents: 0,
  recentEvents: [],
  topTokens: [],
  traderEdges: [],
  rawEvents: [],
};

export interface ERC8004ProviderResult {
  stats: DataProviderStats;
  events: DataProviderEvent[];
  connected: boolean;
}

/**
 * Hook for ERC-8004 data.
 *
 * Data sources:
 * - Subscribe to ERC-8004 contract events via eth_subscribe
 * - Poll Etherscan/Basescan for ERC-8004 transactions
 * - The Graph subgraph for ERC-8004 contracts
 */
export function useERC8004Provider({ paused = false }: { paused?: boolean } = {}): ERC8004ProviderResult {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<DataProviderStats>(EMPTY_STATS);

  // TODO: Replace with real ERC-8004 event subscription

  return { stats, events: stats.recentEvents, connected };
}
