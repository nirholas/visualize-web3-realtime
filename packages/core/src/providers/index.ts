// ============================================================================
// @web3viz/core — Data Provider Interface
//
// Abstract interface that any blockchain data source must implement.
// The SDK ships with PumpFun and Mock providers. Users can create their own
// by implementing this interface for any chain or protocol.
// ============================================================================

import type { DataProviderEvent, DataProviderStats, TopToken, TraderEdge, RawEvent } from '../types';
import type { CategoryConfig } from '../categories';

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface DataProviderOptions {
  /** Whether to start in a paused state */
  paused?: boolean;
  /** Maximum number of events to keep in memory */
  maxEvents?: number;
  /** Custom categories (merged with built-in defaults) */
  customCategories?: CategoryConfig[];
}

/** Connection state */
export interface ConnectionState {
  /** Human-readable name for this connection */
  name: string;
  /** Whether the connection is currently active */
  connected: boolean;
}

/**
 * Abstract data provider interface.
 *
 * Implementations feed real-time blockchain data into the visualization engine.
 * The provider is responsible for:
 * - Connecting to data sources (WebSocket, REST, etc.)
 * - Converting raw events into unified `DataProviderEvent` format
 * - Maintaining aggregate stats (volumes, counts, top tokens)
 * - Tracking trader → token edges for the graph
 *
 * @example
 * ```ts
 * class MyChainProvider implements DataProvider {
 *   connect() { ... }
 *   disconnect() { ... }
 *   getStats() { ... }
 *   getConnections() { ... }
 *   onEvent(callback) { ... }
 *   // ...
 * }
 * ```
 */
export interface DataProvider {
  /** Unique identifier for this provider */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Start connecting to data sources */
  connect(): void;

  /** Stop all connections */
  disconnect(): void;

  /** Get current aggregate stats */
  getStats(): DataProviderStats;

  /** Get connection states for all data sources */
  getConnections(): ConnectionState[];

  /** Subscribe to new events. Returns an unsubscribe function. */
  onEvent(callback: (event: DataProviderEvent) => void): () => void;

  /** Subscribe to raw events. Returns an unsubscribe function. */
  onRawEvent?(callback: (event: RawEvent) => void): () => void;

  /** Set paused state */
  setPaused(paused: boolean): void;

  /** Get current paused state */
  isPaused(): boolean;
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const providers = new Map<string, DataProvider>();

/** Register a data provider */
export function registerProvider(provider: DataProvider): void {
  providers.set(provider.id, provider);
}

/** Get a registered provider by ID */
export function getProvider(id: string): DataProvider | undefined {
  return providers.get(id);
}

/** Get all registered providers */
export function getAllProviders(): DataProvider[] {
  return Array.from(providers.values());
}

/** Unregister a provider */
export function unregisterProvider(id: string): boolean {
  return providers.delete(id);
}

// ---------------------------------------------------------------------------
// Provider factory helper
// ---------------------------------------------------------------------------

export interface CreateProviderConfig {
  id: string;
  name: string;
  connect: () => void;
  disconnect: () => void;
  getStats: () => DataProviderStats;
  getConnections: () => ConnectionState[];
}

/** Helper to create a simple provider from a config object */
export function createProvider(config: CreateProviderConfig): DataProvider {
  const listeners = new Set<(event: DataProviderEvent) => void>();
  let paused = false;

  return {
    id: config.id,
    name: config.name,
    connect: config.connect,
    disconnect: config.disconnect,
    getStats: config.getStats,
    getConnections: config.getConnections,
    onEvent(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    setPaused(p) {
      paused = p;
    },
    isPaused() {
      return paused;
    },
  };
}
