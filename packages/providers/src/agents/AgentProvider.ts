import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  ConnectionState,
  CategoryConfig,
  SourceConfig,
  RawEvent,
} from '@web3viz/core';
import { getAllProviders, getCategoriesForSource, SOURCE_CONFIG_MAP } from '@web3viz/core';

import { AGENT_CATEGORIES } from './categories';
import { isAgentEvent, registerAgentAddress } from './detection';
import { AgentTracker } from './tracker';

// ============================================================================
// AI Agent Activity Data Provider (Meta-Provider)
//
// Tracks AI agent deployments and interactions across chains by:
// 1. Listening to events from other providers (PumpFun, ETH, Base)
// 2. Filtering/re-categorizing events that match agent heuristics
// 3. Polling REST APIs for additional agent data
//
// This provider does NOT connect its own WebSocket. It subscribes to
// other registered providers and re-emits matching events under its
// own agent-specific categories.
// ============================================================================

export interface AgentProviderOptions {
  /** Delay (ms) before subscribing to other providers (default 1000) */
  subscribeDelayMs?: number;
}

let idCounter = 0;

export class AgentProvider implements DataProvider {
  readonly id = 'agents';
  readonly name = 'AI Agents';
  readonly chains = ['solana', 'ethereum', 'base'];
  readonly sourceConfig: SourceConfig;
  readonly categories: CategoryConfig[];

  private eventListeners = new Set<(event: DataProviderEvent) => void>();
  private rawListeners = new Set<(event: RawEvent) => void>();
  private _paused = false;
  private _enabled = true;
  private _connected = false;

  private tracker: AgentTracker;
  private unsubscribers: (() => void)[] = [];
  private subscribeDelayMs: number;

  // Aggregate counters
  private stats: DataProviderStats = {
    counts: { agentDeploys: 0, agentInteractions: 0 },
    totalVolume: {},
    totalTransactions: 0,
    totalAgents: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
    rawEvents: [],
  };

  // Track unique agents seen (address → { name, interactions })
  private knownAgents = new Map<string, { name: string; interactions: number }>();

  // Track edges: key "interactor:agentAddress" → trade count
  private edgeMap = new Map<string, { trader: string; agentAddress: string; count: number }>();

  constructor(options: AgentProviderOptions = {}) {
    this.subscribeDelayMs = options.subscribeDelayMs ?? 1000;

    this.sourceConfig = SOURCE_CONFIG_MAP['agents'] ?? {
      id: 'agents',
      label: 'AI Agents',
      color: '#f472b6',
      icon: '\u2B23',
      description: 'Autonomous AI agent activity',
    };

    // Use built-in categories for agents source, merged with our deploy/interaction categories
    const builtIn = getCategoriesForSource('agents');
    const builtInIds = new Set(builtIn.map((c) => c.id));
    const extra = AGENT_CATEGORIES.filter((c) => !builtInIds.has(c.id));
    this.categories = [...builtIn, ...extra];

    this.tracker = new AgentTracker({
      onEvent: (event) => this.handleEvent(event),
    });
  }

  connect(): void {
    if (this._connected) return;
    this._connected = true;

    // Subscribe to all OTHER providers' events after a short delay
    // to let other providers register first (import order dependency)
    setTimeout(() => {
      const providers = getAllProviders();
      for (const p of providers) {
        if (p.id === this.id) continue;
        const unsub = p.onEvent((event) => {
          if (this._paused || !this._enabled) return;
          this.classifyEvent(event);
        });
        this.unsubscribers.push(unsub);
      }
    }, this.subscribeDelayMs);

    // Start REST API polling for additional agent data
    this.tracker.start();
  }

  disconnect(): void {
    this._connected = false;
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.tracker.stop();
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
    return { ...this.stats };
  }

  getConnections(): ConnectionState[] {
    return [
      { name: 'Agent Tracker', connected: this._connected },
    ];
  }

