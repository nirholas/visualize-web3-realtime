# Data Providers

This document provides a comprehensive guide to the data provider system in this project. It explains how to use the existing providers and how to create your own custom providers to stream data from any source.

---

## Overview

The data provider system is the heart of the real-time visualization platform. It's a modular and extensible system for fetching data from various sources and feeding it to the visualization components.

The core of the system is the **`@web3viz/providers`** package, which contains the `DataProvider` interface, the `useProviders` hook, and a set of built-in providers for common Web3 and AI agent data sources.

---

## Built-in Providers

### PumpFunProvider (Solana)

Real-time Solana token launches and trades via PumpPortal WebSocket.

- **WebSocket:** `wss://pumpportal.fun/api/data` (no authentication required)
- **Categories:** launches, agentLaunches, trades, bondingCurve, whales, snipers, claimsWallet, claimsGithub, claimsFirst
- **Agent detection keywords:** agent, ai, gpt, bot, llm, claude, openai, chatgpt, neural, sentient, autonomous
- **Whale detection:** Large volume threshold
- **Sniper detection:** Fast buys post-launch
- **Caches:** Token cache (10K), token accumulator (10K), trader accumulator (50K), seen wallets (50K)
- **Max events:** 300 default, max top tokens: 8 default

### EthereumProvider (Ethereum Mainnet)

Real-time Uniswap V2/V3 swaps, ERC-20 transfers, and token mints.

- **WebSocket:** Configurable RPC URL (Alchemy, Infura, or public node)
- **Categories:** ethSwaps, ethTransfers, ethMints
- **Topics monitored:** Swap, Mint, Transfer event signatures
- **Uniswap routers:** V2 (`0xd9e1ce17...`) and V3 (`0x68b34658...`)
- **Caches:** Token accumulator (10K), trader accumulator (50K)
- **Max events:** 300 default

### CexVolumeProvider (Binance)

Centralized exchange spot trades and futures liquidations.

- **WebSocket:** Binance public WebSocket (no API key required)
- **Monitored pairs:** btcusdt, ethusdt, solusdt, bnbusdt, xrpusdt, dogeusdt, adausdt, avaxusdt, dotusdt, linkusdt
- **Categories:** cexSpotTrades (minimum $50K USD filter), cexLiquidations
- **Caches:** Symbol accumulator (5K)

### AgentProvider (Multi-chain Meta-provider)

Detects AI agent activity across all other providers + cookie.fun API polling.

- **Detection:** 15+ framework keywords (Virtuals, ELIZA, AI16Z, DegeneAI, Olas, Fetch.ai, Singularity, Ocean Protocol, etc.)
- **Categories:** agentDeploys, agentInteractions, agentSpawn, agentTask, toolCall, subagentSpawn, reasoning, taskComplete, taskFailed
- **Data sources:** Listens to PumpFun, Ethereum, Base, CEX providers. Polls cookie.fun API for top agent rankings.
- **Caches:** Known agents (5K), edge map (50K)

### MockProvider (Synthetic)

Generates random events for development and testing. Configurable event rate. Supports all category types.

### CustomStreamProvider (User-defined)

User-defined data streams via callback interface. Supports HTTP webhook, WebSocket, Server-Sent Events (SSE), and custom fetch.

## Using Providers

The `useProviders` hook manages provider lifecycle and aggregates data:

```tsx
import { useProviders } from '@web3viz/providers';
import { EthereumProvider } from '@web3viz/providers/ethereum';

function MyComponent() {
  const providers = [new EthereumProvider()];
  const { events, stats } = useProviders(providers);

  //... render your component with the real-time data
}
```

The hook automatically connects, disconnects, buffers events (100ms windows), merges stats, and filters by category.

---

## Building a Custom Provider

You can easily create your own custom providers to stream data from any source. A provider is simply a class that implements the `DataProvider` interface from `@web3viz/core`.

### Quick Start: The `createProvider` Factory

For simple use cases, you can use the `createProvider` factory to create a provider from a simple object.

```typescript
import { createProvider, registerProvider } from '@web3viz/core';

const myProvider = createProvider({
  id: 'my-provider',
  label: 'My Custom Provider',
  connect: (emit) => {
    //... connect to your data source and emit events
  },
});

registerProvider(myProvider);
```

### Full Implementation: The `DataProvider` Class

For more complex providers with custom logic and stats tracking, you can implement the `DataProvider` interface directly.

```typescript
import type { DataProvider, DataProviderEvent } from '@web3viz/core';

export class MyCustomProvider implements DataProvider {
  //... implement the required properties and methods
}
```

A full implementation will give you complete control over the provider's lifecycle, state management, and data normalization.

---

## Complete Example

Here is a complete example of how to create a custom provider and use it in a React component.

**1. Create the Provider:**

```typescript
// src/providers/MyCustomProvider.ts
import { createProvider } from '@web3viz/core';

export const MyCustomProvider = createProvider({
  //... your provider implementation
});
```

**2. Use the Provider in a Component:**

```tsx
// src/components/MyComponent.tsx
import { useProviders } from '@web3viz/providers';
import { MyCustomProvider } from '../providers/MyCustomProvider';

function MyComponent() {
  const providers = [new MyCustomProvider()];
  const { events, stats } = useProviders(providers);

  //... render your component with the real-time data
}
```

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
