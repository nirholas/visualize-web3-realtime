# Building a Custom Provider

This guide walks you through creating a data provider from scratch. By the end, your streaming data source will be rendering as a live 3D force graph.

---

## Overview

A provider is any class that implements the `DataProvider` interface from `@web3viz/core`. It:

1. **Connects** to a data source (WebSocket, REST polling, SSE, etc.)
2. **Normalizes** raw events into `DataProviderEvent` objects
3. **Tracks** statistics (counts, volumes, top entities, edges)
4. **Emits** events to subscribers

The rest of the system — ForceGraph, StatsBar, LiveFeed, FilterSidebar — reacts automatically.

---

## Quick Start: Factory Helper

For simple providers, use `createProvider()`:

```typescript
import { createProvider, registerProvider } from '@web3viz/core';

const myProvider = createProvider({
  id: 'github-events',
  label: 'GitHub Events',
  connect: (emit) => {
    const es = new EventSource('https://api.github.com/events');
    es.onmessage = (msg) => {
      const event = JSON.parse(msg.data);
      emit({
        id: event.id,
        providerId: 'github-events',
        category: event.type === 'PushEvent' ? 'pushes' : 'other',
        chain: 'github',
        timestamp: Date.now(),
        label: `${event.actor.login} → ${event.repo.name}`,
        amount: 1,
        address: event.actor.login,
        tokenAddress: event.repo.name,
      });
    };
    return () => es.close(); // cleanup function
  },
});

registerProvider(myProvider);
```

This gives you a working provider with built-in event subscription, pause/resume, and enable/disable.

---

## Full Implementation: Class-Based

For production providers with stats tracking, implement the full interface:

```typescript
import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  CategoryConfig,
  SourceConfig,
  ConnectionState,
  RawEvent,
} from '@web3viz/core';

export class UniswapProvider implements DataProvider {
  // --- Identity ---
  readonly id = 'uniswap';
  readonly name = 'Uniswap V3';
  readonly chains = ['ethereum'];

  // --- UI metadata ---
  readonly sourceConfig: SourceConfig = {
    id: 'ethereum',
    label: 'Ethereum',
    color: '#627EEA',
    icon: '⬡',
  };

  // --- Categories this provider emits ---
  readonly categories: CategoryConfig[] = [
    { id: 'swaps', label: 'Swaps', icon: '⇄', color: '#627EEA', sourceId: 'ethereum' },
    { id: 'liquidity', label: 'LP Events', icon: '◈', color: '#8799EE', sourceId: 'ethereum' },
  ];

  // --- Internal state ---
  private ws: WebSocket | null = null;
  private listeners = new Set<(e: DataProviderEvent) => void>();
  private rawListeners = new Set<(e: RawEvent) => void>();
  private paused = false;
  private enabled = true;
  private counts: Record<string, number> = { swaps: 0, liquidity: 0 };
  private totalVolume = 0;
  private recentEvents: DataProviderEvent[] = [];
  private tokenVolumes = new Map<string, { symbol: string; volume: number; trades: number }>();
  private traderEdges = new Map<string, { trader: string; token: string; volume: number; trades: number }>();

  // --- Lifecycle ---

  connect(): void {
    this.ws = new WebSocket('wss://your-indexer.example.com/uniswap/stream');

    this.ws.onmessage = (msg) => {
      if (this.paused) return;

      const raw = JSON.parse(msg.data);
      this.handleSwap(raw);
    };

    this.ws.onerror = (err) => console.error('[UniswapProvider] WS error:', err);
    this.ws.onclose = () => console.log('[UniswapProvider] WS closed');
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  // --- Event processing ---

  private handleSwap(raw: any): void {
    const category = raw.type === 'swap' ? 'swaps' : 'liquidity';
    const event: DataProviderEvent = {
      id: raw.txHash,
      providerId: this.id,
      category,
      chain: 'ethereum',
      timestamp: Date.now(),
      label: `${raw.tokenIn} → ${raw.tokenOut}`,
      amount: raw.amountUSD,
      address: raw.sender,
      tokenAddress: raw.pool,
    };

    // Update stats
    this.counts[category] = (this.counts[category] || 0) + 1;
    this.totalVolume += raw.amountUSD;
    this.recentEvents = [event, ...this.recentEvents].slice(0, 300);

    // Track top tokens
    const tv = this.tokenVolumes.get(raw.pool) || { symbol: raw.tokenOut, volume: 0, trades: 0 };
    tv.volume += raw.amountUSD;
    tv.trades += 1;
    this.tokenVolumes.set(raw.pool, tv);

    // Track trader edges
    const edgeKey = `${raw.sender}:${raw.pool}`;
    const edge = this.traderEdges.get(edgeKey) || { trader: raw.sender, token: raw.pool, volume: 0, trades: 0 };
    edge.volume += raw.amountUSD;
    edge.trades += 1;
    this.traderEdges.set(edgeKey, edge);

    // Emit to subscribers
    this.listeners.forEach((cb) => cb(event));
    this.rawListeners.forEach((cb) => cb({ type: 'trade', data: raw }));
  }

  // --- Subscriptions ---

  onEvent(callback: (event: DataProviderEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onRawEvent(callback: (event: RawEvent) => void): () => void {
    this.rawListeners.add(callback);
    return () => this.rawListeners.delete(callback);
  }

  // --- Stats ---

  getStats(): DataProviderStats {
    const topTokens = [...this.tokenVolumes.entries()]
      .sort((a, b) => b[1].volume - a[1].volume)
      .slice(0, 8)
      .map(([address, { symbol, volume, trades }]) => ({
        tokenAddress: address,
        symbol,
        name: symbol,
        chain: 'ethereum',
        trades,
        volume,
        nativeSymbol: 'ETH',
      }));

    const traderEdges = [...this.traderEdges.values()].map((e) => ({
      trader: e.trader,
      tokenAddress: e.token,
      chain: 'ethereum',
      trades: e.trades,
      volume: e.volume,
    }));

    return {
      counts: this.counts,
      totalVolume: { ethereum: this.totalVolume },
      topTokens,
      traderEdges,
      recentEvents: this.recentEvents,
      rawEvents: [],
    };
  }

  getConnections(): ConnectionState[] {
    return [{
      id: 'uniswap-ws',
      label: 'Uniswap Indexer',
      status: this.ws?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
    }];
  }

  // --- State ---

  setPaused(paused: boolean): void { this.paused = paused; }
  isPaused(): boolean { return this.paused; }
  isEnabled(): boolean { return this.enabled; }
  setEnabled(enabled: boolean): void { this.enabled = enabled; }
}
```

