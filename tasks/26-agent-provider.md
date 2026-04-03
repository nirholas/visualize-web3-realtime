# Task 26: AI Agent Activity Data Provider

## Goal
Create a data provider that tracks AI agent deployments and interactions across chains. This includes autonomous trading agents, on-chain AI agents (like those on Virtuals Protocol, ai16z/ELIZA, etc.), and agent-related token activity.

## Prerequisites
- Tasks 21-23 must be complete

## Architecture

### Data Sources

AI agent activity can be detected from multiple sources:

**1. Virtuals Protocol (Base chain)**
- Virtuals is the largest AI agent launchpad on Base
- Contract: `0x44...` (Virtuals factory — look up current address)
- Monitor for agent token launches and interactions
- WebSocket: Reuse the Base EVM WebSocket from Task 25 or subscribe separately

**2. Heuristic Detection from Existing Providers**
- PumpFun already detects agent launches via keyword matching (`AGENT_KEYWORDS` regex)
- Extend this to Ethereum and Base token launches
- Monitor for known agent framework signatures in token metadata

**3. Known Agent Wallet Tracking**
- Maintain a list of known AI agent wallet addresses
- Track their on-chain activity (trades, transfers, contract interactions)
- Source: Can be loaded from a static list or fetched from an API

**4. REST API Polling (for data not available via WebSocket)**
- Poll known agent tracking APIs every 30-60 seconds
- E.g., cookie.fun API, Virtuals API, or custom aggregators

### Event Categories

| Category ID | Label | Icon | Color | Source |
|---|---|---|---|---|
| `agentDeploys` | Agent Deploys | 🤖 | `#E040FB` (magenta) | New AI agent token/contract launches |
| `agentInteractions` | Agent Actions | ⚡ | `#AA00FF` (deep purple) | Agent wallet transactions, trades |

### Agent Detection Heuristics

```typescript
const AGENT_KEYWORDS = /\b(agent|ai\b|gpt|bot|auto|llm|claude|openai|chatgpt|neural|sentient|autonomous|virtuals|eliza|ai16z|degen\s*ai|smart\s*agent)\b/i;

const AGENT_FRAMEWORKS = [
  'virtuals',
  'eliza',
  'ai16z',
  'autonolas',
  'fetch.ai',
  'singularitynet',
  'ocean',
];

// Known AI agent contract addresses (cross-chain)
const KNOWN_AGENT_CONTRACTS: Record<string, { name: string; chain: string }> = {
  // Virtuals Protocol on Base
  // ai16z contracts on Solana
  // Add known addresses as they're discovered
};
```

## Files to Create

### 1. `providers/agents/index.ts`

```typescript
/**
 * AI Agent Activity Data Provider
 *
 * Tracks AI agent deployments and interactions across chains by:
 * 1. Monitoring token launches with agent-related keywords/metadata
 * 2. Tracking known agent wallet addresses
 * 3. Polling agent tracking APIs
 *
 * This provider does NOT connect its own WebSocket to a chain.
 * Instead, it:
 * - Listens to events from other providers (PumpFun, ETH, Base) via the registry
 * - Filters/re-categorizes events that match agent heuristics
 * - Adds its own data from REST API polling
 *
 * Self-registers with @web3viz/core on import.
 */

import {
  registerProvider,
  getAllProviders,
  type DataProvider,
  type DataProviderEvent,
  type DataProviderStats,
  type ConnectionState,
  type CategoryConfig,
  type TopToken,
  type TraderEdge,
  type RawEvent,
} from '@web3viz/core';

import { AGENT_CATEGORIES } from './categories';
import { isAgentEvent, isAgentToken } from './detection';
import { AgentTracker } from './tracker';

class AgentProvider implements DataProvider {
  readonly id = 'agents';
  readonly name = 'AI Agents';
  readonly chains = ['solana', 'ethereum', 'base']; // cross-chain
  readonly categories: CategoryConfig[] = AGENT_CATEGORIES;

  private listeners = new Set<(event: DataProviderEvent) => void>();
  private paused = false;
  private tracker: AgentTracker;
  private unsubscribers: (() => void)[] = [];
  private connected_ = false;

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

  // Track unique agents seen
  private knownAgents = new Set<string>();

  constructor() {
    this.tracker = new AgentTracker({
      onEvent: (event) => this.handleEvent(event),
    });
  }

  connect(): void {
    this.connected_ = true;

    // Listen to all OTHER providers' events and filter for agent activity
    // Use a short delay to let other providers register first
    setTimeout(() => {
      const providers = getAllProviders();
      for (const p of providers) {
        if (p.id === this.id) continue; // don't listen to ourselves
        const unsub = p.onEvent((event) => {
          if (this.paused) return;
          this.classifyEvent(event);
        });
        this.unsubscribers.push(unsub);
      }
    }, 1000);

    // Start REST API polling for additional agent data
    this.tracker.start();
  }

  disconnect(): void {
    this.connected_ = false;
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.tracker.stop();
  }

  getStats(): DataProviderStats { return { ...this.stats }; }

  getConnections(): ConnectionState[] {
    return [{ name: 'Agent Tracker', connected: this.connected_ }];
  }

  onEvent(callback: (event: DataProviderEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  setPaused(paused: boolean): void { this.paused = paused; }
  isPaused(): boolean { return this.paused; }

  private classifyEvent(event: DataProviderEvent): void {
    // Check if this event is agent-related
    if (isAgentEvent(event)) {
      const agentEvent: DataProviderEvent = {
        ...event,
        id: `agent-${event.id}`,
        providerId: 'agents',
        category: event.category.includes('launch') || event.category.includes('Mint')
          ? 'agentDeploys'
          : 'agentInteractions',
      };
      this.handleEvent(agentEvent);
    }
  }

  private handleEvent(event: DataProviderEvent): void {
    if (this.paused) return;

    this.stats.counts[event.category] = (this.stats.counts[event.category] || 0) + 1;
    this.stats.totalTransactions++;

    if (event.address) {
      this.knownAgents.add(event.address);
      this.stats.totalAgents = this.knownAgents.size;
    }

    this.stats.recentEvents = [event, ...this.stats.recentEvents].slice(0, 300);

    for (const listener of this.listeners) listener(event);
  }
}

const provider = new AgentProvider();
registerProvider(provider);
export { provider as agentProvider };
```

