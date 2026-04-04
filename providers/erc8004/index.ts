/**
 * ERC-8004 Tokenized Asset Data Provider
 *
 * Tracks mutable-metadata NFT activity (ERC-8004 / ERC-4906) on
 * Ethereum and Base chains.
 *
 * Monitors:
 * - Token mints (Transfer from 0x0)
 * - Token transfers
 * - Metadata update events (ERC-4906)
 *
 * Self-registers with @web3viz/core on import.
 */

'use client';

import {
  registerProvider,
  SOURCE_CONFIG_MAP,
  type DataProvider,
  type DataProviderEvent,
  type DataProviderStats,
  type ConnectionState,
  type CategoryConfig,
  type TopToken,
} from '@web3viz/core';
import { ERC8004_CATEGORIES } from './categories';
import { ERC8004WebSocket } from './erc8004-ws';
import { EVENT_BUFFER_SIZE } from './constants';

class ERC8004Provider implements DataProvider {
  readonly id = 'erc8004';
  readonly name = 'ERC-8004 Assets';
  readonly chains = ['ethereum', 'base'];
  readonly sourceConfig = SOURCE_CONFIG_MAP['erc8004'];
  readonly categories: CategoryConfig[] = ERC8004_CATEGORIES;

  private listeners = new Set<(event: DataProviderEvent) => void>();
  private paused = false;
  private enabled = true;

  // One WS connection per chain
  private ethWs: ERC8004WebSocket;
  private baseWs: ERC8004WebSocket;

  private stats: DataProviderStats = {
    counts: { erc8004Mints: 0, erc8004Transfers: 0, erc8004Updates: 0 },
    totalVolume: {},
    totalTransactions: 0,
    totalAgents: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
    rawEvents: [],
  };

  // Track collections by contract address
  private collectionAcc = new Map<string, TopToken>();

  constructor() {
    const handler = (event: DataProviderEvent) => this.handleEvent(event);
    const isPaused = () => this.paused;

    this.ethWs = new ERC8004WebSocket({
      wsUrl: process.env.NEXT_PUBLIC_ETH_WS_URL || 'wss://ethereum-rpc.publicnode.com',
      chain: 'ethereum',
      providerId: 'erc8004',
      onEvent: handler,
      onCollection: (c) => this.handleCollection(c),
      isPaused,
    });

    this.baseWs = new ERC8004WebSocket({
      wsUrl: process.env.NEXT_PUBLIC_BASE_WS_URL || 'wss://base-rpc.publicnode.com',
      chain: 'base',
      providerId: 'erc8004',
      onEvent: handler,
      onCollection: (c) => this.handleCollection(c),
      isPaused,
    });
  }

  connect(): void {
    this.ethWs.connect();
    this.baseWs.connect();
  }

  disconnect(): void {
    this.ethWs.disconnect();
    this.baseWs.disconnect();
  }

  getStats(): DataProviderStats {
    return { ...this.stats };
  }

  getConnections(): ConnectionState[] {
    return [
      { name: 'ERC-8004 (ETH)', connected: this.ethWs.isConnected() },
      { name: 'ERC-8004 (Base)', connected: this.baseWs.isConnected() },
    ];
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
    this.stats.totalTransactions++;
    this.stats.recentEvents = [event, ...this.stats.recentEvents].slice(0, EVENT_BUFFER_SIZE);

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private handleCollection(info: { address: string; chain: string; name: string }) {
    const existing = this.collectionAcc.get(info.address);

    if (existing) {
      existing.trades++;
    } else {
      this.collectionAcc.set(info.address, {
        tokenAddress: info.address,
        symbol: info.name.slice(0, 6).toUpperCase(),
        name: info.name,
        chain: info.chain,
        trades: 1,
        volume: 0,
        nativeSymbol: 'ETH',
      });
    }

    this.stats.topTokens = Array.from(this.collectionAcc.values())
      .sort((a, b) => b.trades - a.trades)
      .slice(0, 8);
  }
}

const provider = new ERC8004Provider();
registerProvider(provider);

export { provider as erc8004Provider };
