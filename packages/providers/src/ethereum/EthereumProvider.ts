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

import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  ConnectionState,
  CategoryConfig,
  SourceConfig,
  RawEvent,
  TopToken,
  TraderEdge,
} from '@web3viz/core';
import { getCategoriesForSource, SOURCE_CONFIGS } from '@web3viz/core';

import { BoundedMap } from '../shared';
import { EthereumWebSocket } from './ethereum-ws';

export interface EthereumProviderOptions {
  /** Ethereum WebSocket RPC URL */
  wsUrl?: string;
  /** Max events kept in memory (default 300) */
  maxEvents?: number;
  /** Max top tokens tracked (default 8) */
  maxTopTokens?: number;
}

export class EthereumProvider implements DataProvider {
  readonly id = 'ethereum';
  readonly name = 'Ethereum';
  readonly chains = ['ethereum'];
  readonly sourceConfig: SourceConfig;
  readonly categories: CategoryConfig[];

  // Event listeners
  private eventListeners = new Set<(event: DataProviderEvent) => void>();
  private rawListeners = new Set<(event: RawEvent) => void>();

  // Config
  private maxEvents: number;
  private maxTopTokens: number;

  // Internal state
  private _paused = false;
  private _enabled = true;

  // WebSocket connection
  private ws: EthereumWebSocket;

  // Data accumulators
  private tokenAcc = new BoundedMap<string, TopToken>(10_000);
  private traderAcc = new BoundedMap<string, TraderEdge>(50_000);

  // Recent events ring buffer
  private recentEvents: DataProviderEvent[] = [];
  private rawEvents: RawEvent[] = [];

  // Stats per category
  private counts: Record<string, number> = {
    ethSwaps: 0,
    ethTransfers: 0,
    ethMints: 0,
  };
  private totalVolumeEth = 0;

  constructor(options: EthereumProviderOptions = {}) {
    this.maxEvents = options.maxEvents ?? 300;
    this.maxTopTokens = options.maxTopTokens ?? 8;

    // Get ethereum source config from core, or use fallback
    const sourceConfig = SOURCE_CONFIGS.find((s) => s.id === 'ethereum');
    this.sourceConfig =
      sourceConfig ||
      ({
        id: 'ethereum',
        label: 'Ethereum',
        color: '#627EEA',
        icon: '\u25C6',
        description: 'Ethereum mainnet DEX swaps & transfers',
      } as SourceConfig);

    // Get categories from core
    this.categories = getCategoriesForSource('ethereum');

    this.ws = new EthereumWebSocket({
      onEvent: (event) => this.handleEvent(event),
      onSwap: (swap) => this.handleSwap(swap),
      isPaused: () => this._paused || !this._enabled,
    });
  }

  // =========================================================================
  // DataProvider interface
  // =========================================================================

  connect(): void {
    this.ws.connect();
  }

  disconnect(): void {
    this.ws.disconnect();
  }

  setPaused(paused: boolean): void {
    this._paused = paused;
  }

  isPaused(): boolean {
    return this._paused;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  getStats(): DataProviderStats {
    const topTokens = Array.from(this.tokenAcc.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, this.maxTopTokens);

    const topAddresses = new Set(topTokens.map((t) => t.tokenAddress));
    const traderEdges = Array.from(this.traderAcc.values())
      .filter((e) => topAddresses.has(e.tokenAddress))
      .slice(0, 5000);

    return {
      counts: { ...this.counts },
      totalVolume: { ethereum: this.totalVolumeEth },
      totalTransactions: Object.values(this.counts).reduce((a, b) => a + b, 0),
      totalAgents: topTokens.length,
      recentEvents: [...this.recentEvents],
      topTokens,
      traderEdges,
      rawEvents: [...this.rawEvents],
    };
  }

  getConnections(): ConnectionState[] {
    return [{ name: 'Ethereum RPC', connected: this.ws.isConnected() }];
  }

  onEvent(callback: (event: DataProviderEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  onRawEvent(callback: (event: RawEvent) => void): () => void {
    this.rawListeners.add(callback);
    return () => {
      this.rawListeners.delete(callback);
    };
  }

  // =========================================================================
  // Event handling
  // =========================================================================

  private handleEvent(event: DataProviderEvent): void {
    if (this._paused || !this._enabled) return;

    this.counts[event.category] = (this.counts[event.category] || 0) + 1;
    if (event.amount) {
      this.totalVolumeEth += event.amount;
    }

    // Add to ring buffer
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents.pop();
    }

    // Emit raw event
    let rawEvent: RawEvent;
    if (event.category === 'ethSwaps') {
      rawEvent = {
        type: 'trade',
        data: {
          tokenAddress: event.tokenAddress || '',
          chain: 'ethereum',
          signature: event.id,
          traderAddress: event.address,
          txType: 'swap',
          tokenAmount: 0,
          nativeAmount: event.amount || 0,
          nativeSymbol: 'ETH',
          timestamp: event.timestamp,
        },
      };
    } else {
      rawEvent = {
        type: 'custom',
        data: {
          category: event.category,
          id: event.id,
          address: event.address,
          tokenAddress: event.tokenAddress,
          amount: event.amount,
          chain: 'ethereum',
          timestamp: event.timestamp,
        },
      };
    }

    this.rawEvents.unshift(rawEvent);
    if (this.rawEvents.length > this.maxEvents) {
      this.rawEvents.pop();
    }

    for (const listener of this.rawListeners) {
      listener(rawEvent);
    }

    // Emit to event listeners
    for (const listener of this.eventListeners) {
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
      existing.volumeSol = (existing.volumeSol ?? 0) + swap.volume;
    } else {
      this.tokenAcc.set(swap.tokenAddress, {
        tokenAddress: swap.tokenAddress,
        mint: swap.tokenAddress,
        symbol: swap.symbol,
        name: swap.name,
        chain: 'ethereum',
        trades: 1,
        volume: swap.volume,
        volumeSol: swap.volume,
        nativeSymbol: 'ETH',
        source: 'ethereum',
      });
    }

    // Update trader edges
    const edgeKey = `${swap.trader}:${swap.tokenAddress}`;
    const existingEdge = this.traderAcc.get(edgeKey);
    if (existingEdge) {
      existingEdge.trades++;
      existingEdge.volume += swap.volume;
      existingEdge.volumeSol = (existingEdge.volumeSol ?? 0) + swap.volume;
    } else {
      this.traderAcc.set(edgeKey, {
        trader: swap.trader,
        tokenAddress: swap.tokenAddress,
        mint: swap.tokenAddress,
        chain: 'ethereum',
        trades: 1,
        volume: swap.volume,
        volumeSol: swap.volume,
        source: 'ethereum',
      });
    }
  }
}
