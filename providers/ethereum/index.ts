/**
 * Ethereum Mainnet Data Provider
 *
 * Connects to an Ethereum WebSocket RPC to stream:
 * - Uniswap V2/V3 swap events
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
  type TopToken,
  type TraderEdge,
} from '@web3viz/core';

import { ETH_CATEGORIES } from './categories';
import { EthereumWebSocket } from './ethereum-ws';
import { EVENT_BUFFER_SIZE } from './constants';

class EthereumProvider implements DataProvider {
  readonly id = 'ethereum';
  readonly name = 'Ethereum';
  readonly chains = ['ethereum'];
  readonly categories: CategoryConfig[] = ETH_CATEGORIES;

  private listeners = new Set<(event: DataProviderEvent) => void>();
  private paused = false;
  private ws: EthereumWebSocket;

  private stats: DataProviderStats = {
    counts: {},
    totalVolume: { ethereum: 0 },
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
    this.ws = new EthereumWebSocket({
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
    return [{ name: 'Ethereum', connected: this.ws.isConnected_() }];
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

  private handleEvent(event: DataProviderEvent): void {
    if (this.paused) return;

    this.stats.counts[event.category] = (this.stats.counts[event.category] || 0) + 1;

    if (event.amount) {
      this.stats.totalVolume.ethereum = (this.stats.totalVolume.ethereum || 0) + event.amount;
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
      existing.volumeSol = (existing.volumeSol || 0) + swap.volume;
    } else {
      this.tokenAcc.set(swap.tokenAddress, {
        mint: swap.tokenAddress,
        symbol: swap.symbol || swap.tokenAddress.slice(0, 8),
        name: swap.name || swap.symbol || 'Unknown',
        chain: 'ethereum',
        trades: 1,
        volumeSol: swap.volume,
        nativeSymbol: 'ETH',
      });
    }

    // Update trader edges
    const edgeKey = `${swap.trader}:${swap.tokenAddress}`;
    const existingEdge = this.traderAcc.get(edgeKey);

    if (existingEdge) {
      existingEdge.trades++;
      existingEdge.volumeSol = (existingEdge.volumeSol || 0) + swap.volume;
    } else {
      this.traderAcc.set(edgeKey, {
        trader: swap.trader,
        mint: swap.tokenAddress,
        chain: 'ethereum',
        trades: 1,
        volumeSol: swap.volume,
      });
    }

    // Rebuild sorted top tokens and filter edges
    const sorted = Array.from(this.tokenAcc.values())
      .sort((a, b) => (b.volumeSol || 0) - (a.volumeSol || 0))
      .slice(0, 8);

    const topAddrs = new Set(sorted.map((t) => t.mint));

    this.stats.topTokens = sorted;
    this.stats.traderEdges = Array.from(this.traderAcc.values())
      .filter((e) => topAddrs.has(e.mint))
      .slice(0, 5000);
    this.stats.totalAgents = sorted.length;
  }
}

const provider = new EthereumProvider();
registerProvider(provider);

export { provider as ethereumProvider };
