# Ethereum Mainnet Data Provider

## File Information

| Property | Value |
|----------|-------|
| **File Path** | `providers/ethereum/index.ts` |
| **Purpose** | Implements the `DataProvider` interface for Ethereum mainnet, streaming Uniswap V2/V3 swap events, large ERC-20 transfers, and token mints in real time |
| **Directive** | `'use client'` -- client-side module for Next.js App Router |
| **Pattern** | Self-registering provider (calls `registerProvider()` at module level) |
| **Chain** | Ethereum Mainnet |

---

## Module Dependencies

### External Imports

| Import | Source | Type | Description |
|--------|--------|------|-------------|
| `registerProvider` | `@web3viz/core` | Function | Registers a `DataProvider` instance into the global provider registry |
| `DataProvider` | `@web3viz/core` | Interface (type-only) | Contract that all providers must implement |
| `DataProviderEvent` | `@web3viz/core` | Interface (type-only) | Normalized event structure emitted to the visualization layer |
| `DataProviderStats` | `@web3viz/core` | Interface (type-only) | Aggregate statistics shape (counts, volumes, top tokens, edges) |
| `ConnectionState` | `@web3viz/core` | Interface (type-only) | Represents a single WebSocket connection's status |
| `CategoryConfig` | `@web3viz/core` | Interface (type-only) | Describes a category (id, label, icon, color) |
| `TopToken` | `@web3viz/core` | Interface (type-only) | Represents a token ranked by volume/trade count |
| `TraderEdge` | `@web3viz/core` | Interface (type-only) | Represents a trader-to-token relationship edge for the force graph |

### Internal Imports

| Import | Source | Description |
|--------|--------|-------------|
| `ETH_CATEGORIES` | `./categories` | Array of `CategoryConfig` objects defining ethSwaps, ethTransfers, ethMints |
| `EthereumWebSocket` | `./ethereum-ws` | WebSocket handler class that connects to Ethereum RPC and parses log events |
| `EVENT_BUFFER_SIZE` | `./constants` | Maximum number of recent events to retain in the stats buffer (300) |

---

## Line-by-Line Documentation

### Lines 1-10: Module Header and JSDoc
```typescript
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
```
Module-level documentation describing the three event types this provider captures.

### Line 12: Client Directive
```typescript
'use client';
```
Required because this module opens WebSocket connections in the browser.

### Lines 14-23: Core Type Imports
```typescript
import {
  registerProvider,
  type DataProvider,
  type DataProviderEvent,
  type DataProviderStats,
  type ConnectionState,
  type CategoryConfig,
  type TopToken,
  type TraderEdge,
} from '@web3viz/core';
```
Imports the registration function and all type interfaces needed for the provider implementation. The `type` keyword ensures these imports are erased at compile time.

### Lines 25-27: Internal Imports
```typescript
import { ETH_CATEGORIES } from './categories';
import { EthereumWebSocket } from './ethereum-ws';
import { EVENT_BUFFER_SIZE } from './constants';
```
Category configuration, the WebSocket handler class, and the event buffer size constant.

---

## Class: `EthereumProvider`

### Declaration (Line 29)
```typescript
class EthereumProvider implements DataProvider {
```
Private class (not exported directly) implementing the `DataProvider` interface from `@web3viz/core`.

### Readonly Properties

| Property | Type | Value | Description |
|----------|------|-------|-------------|
| `id` | `string` | `'ethereum'` | Unique provider identifier used for routing and filtering |
| `name` | `string` | `'Ethereum'` | Human-readable display name |
| `chains` | `string[]` | `['ethereum']` | List of blockchain networks this provider covers |
| `categories` | `CategoryConfig[]` | `ETH_CATEGORIES` | Event categories: ethSwaps, ethTransfers, ethMints |

### Private Properties

