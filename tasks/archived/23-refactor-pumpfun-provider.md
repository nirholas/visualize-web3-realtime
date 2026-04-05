# Task 23: Extract PumpFun into a Standalone DataProvider Plugin

## Goal
Refactor the existing PumpFun WebSocket logic (currently in `hooks/usePumpFun.ts` and `hooks/usePumpFunClaims.ts`) into a proper `DataProvider` implementation that self-registers with the `@web3viz/core` registry. After this task, PumpFun data should flow through the generic provider system and the app should be fully functional again.

## Prerequisites
- Task 21 (generalized core types) must be complete
- Task 22 (provider registry hook) must be complete

## Context

### Current State
- `hooks/usePumpFun.ts` — React hook with WebSocket connection to `wss://pumpportal.fun/api/data`
- `hooks/usePumpFunClaims.ts` — React hook with WebSocket connection to Solana RPC for claim events
- Both are React hooks (use `useState`, `useEffect`, etc.) — tightly coupled to React lifecycle
- `hooks/useDataProvider.ts` previously imported both directly

### Target State
- `providers/solana-pumpfun/index.ts` — Self-registering DataProvider class (NOT a React hook)
- Pure TypeScript class that manages its own WebSocket connections
- Emits events via the `onEvent` callback system from the DataProvider interface
- Registers itself and its categories with the `@web3viz/core` registry on import
- `providers/index.ts` imports it to trigger registration

## Files to Create

### 1. `providers/solana-pumpfun/index.ts`

```typescript
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
  type CategoryConfig,
  type TopToken,
  type TraderEdge,
  type RawEvent,
} from '@web3viz/core';

import { PUMPFUN_CATEGORIES } from './categories';
import { PumpFunWebSocket } from './pumpfun-ws';
import { SolanaClaimsWebSocket } from './claims-ws';

class PumpFunProvider implements DataProvider {
  readonly id = 'solana-pumpfun';
  readonly name = 'Solana (PumpFun)';
  readonly chains = ['solana'];
  readonly categories: CategoryConfig[] = PUMPFUN_CATEGORIES;

  private listeners = new Set<(event: DataProviderEvent) => void>();
  private rawListeners = new Set<(event: RawEvent) => void>();
  private paused = false;
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

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private handleEvent(event: DataProviderEvent): void {
    if (this.paused) return;

    // Update counts
    this.stats.counts[event.category] = (this.stats.counts[event.category] || 0) + 1;

    // Update volume
    if (event.amount) {
      this.stats.totalVolume.solana = (this.stats.totalVolume.solana || 0) + event.amount;
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
  updateTopTokens(tokens: TopToken[], edges: TraderEdge[]): void {
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
```

### 2. `providers/solana-pumpfun/categories.ts`

```typescript
import type { CategoryConfig } from '@web3viz/core';

export const PUMPFUN_CATEGORIES: CategoryConfig[] = [
  { id: 'launches',      label: 'Launches',        icon: '⚡', color: '#a78bfa' },
  { id: 'agentLaunches', label: 'Agent Launches',   icon: '⬡',  color: '#f472b6' },
  { id: 'trades',        label: 'Trades',           icon: '▲',  color: '#60a5fa' },
  { id: 'claimsWallet',  label: 'Wallet Claims',    icon: '◆',  color: '#fbbf24' },
  { id: 'claimsGithub',  label: 'GitHub Claims',    icon: '⬢',  color: '#34d399' },
  { id: 'claimsFirst',   label: 'First Claims',     icon: '★',  color: '#f87171' },
];
```

### 3. `providers/solana-pumpfun/pumpfun-ws.ts`

Extract the WebSocket logic from `hooks/usePumpFun.ts` into a plain TypeScript class (no React). This class:

- Connects to `wss://pumpportal.fun/api/data`
- Subscribes to `subscribeNewToken` and `subscribeTokenTrade`
- Parses incoming messages into `DataProviderEvent` objects
- Maintains token cache, top tokens accumulator, trader edge accumulator
- Calls `onEvent` callback for each parsed event
- Calls `onRawEvent` for raw token create/trade events
- Calls a method on the parent provider to update topTokens/traderEdges
- Auto-reconnects on disconnect (3s delay)

Key differences from the current hook:
- No `useState` / `useEffect` — pure class with manual WebSocket management
- Events use generalized types: `tokenAddress` not `mint`, `volume` not `volumeSol`
- `DataProviderEvent.providerId` = `'solana-pumpfun'`
- `DataProviderEvent.chain` = `'solana'`
- `DataProviderEvent.nativeSymbol` = `'SOL'`
- Agent detection logic stays the same (AGENT_KEYWORDS regex)

```typescript
interface PumpFunWSConfig {
  onEvent: (event: DataProviderEvent) => void;
  onRawEvent: (raw: RawEvent) => void;
  isPaused: () => boolean;
  onTopTokensChanged?: (tokens: TopToken[], edges: TraderEdge[]) => void;
}
```

### 4. `providers/solana-pumpfun/claims-ws.ts`

Extract the WebSocket logic from `hooks/usePumpFunClaims.ts` into a plain TypeScript class. This class:

- Connects to Solana RPC WebSocket (`process.env.NEXT_PUBLIC_SOLANA_WS_URL` or fallback)
- Subscribes to `logsSubscribe` for each PumpFun program ID
- Parses claim events using the discriminator logic
- Emits `DataProviderEvent` for each claim
- Same program IDs and discriminators as the current hook
- Auto-reconnects on disconnect (5s delay)

```typescript
interface ClaimsWSConfig {
  onEvent: (event: DataProviderEvent) => void;
  isPaused: () => boolean;
}
```

### 5. Update `providers/index.ts`

Uncomment the PumpFun import:

```typescript
import './solana-pumpfun';
// import './ethereum';
// etc.
```

## Files to Delete (or Mark Deprecated)

After verifying the app works:
- `hooks/usePumpFun.ts` — logic moved to `providers/solana-pumpfun/pumpfun-ws.ts`
- `hooks/usePumpFunClaims.ts` — logic moved to `providers/solana-pumpfun/claims-ws.ts`

If other code still imports types from these files, keep them as re-exports from `@web3viz/core` temporarily, or update the imports.

## Verification

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3100/world`
3. Verify:
   - PumpFun connection indicator shows green
   - Solana Claims connection indicator shows green
   - Live feed shows token launches and trades
   - Force graph renders hub nodes and agent connections
   - Stats bar shows volume, transaction counts
   - Category filter sidebar works
   - All existing functionality is preserved

## Important Notes
- This is a **refactor**, not a rewrite. The WebSocket logic, parsing, reconnection, agent detection — all stay the same. We're just moving it from React hooks to plain classes.
- The provider class must work outside React (no hooks, no JSX).
- The provider self-registers by calling `registerProvider()` at module scope when imported.
- Use `process.env.NEXT_PUBLIC_SOLANA_WS_URL` for the Solana WebSocket URL (set in `.env.local` from earlier).
- The `pumpfun-ws.ts` needs to call back to the provider to update `topTokens` and `traderEdges` — pass a callback or reference.
