/**
 * Base (Coinbase L2) Data Provider
 *
 * Connects to a Base WebSocket RPC to stream:
 * - Aerodrome / Uniswap V3 swap events
 * - Large ERC-20 transfers
 * - Token mints (Transfer from 0x0)
 *
 * Self-registers with @web3viz/core on import.
 */

'use client';

import {
  registerProvider,
  type DataProvider,
  type DataProviderEvent,
  type DataProviderStats,
  type ConnectionState,
  type CategoryConfig,
  type SourceConfig,
  type TopToken,
  type TraderEdge,
} from '@web3viz/core';

import { BASE_CATEGORIES } from './categories';
import { BaseWebSocket } from './base-ws';
import { EVENT_BUFFER_SIZE } from './constants';

class BaseProvider implements DataProvider {
  readonly id = 'base';
  readonly name = 'Base';
  readonly chains = ['base'];
  readonly categories: CategoryConfig[] = BASE_CATEGORIES;
  readonly sourceConfig: SourceConfig = {
    id: 'base',
    label: 'Base',
    color: '#0052FF',
    icon: '▲',
    description: 'Base L2 transactions',
  };

  private listeners = new Set<(event: DataProviderEvent) => void>();
  private paused = false;
  private enabled = true;
  private ws: BaseWebSocket;

  private stats: DataProviderStats = {
    counts: {},
    totalVolume: { base: 0 },
    totalTransactions: 0,
    totalAgents: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
    rawEvents: [],
  };

  // Top token accumulator: tokenAddress → TopToken
  private tokenAcc = new Map<string, TopToken>();
  // Trader edge accumulator: "trader:token" → TraderEdge
  private traderAcc = new Map<string, TraderEdge>();

  constructor() {
    this.ws = new BaseWebSocket({
      onEvent: (event) => this.handleEvent(event),
      onSwap: (swap) => this.handleSwap(swap),
      isPaused: () => this.paused,
    });
  }

  connect(): void {
    this.ws.connect();
  }

  disconnect(): void {
    this.ws.disconnect();
  }

  getStats(): DataProviderStats {
    return { ...this.stats };
  }

  getConnections(): ConnectionState[] {
    return [{ name: 'Base', connected: this.ws.isConnected() }];
  }

  onEvent(callback: (event: DataProviderEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private handleEvent(event: DataProviderEvent): void {
    if (this.paused) return;

    this.stats.counts[event.category] = (this.stats.counts[event.category] || 0) + 1;

    if (event.amount) {
      this.stats.totalVolume!.base = (this.stats.totalVolume!.base || 0) + event.amount;
    }

    this.stats.totalTransactions++;

    // Keep recent events buffer
    this.stats.recentEvents = [event, ...this.stats.recentEvents].slice(0, EVENT_BUFFER_SIZE);

    // Emit to all listeners
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private handleSwap(swap: {
    tokenAddress: string;
    symbol: string;
    name: string;
    trader: string;
    volume: number;
  }): void {
    // Update top tokens
    const existing = this.tokenAcc.get(swap.tokenAddress);

    if (existing) {
      existing.trades++;
      existing.volume += swap.volume;
    } else {
      this.tokenAcc.set(swap.tokenAddress, {
        tokenAddress: swap.tokenAddress,
        symbol: swap.symbol || swap.tokenAddress.slice(0, 8),
        name: swap.name || swap.symbol || 'Unknown',
        chain: 'base',
        trades: 1,
        volume: swap.volume,
        nativeSymbol: 'ETH',
      });
    }

    // Update trader edges
    const edgeKey = `${swap.trader}:${swap.tokenAddress}`;
    const existingEdge = this.traderAcc.get(edgeKey);

    if (existingEdge) {
      existingEdge.trades++;
      existingEdge.volume += swap.volume;
    } else {
      this.traderAcc.set(edgeKey, {
        trader: swap.trader,
        tokenAddress: swap.tokenAddress,
        chain: 'base',
        trades: 1,
        volume: swap.volume,
      });
    }

    // Rebuild sorted top tokens and filter edges
    const sorted = Array.from(this.tokenAcc.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);

    const topAddrs = new Set(sorted.map((t) => t.tokenAddress));

    this.stats.topTokens = sorted;
    this.stats.traderEdges = Array.from(this.traderAcc.values())
      .filter((e) => topAddrs.has(e.tokenAddress))
      .slice(0, 5000);
    this.stats.totalAgents = sorted.length;
  }
}

const provider = new BaseProvider();
registerProvider(provider);

export { provider as baseProvider };
