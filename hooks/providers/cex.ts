'use client';

/**
 * CEX Volume Data Provider (stub)
 *
 * Scaffolded provider for centralized exchange (CEX) volume data.
 * Aggregates trading volume from major exchanges like Binance, Coinbase, etc.
 *
 * To implement:
 * 1. Connect to exchange WebSocket APIs or poll REST endpoints
 * 2. Aggregate volume per trading pair into DataProviderEvent format
 * 3. Top trading pairs become hubs; individual trades become edges
 */

import { useState } from 'react';
import type { DataProviderEvent, DataProviderStats } from '@web3viz/core';
import type { CategoryConfig, SourceConfig } from '@web3viz/core';

export const CEX_SOURCE: SourceConfig = {
  id: 'cex',
  label: 'CEX Volume',
  color: '#fbbf24',
  icon: '\u25CF',
  description: 'Centralized exchange trading volume',
};

export const CEX_CATEGORIES: CategoryConfig[] = [
  { id: 'volume', label: 'Volume', icon: '\u25CF', color: '#fbbf24', sourceId: 'cex' },
];

const EMPTY_STATS: DataProviderStats = {
  counts: { volume: 0 },
  totalVolumeSol: 0,
  totalTransactions: 0,
  totalAgents: 0,
  recentEvents: [],
  topTokens: [],
  traderEdges: [],
  rawEvents: [],
};

export interface CEXProviderResult {
  stats: DataProviderStats;
  events: DataProviderEvent[];
  connected: boolean;
}

/**
 * Hook for CEX volume data.
 *
 * Data sources:
 * - Binance WebSocket: wss://stream.binance.com:9443/ws/!ticker@arr
 * - Coinbase WebSocket: wss://ws-feed.exchange.coinbase.com
 * - CoinGecko API (REST polling)
 * - CryptoCompare streaming API
 */
export function useCEXProvider({ paused = false }: { paused?: boolean } = {}): CEXProviderResult {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<DataProviderStats>(EMPTY_STATS);

  // TODO: Replace with real CEX API connection
  //
  // Example Binance WebSocket:
  // useEffect(() => {
  //   const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
  //   ws.onopen = () => setConnected(true);
  //   ws.onmessage = (event) => {
  //     if (paused) return;
  //     const tickers = JSON.parse(event.data);
  //     // Each ticker: { s: 'BTCUSDT', v: '1234.5', q: '45678900' }
  //     // Convert to DataProviderEvent with source: 'cex'
  //   };
  //   return () => ws.close();
  // }, [paused]);

  return { stats, events: stats.recentEvents, connected };
}