### 2. `providers/agents/categories.ts`

```typescript
import type { CategoryConfig } from '@web3viz/core';

export const AGENT_CATEGORIES: CategoryConfig[] = [
  { id: 'agentDeploys',      label: 'Agent Deploys',  icon: '🤖', color: '#E040FB' },
  { id: 'agentInteractions', label: 'Agent Actions',   icon: '⚡', color: '#AA00FF' },
];
```

### 3. `providers/agents/detection.ts`

Agent detection heuristics:

```typescript
import type { DataProviderEvent } from '@web3viz/core';

const AGENT_KEYWORDS = /\b(agent|ai\b|gpt|bot|auto|llm|claude|openai|chatgpt|neural|sentient|autonomous|virtuals|eliza|ai16z|degenai|smart\s*agent|olas|fetch\.ai|singularity|ocean\s*protocol)\b/i;

const KNOWN_AGENT_ADDRESSES = new Set<string>([
  // Add known agent wallet addresses here
  // These get populated at runtime from the tracker
]);

/** Check if a DataProviderEvent looks like agent activity */
export function isAgentEvent(event: DataProviderEvent): boolean {
  // Check label for agent keywords
  if (AGENT_KEYWORDS.test(event.label)) return true;

  // Check if the address is a known agent
  if (KNOWN_AGENT_ADDRESSES.has(event.address)) return true;

  // Check metadata
  if (event.meta) {
    const metaStr = JSON.stringify(event.meta);
    if (AGENT_KEYWORDS.test(metaStr)) return true;
  }

  return false;
}

/** Check if a token name/symbol indicates an AI agent */
export function isAgentToken(name: string, symbol: string): boolean {
  return AGENT_KEYWORDS.test(name) || AGENT_KEYWORDS.test(symbol);
}

/** Register a known agent address for future detection */
export function registerAgentAddress(address: string): void {
  KNOWN_AGENT_ADDRESSES.add(address);
}
```

### 4. `providers/agents/tracker.ts`

REST API polling for agent data:

```typescript
interface TrackerConfig {
  onEvent: (event: DataProviderEvent) => void;
}

export class AgentTracker {
  private config: TrackerConfig;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(config: TrackerConfig) {
    this.config = config;
  }

  start(): void {
    // Poll every 60 seconds for new agent data
    // This is a placeholder — implement actual API calls when endpoints are available
    this.interval = setInterval(() => {
      this.poll();
    }, 60_000);

    // Initial poll
    this.poll();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async poll(): Promise<void> {
    // TODO: Implement actual API polling
    // Possible sources:
    // - cookie.fun API for agent rankings
    // - Virtuals Protocol API for new agent launches
    // - Custom indexer for agent wallet activity
    //
    // For now, this is a no-op. The agent provider primarily works by
    // filtering events from other providers via the detection heuristics.
  }
}
```

## Update `providers/index.ts`

```typescript
import './solana-pumpfun';
import './ethereum';
import './base';
import './agents';
```

**Important**: The agents provider MUST be imported AFTER the chain providers, because it listens to their events.

## Verification

1. Start dev server
2. Open `/world`
3. Agent Tracker shows as connected
4. When PumpFun emits a token with "AI" or "agent" in the name, it should also appear as an `agentDeploys` event
5. Agent categories appear in the filter sidebar with magenta/purple colors
6. Stats show agent count

## Important Notes
- This provider is a **meta-provider** — it primarily re-classifies events from other providers rather than connecting to its own data source.
- The `isAgentEvent` heuristic will have false positives. That's acceptable for visualization purposes.
- The REST polling tracker is a placeholder. It should be expanded when specific agent tracking APIs are identified.
- Agent events are emitted IN ADDITION to the original event (a PumpFun agent launch shows as both `agentLaunches` from PumpFun and `agentDeploys` from the agent provider). The UI deduplicates by `id` prefix.
- The `setTimeout` in `connect()` is necessary because providers register in import order — we need other providers to be registered before we subscribe to their events.