---

## Registering Your Provider

### Option A: Global registry

```typescript
import { registerProvider } from '@web3viz/core';

registerProvider(new UniswapProvider());
```

Any component using `useProviders()` will discover it automatically.

### Option B: Pass directly to the hook

```typescript
import { useProviders } from '@web3viz/providers';

const { stats, filteredEvents } = useProviders({
  providers: [new UniswapProvider(), new MockProvider()],
  maxEvents: 300,
  startEnabled: true,
});
```

---

## Key Types Reference

### DataProviderEvent

The unified event format every provider must emit:

```typescript
interface DataProviderEvent {
  id: string;              // Unique event ID (tx hash, uuid, etc.)
  providerId: string;      // Must match your provider's `id`
  category: string;        // Must be one of your declared category IDs
  chain: string;           // Chain/source identifier
  timestamp: number;       // Unix timestamp (ms)
  label: string;           // Display text (token symbol, description)
  amount: number;          // Numeric value (volume, count, etc.)
  address: string;         // Participant address (becomes agent node)
  tokenAddress: string;    // Entity address (becomes hub node)
  metadata?: Record<string, unknown>; // Optional extra data
}
```

### How Events Map to the Graph

| Event field | Graph element |
|---|---|
| `tokenAddress` | **Hub node** — top entities cluster as large central spheres |
| `address` | **Agent node** — participants orbit around their hub |
| `amount` | **Hub radius** — higher volume = larger hub |
| `category` | **Color** — each category has a distinct color |

The `useProviders()` hook aggregates events into `topTokens` (top 8 by volume) and `traderEdges` (all address→token connections), which feed directly into `<ForceGraph>`.

### CategoryConfig

```typescript
interface CategoryConfig {
  id: string;        // Unique category ID
  label: string;     // UI display label
  icon: string;      // Unicode icon (monospace-safe)
  color: string;     // Hex color for visualization
  sourceId?: string; // Restrict to specific provider
}
```

### SourceConfig

```typescript
interface SourceConfig {
  id: string;     // Unique source ID
  label: string;  // UI display label
  color: string;  // Brand color
  icon: string;   // Unicode icon
}
```

---

## Tips

### Use BoundedMap for caches

Streaming data is unbounded. Use `BoundedMap` / `BoundedSet` from `@web3viz/providers` to cap memory:

```typescript
import { BoundedMap } from '@web3viz/providers';

const cache = new BoundedMap<string, TokenData>(1000); // max 1000 entries
cache.set(address, data); // oldest evicted when full
```

### Handle reconnection

WebSockets drop. Implement exponential backoff:

```typescript
private reconnectDelay = 1000;

private scheduleReconnect(): void {
  setTimeout(() => {
    this.connect();
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }, this.reconnectDelay);
}
```

### Respect the pause state

Always check `this.paused` before emitting events. Paused providers should keep WebSocket connections open but stop emitting.

### Keep stats cheap

`getStats()` is called frequently. Pre-compute top tokens and trader edges incrementally rather than sorting on every call.

---

## Testing Your Provider

Use the playground with your provider:

```typescript
// apps/playground/app/page.tsx
import { UniswapProvider } from './UniswapProvider';

const providers = [new UniswapProvider()];

export default function Page() {
  const { stats, filteredEvents } = useProviders({ providers });
  return <ForceGraph topTokens={stats.topTokens} traderEdges={stats.traderEdges} />;
}
```

Or use MockProvider as a reference implementation — it demonstrates every aspect of the interface in ~300 lines.
