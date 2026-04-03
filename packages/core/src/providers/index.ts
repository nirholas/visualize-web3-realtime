// ============================================================================
// @web3viz/core — Data Provider Interface
//
// Abstract interface that any blockchain data source must implement.
// Each provider represents one data source (e.g. PumpFun, Ethereum, Base).
// Users can create their own by implementing this interface for any chain,
// protocol, or API — then register it so it appears in the visualization.
// ============================================================================

import type { DataProviderEvent, DataProviderStats, TopToken, TraderEdge, RawEvent } from '../types';
import type { CategoryConfig, SourceConfig } from '../categories';

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
 * - Connecting to data sources (WebSocket, REST polling, etc.)
 * - Converting raw events into unified `DataProviderEvent` format
 * - Maintaining aggregate stats (volumes, counts, top tokens/entities)
 * - Tracking participant → entity edges for the graph
 *
 * @example
 * ```ts
 * class MyChainProvider implements DataProvider {
 *   readonly id = 'mychain';
 *   readonly name = 'My Chain';
 *   readonly chains = ['mychain'];
 *   readonly sourceConfig = { id: 'mychain', label: 'My Chain', color: '#ff0', icon: '⬡' };
 *   connect() { ... }
 *   disconnect() { ... }
 *   getStats() { ... }
 *   getConnections() { ... }
 *   onEvent(callback) { ... }
 * }
 *
 * registerProvider(new MyChainProvider());
 * ```
 */
export interface DataProvider {
  /** Unique identifier for this provider (matches source ID) */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Chain(s) this provider covers */
  readonly chains: string[];

  /** Source configuration (color, icon, description) for UI rendering */
  readonly sourceConfig: SourceConfig;

  /** Categories this provider emits */
  readonly categories: CategoryConfig[];

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

  /** Whether this provider is currently enabled (shown in the visualization) */
  isEnabled(): boolean;

  /** Enable or disable this provider */
  setEnabled(enabled: boolean): void;
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const providers = new Map<string, DataProvider>();
const registryListeners = new Set<() => void>();

/** Register a data provider */
export function registerProvider(provider: DataProvider): void {
  providers.set(provider.id, provider);
  registryListeners.forEach((fn) => fn());
}

/** Get a registered provider by ID */
export function getProvider(id: string): DataProvider | undefined {
  return providers.get(id);
}

/** Get all registered providers */
export function getAllProviders(): DataProvider[] {
  return Array.from(providers.values());
}

/** Get all enabled providers */
export function getEnabledProviders(): DataProvider[] {
  return Array.from(providers.values()).filter((p) => p.isEnabled());
}

/** Unregister a provider */
export function unregisterProvider(id: string): boolean {
  const result = providers.delete(id);
  if (result) registryListeners.forEach((fn) => fn());
  return result;
}

/** Subscribe to registry changes. Returns unsubscribe function. */
export function onRegistryChange(callback: () => void): () => void {
  registryListeners.add(callback);
  return () => registryListeners.delete(callback);
}

// ---------------------------------------------------------------------------
// Provider factory helper
// ---------------------------------------------------------------------------

export interface CreateProviderConfig {
  id: string;
  name: string;
  /** Chain(s) this provider covers */
  chains: string[];
  sourceConfig: SourceConfig;
  categories: CategoryConfig[];
  connect: () => void;
  disconnect: () => void;
  getStats: () => DataProviderStats;
  getConnections: () => ConnectionState[];
}

/** Helper to create a simple provider from a config object */
export function createProvider(config: CreateProviderConfig): DataProvider {
  const listeners = new Set<(event: DataProviderEvent) => void>();
  let paused = false;
  let enabled = true;

  return {
    id: config.id,
    name: config.name,
    chains: config.chains,
    sourceConfig: config.sourceConfig,
    categories: config.categories,
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
    isEnabled() {
      return enabled;
    },
    setEnabled(e) {
      enabled = e;
    },
  };
}