| Property | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `listeners` | `Set<(event: DataProviderEvent) => void>` | `new Set()` | Set of callback functions subscribed to receive events |
| `paused` | `boolean` | `false` | When `true`, incoming events are silently discarded |
| `ws` | `EthereumWebSocket` | (constructed) | WebSocket handler instance managing the RPC connection |
| `stats` | `DataProviderStats` | (see below) | Mutable aggregate statistics object |
| `tokenAcc` | `Map<string, TopToken>` | `new Map()` | Accumulator mapping token addresses to their `TopToken` stats |
| `traderAcc` | `Map<string, TraderEdge>` | `new Map()` | Accumulator mapping `"trader:token"` composite keys to `TraderEdge` objects |

### Initial Stats Object (Lines 39-48)
```typescript
private stats: DataProviderStats = {
  counts: {},
  totalVolume: { ethereum: 0 },
  totalTransactions: 0,
  totalAgents: 0,
  recentEvents: [],
  topTokens: [],
  traderEdges: [],
  rawEvents: [],
};
```
- `counts`: Per-category event count accumulator (keys are category IDs like `'ethSwaps'`)
- `totalVolume`: Volume keyed by chain name; initialized with `ethereum: 0`
- `totalTransactions`: Running total of all processed events
- `totalAgents`: Set to the number of top tokens (used by the graph visualization)
- `recentEvents`: Rolling buffer of recent `DataProviderEvent` objects
- `topTokens`: Top 8 tokens sorted by volume
- `traderEdges`: Trader-to-token edges for the top tokens
- `rawEvents`: Raw unprocessed events (unused by this provider)

### Constructor (Lines 55-61)
```typescript
constructor() {
  this.ws = new EthereumWebSocket({
    onEvent: (event) => this.handleEvent(event),
    onSwap: (swap) => this.handleSwap(swap),
    isPaused: () => this.paused,
  });
}
```
Creates the `EthereumWebSocket` instance with three callback bindings:
- `onEvent`: Routes parsed events into the provider's event pipeline
- `onSwap`: Routes swap data into the top-token/trader-edge accumulation pipeline
- `isPaused`: Allows the WebSocket handler to check the paused state

### Method: `connect()` (Lines 63-65)
```typescript
connect(): void {
  this.ws.connect();
}
```
**Signature**: `() => void`
Delegates to `EthereumWebSocket.connect()` to open the WebSocket connection and subscribe to log events.

### Method: `disconnect()` (Lines 67-69)
```typescript
disconnect(): void {
  this.ws.disconnect();
}
```
**Signature**: `() => void`
Closes the WebSocket and clears any pending reconnect timers.

### Method: `getStats()` (Lines 71-73)
```typescript
getStats(): DataProviderStats {
  return { ...this.stats };
}
```
**Signature**: `() => DataProviderStats`
Returns a shallow copy of the current statistics. The spread operator prevents external mutation of the internal stats object, though nested arrays/objects are still shared references.

### Method: `getConnections()` (Lines 75-77)
```typescript
getConnections(): ConnectionState[] {
  return [{ name: 'Ethereum', connected: this.ws.isConnected_() }];
}
```
**Signature**: `() => ConnectionState[]`
Returns an array with a single connection state object reflecting the Ethereum WebSocket connection status.

### Method: `onEvent()` (Lines 79-82)
```typescript
onEvent(callback: (event: DataProviderEvent) => void): () => void {
  this.listeners.add(callback);
  return () => this.listeners.delete(callback);
}
```
**Signature**: `(callback: (event: DataProviderEvent) => void) => () => void`
Registers an event listener. Returns an unsubscribe function that removes the listener from the set.

### Method: `setPaused()` (Lines 84-86)
```typescript
setPaused(paused: boolean): void {
  this.paused = paused;
}
```
**Signature**: `(paused: boolean) => void`
Controls whether the provider processes or discards incoming events.

### Method: `isPaused()` (Lines 88-90)
```typescript
isPaused(): boolean {
  return this.paused;
}
```
**Signature**: `() => boolean`
Returns the current pause state.