  onEvent(listener: (event: DataProviderEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => { this.eventListeners.delete(listener); };
  }

  onRawEvent(listener: (event: RawEvent) => void): () => void {
    this.rawListeners.add(listener);
    return () => { this.rawListeners.delete(listener); };
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private emit(event: DataProviderEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }

  /**
   * Classify an event from another provider. If it matches agent heuristics,
   * re-emit it as an agent event under the appropriate category.
   */
  private classifyEvent(event: DataProviderEvent): void {
    if (!isAgentEvent(event)) return;

    const isLaunch =
      event.category.includes('launch') ||
      event.category.includes('Launch') ||
      event.category.includes('Mint') ||
      event.category.includes('mint');

    // Register this address so future events from it are also detected
    if (event.address) {
      registerAgentAddress(event.address);
    }

    const agentEvent: DataProviderEvent = {
      ...event,
      id: `agent-${event.id}`,
      providerId: 'agents',
      category: isLaunch ? 'agentDeploys' : 'agentInteractions',
    };

    this.handleEvent(agentEvent);
  }

  private handleEvent(event: DataProviderEvent): void {
    if (this._paused || !this._enabled) return;

    this.stats.counts[event.category] = (this.stats.counts[event.category] || 0) + 1;
    this.stats.totalTransactions++;

    if (event.address) {
      const existing = this.knownAgents.get(event.address);
      if (existing) {
        existing.interactions++;
      } else {
        this.knownAgents.set(event.address, {
          name: this.extractAgentName(event),
          interactions: 1,
        });
      }
      this.stats.totalAgents = this.knownAgents.size;

      // Track interaction edges (use the original event's source address or category as the "trader")
      const interactorId = event.meta?.trader as string
        || event.meta?.wallet as string
        || event.category;
      const edgeKey = `${interactorId}:${event.address}`;
      const edge = this.edgeMap.get(edgeKey);
      if (edge) {
        edge.count++;
      } else {
        this.edgeMap.set(edgeKey, { trader: interactorId, agentAddress: event.address, count: 1 });
      }

      // Rebuild topTokens and traderEdges from tracked data
      this.rebuildGraphData();
    }

    this.stats.recentEvents = [event, ...this.stats.recentEvents].slice(0, 300);

    this.emit(event);
  }

  private extractAgentName(event: DataProviderEvent): string {
    // Try to extract a meaningful name from the event label
    const label = event.label || '';
    // Look for token name patterns like "AGENTNAME: ..." or quoted names
    const colonIdx = label.indexOf(':');
    if (colonIdx > 0 && colonIdx < 30) return label.slice(0, colonIdx).trim();
    // Fallback: use truncated address
    return event.address?.slice(0, 8) || 'Agent';
  }

  private rebuildGraphData(): void {
    const AGENT_PALETTE = ['#c084fc', '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#fb923c', '#a78bfa', '#22d3ee'];

    // Build topTokens from known agents (top 8 by interaction count)
    const sorted = Array.from(this.knownAgents.entries())
      .sort((a, b) => b[1].interactions - a[1].interactions)
      .slice(0, 8);

    this.stats.topTokens = sorted.map(([address, data]) => ({
      tokenAddress: address,
      mint: address,
      symbol: data.name,
      name: data.name,
      chain: 'agents',
      trades: data.interactions,
      volume: data.interactions,
      volumeSol: data.interactions,
      nativeSymbol: 'TASKS',
      source: 'agents',
    }));

    // Build traderEdges from edge map (only for agents that are in topTokens)
    const topAddresses = new Set(sorted.map(([addr]) => addr));
    this.stats.traderEdges = Array.from(this.edgeMap.values())
      .filter((e) => topAddresses.has(e.agentAddress))
      .map((e) => ({
        trader: e.trader,
        tokenAddress: e.agentAddress,
        mint: e.agentAddress,
        chain: 'agents',
        trades: e.count,
        volume: e.count,
        volumeSol: e.count,
        source: 'agents',
      }));
  }
}
