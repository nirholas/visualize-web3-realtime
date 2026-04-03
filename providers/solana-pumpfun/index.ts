/**
 * Solana PumpFun Data Provider
 *
 * Connects to:
 * - wss://pumpportal.fun/api/data (token launches + trades)
 * - Solana RPC WebSocket (fee claim events)
 *
 * Self-registers with @web3viz/core on import.
 */

import {
  registerProvider,
  type DataProvider,
  type DataProviderEvent,
  type DataProviderStats,
  type ConnectionState,
  type TopToken,
  type TraderEdge,
  type RawEvent,
  type SourceConfig,
} from '@web3viz/core';

import { PUMPFUN_CATEGORIES } from './categories';
import { PumpFunWebSocket } from './pumpfun-ws';
import { SolanaClaimsWebSocket } from './claims-ws';

class PumpFunProvider implements DataProvider {
  readonly id = 'solana-pumpfun';
  readonly name = 'Solana (PumpFun)';
  readonly sourceConfig: SourceConfig = {
    id: 'pumpfun',
    label: 'PumpFun',
    color: '#a78bfa',
    icon: '⚡',
    description: 'Solana token launches & trades',
  };
  readonly categories = PUMPFUN_CATEGORIES;

  private listeners = new Set<(event: DataProviderEvent) => void>();
  private rawListeners = new Set<(event: RawEvent) => void>();
  private paused = false;
  private enabled = true;
  private pumpFunWs: PumpFunWebSocket;
  private claimsWs: SolanaClaimsWebSocket;

  // Aggregate state
  private stats: DataProviderStats = {
    counts: {},
    totalVolume: { solana: 0 },
    totalTransactions: 0,
    totalAgents: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
    rawEvents: [],
  };

  constructor() {
    this.pumpFunWs = new PumpFunWebSocket({
      onEvent: (event) => this.handleEvent(event),
      onRawEvent: (raw) => this.handleRawEvent(raw),
      isPaused: () => this.paused,
      onTopTokensChanged: (tokens, edges) => this.updateTopTokens(tokens, edges),
    });

    this.claimsWs = new SolanaClaimsWebSocket({
      onEvent: (event) => this.handleEvent(event),
      isPaused: () => this.paused,
    });
  }

  connect(): void {
    this.pumpFunWs.connect();
    this.claimsWs.connect();
  }

  disconnect(): void {
    this.pumpFunWs.disconnect();
    this.claimsWs.disconnect();
  }

  getStats(): DataProviderStats {
    return { ...this.stats };
  }

  getConnections(): ConnectionState[] {
    return [
      { name: 'PumpFun', connected: this.pumpFunWs.isConnected() },
      { name: 'Solana Claims', connected: this.claimsWs.isConnected() },
    ];
  }

  onEvent(callback: (event: DataProviderEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onRawEvent(callback: (event: RawEvent) => void): () => void {
    this.rawListeners.add(callback);
    return () => this.rawListeners.delete(callback);
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

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private handleEvent(event: DataProviderEvent): void {
    if (this.paused) return;

    // Update counts
    this.stats.counts[event.category] = (this.stats.counts[event.category] || 0) + 1;

    // Update volume
    if (event.amount) {
      this.stats.totalVolume['solana'] = (this.stats.totalVolume['solana'] || 0) + event.amount;
    }

    this.stats.totalTransactions++;

    // Update recent events (cap at 300)
    this.stats.recentEvents = [event, ...this.stats.recentEvents].slice(0, 300);

    // Notify listeners
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private handleRawEvent(raw: RawEvent): void {
    if (this.paused) return;
    this.stats.rawEvents = [raw, ...this.stats.rawEvents].slice(0, 200);
    for (const listener of this.rawListeners) {
      listener(raw);
    }
  }

  /** Called by PumpFunWebSocket when top tokens / trader edges change */
  private updateTopTokens(tokens: TopToken[], edges: TraderEdge[]): void {
    this.stats.topTokens = tokens;
    this.stats.traderEdges = edges;
    this.stats.totalAgents = tokens.length;
  }
}

// Self-register on import
const provider = new PumpFunProvider();
registerProvider(provider);

export { provider as pumpFunProvider };
export type { PumpFunProvider };