### Private Method: `handleEvent()` (Lines 92-109)
```typescript
private handleEvent(event: DataProviderEvent): void
```
**Signature**: `(event: DataProviderEvent) => void`

Processing steps:
1. **Pause check** (line 93): Returns immediately if paused
2. **Category count** (line 95): Increments `stats.counts[event.category]`
3. **Volume accumulation** (lines 97-99): If `event.amount` is truthy, adds it to `stats.totalVolume.ethereum`
4. **Transaction count** (line 101): Increments `stats.totalTransactions`
5. **Recent events buffer** (line 104): Prepends the event to `recentEvents` and trims to `EVENT_BUFFER_SIZE` (300 entries)
6. **Listener notification** (lines 107-109): Iterates all registered listeners and invokes each with the event

### Private Method: `handleSwap()` (Lines 112-166)
```typescript
private handleSwap(swap: {
  tokenAddress: string;
  symbol: string;
  name: string;
  trader: string;
  volume: number;
}): void
```
**Signature**: `(swap: { tokenAddress, symbol, name, trader, volume }) => void`

Processing steps:

1. **Token accumulation** (lines 120-135):
   - If the token already exists in `tokenAcc`, increments its `trades` count and adds volume
   - Otherwise, creates a new `TopToken` entry with chain `'ethereum'`, initial trade count of 1, and native symbol `'ETH'`
   - Falls back to the first 8 characters of the address if no symbol is available

2. **Trader edge accumulation** (lines 138-152):
   - Builds a composite key `"trader:tokenAddress"`
   - If edge exists, increments trades and adds volume
   - Otherwise, creates a new `TraderEdge` with chain `'ethereum'`

3. **Top tokens ranking** (lines 155-157):
   - Sorts all accumulated tokens by `volumeSol` descending
   - Takes the top 8 tokens

4. **Edge filtering** (lines 159-164):
   - Builds a set of top token addresses
   - Filters trader edges to only include those connected to top tokens
   - Caps at 5,000 edges for performance
   - Updates `stats.totalAgents` to the number of top tokens

---

## Module-Level Registration (Lines 169-170)

```typescript
const provider = new EthereumProvider();
registerProvider(provider);
```
Instantiates the provider and registers it with the `@web3viz/core` registry. This executes immediately when the module is imported, implementing the self-registration pattern.

---

## Exported Members

| Export | Type | Description |
|--------|------|-------------|
| `ethereumProvider` | `EthereumProvider` (aliased from `provider`) | The singleton provider instance, exported for direct access if needed |

---

## Data Flow

```
Ethereum RPC (WebSocket)
    │
    ▼
EthereumWebSocket (ethereum-ws.ts)
    │
    ├── onEvent(DataProviderEvent)
    │       │
    │       ▼
    │   EthereumProvider.handleEvent()
    │       ├── Update stats.counts
    │       ├── Update stats.totalVolume
    │       ├── Update stats.totalTransactions
    │       ├── Update stats.recentEvents
    │       └── Notify all listeners
    │
    └── onSwap({ tokenAddress, symbol, name, trader, volume })
            │
            ▼
        EthereumProvider.handleSwap()
            ├── Update tokenAcc (top token ranking)
            ├── Update traderAcc (trader-token edges)
            ├── Rebuild stats.topTokens (top 8)
            └── Rebuild stats.traderEdges (filtered, max 5000)
```

---

## Usage Example

```typescript
import { ethereumProvider } from './providers/ethereum';

// Connect to start receiving events
ethereumProvider.connect();

// Subscribe to events
const unsubscribe = ethereumProvider.onEvent((event) => {
  console.log(`[${event.category}] ${event.label} — ${event.amount} ETH`);
});

// Check stats
const stats = ethereumProvider.getStats();
console.log('Total transactions:', stats.totalTransactions);
console.log('Top tokens:', stats.topTokens);

// Pause/resume
ethereumProvider.setPaused(true);

// Cleanup
unsubscribe();
ethereumProvider.disconnect();
```
