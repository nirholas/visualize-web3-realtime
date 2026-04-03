# useDataProvider Hook

## File Path

`packages/providers/src/useDataProvider.ts`

## Purpose

A **deprecated** React hook that provides a unified data aggregation layer over the legacy `usePumpFun` and `usePumpFunClaims` hooks. It normalizes events from both WebSocket sources into a single `UnifiedEvent` format, computes aggregate statistics, and supports category-based filtering. This hook is PumpFun-specific and should be replaced with `useProviders()` using `DataProvider` instances.

## Module Dependencies

### External Dependencies

| Import | Source | Description |
|---|---|---|
| `useCallback` | `react` | Memoizes callback functions to prevent unnecessary re-renders |
| `useMemo` | `react` | Memoizes computed values for derived state |
| `useState` | `react` | Manages component-local state for enabled categories |

### Internal Dependencies (from `@web3viz/core`)

| Import | Kind | Description |
|---|---|---|
| `Token` | Type | Token creation event data shape |
| `Trade` | Type | Trade event data shape |
| `Claim` | Type | Claim event data shape |
| `TopToken` | Type | Aggregated top token by volume |
| `TraderEdge` | Type | Trader-to-token relationship edge |
| `RawEvent` | Type | Raw WebSocket event wrapper |
| `DataProviderStats` | Type | Base statistics interface extended by `AggregateStats` |
| `CATEGORIES` | Constant | Array of all valid category IDs |
| `CategoryId` | Type | Union type of valid category identifier strings |

### Sibling Dependencies

| Import | Source | Description |
|---|---|---|
| `usePumpFun` | `./pump-fun/usePumpFun` | Hook providing real-time PumpFun trade/launch data |
| `PumpFunStats` | `./pump-fun/usePumpFun` | Type for PumpFun statistics |
| `usePumpFunClaims` | `./pump-fun/usePumpFunClaims` | Hook providing real-time claim data |

## Line-by-Line Documentation

### Line 1 - Client Directive

```typescript
'use client';
```

Next.js directive marking this module as client-side only. Required because it uses React hooks (`useState`, `useCallback`, `useMemo`) which cannot execute in a server component.

### Lines 3-6 - Deprecation Notice

```typescript
/**
 * @deprecated Use useProviders() with DataProvider instances instead.
 * This hook is PumpFun-specific and will be removed in a future version.
 */
```

JSDoc deprecation tag warning consumers to migrate to the newer `useProviders` hook with `DataProvider` class instances.

### Lines 8-21 - Import Declarations

React hooks (`useCallback`, `useMemo`, `useState`) for state management and memoization. Core types (`Token`, `Trade`, `Claim`, `TopToken`, `TraderEdge`, `RawEvent`, `DataProviderStats`) for data structures. `CATEGORIES` constant and `CategoryId` type for category management. Internal hooks `usePumpFun` and `usePumpFunClaims` for underlying data sources.

### Lines 27-36 - UnifiedEvent Interface

```typescript
export interface UnifiedEvent {
  id: string;
  category: CategoryId;
  timestamp: number;
  label: string;
  amount?: number;
  address: string;
  mint?: string;
  meta?: Record<string, unknown>;
}
```

Normalized event interface that provides a common shape for events from all data sources.

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique identifier, typically a transaction signature |
| `category` | `CategoryId` | Yes | Event classification (e.g., `'launches'`, `'trades'`, `'claimsWallet'`) |
| `timestamp` | `number` | Yes | Unix timestamp in milliseconds |
| `label` | `string` | Yes | Human-readable label, typically token symbol |
| `amount` | `number` | No | SOL amount for trades/claims (in SOL, not lamports) |
| `address` | `string` | Yes | Wallet or trader public key |
| `mint` | `string` | No | Token mint address |
| `meta` | `Record<string, unknown>` | No | Arbitrary metadata bag (e.g., `{ txType: 'buy' }`) |

### Lines 42-57 - AggregateStats Interface

```typescript
export interface AggregateStats extends DataProviderStats {
  counts: Record<CategoryId, number>;
  totalTransactions: number;
  totalAgents: number;
  recentEvents: UnifiedEvent[];
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  rawPumpFunEvents: RawEvent[];
}
```

Extended statistics interface inheriting from `DataProviderStats` and adding unified aggregation fields.

| Property | Type | Description |
|---|---|---|
| `counts` | `Record<CategoryId, number>` | Per-category event counts (launches, agentLaunches, trades, claimsWallet, etc.) |
| `totalTransactions` | `number` | Sum of all transactions across all categories |
| `totalAgents` | `number` | Count of unique agents/wallets, derived from top tokens length |
| `recentEvents` | `UnifiedEvent[]` | Merged and sorted recent events from all sources |
| `topTokens` | `TopToken[]` | Top tokens by volume from PumpFun trades |
| `traderEdges` | `TraderEdge[]` | Per-trader token edges for force graph visualization |
| `rawPumpFunEvents` | `RawEvent[]` | Raw PumpFun events for backward compatibility with LiveFeed |

### Lines 63-90 - pumpFunEventsToUnified Converter

```typescript
function pumpFunEventsToUnified(events: RawEvent[]): UnifiedEvent[]
```

Private converter function that transforms raw PumpFun WebSocket events into the `UnifiedEvent` format. Handles two event types:

- **`tokenCreate`** events: Casts `e.data` to `Token`, determines if it is an agent launch via `isAgent` flag, extracts mint, symbol, initial buy amount (converting from lamports to SOL by dividing by `1e9`), and trader public key.
- **Trade events** (default branch): Casts `e.data` to `Trade`, categorizes as `'trades'`, converts `solAmount` or `nativeAmount` from lamports to SOL, and includes `txType` in metadata.

### Lines 92-107 - claimsToUnified Converter

```typescript
function claimsToUnified(claims: RawEvent[]): UnifiedEvent[]
```

Private converter function that transforms raw claim events into `UnifiedEvent` format. Filters for events with `type === 'claim'`, casts data to `Claim`, and produces events with category `'claimsWallet'`. Includes SOL amount in metadata.

### Line 113 - MAX_UNIFIED_EVENTS Constant

```typescript
const MAX_UNIFIED_EVENTS = 300;
```

Maximum number of unified events retained in the merged event array. Prevents unbounded memory growth from continuous WebSocket streams.

### Lines 115-194 - useDataProvider Hook

```typescript
export function useDataProvider({ paused = false }: { paused?: boolean } = {})
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `paused` | `boolean` | `false` | When true, underlying WebSocket hooks ignore incoming messages |

**Internal Hook Calls:**

- **Line 117** - `usePumpFun({ paused })`: Connects to PumpPortal WebSocket, returns `{ stats: PumpFunStats, connected: boolean }`.
- **Line 118** - `usePumpFunClaims({ paused })`: Connects to Solana RPC WebSocket, returns `{ stats: PumpFunClaimsStats, connected: boolean }`.
- **Lines 121-123** - `useState<Set<CategoryId>>`: Initializes enabled categories as a `Set` containing all values from the `CATEGORIES` constant. All categories are enabled by default.
- **Lines 125-132** - `toggleCategory` callback via `useCallback`: Toggles a category ID in or out of the `enabledCategories` set. Creates a new `Set` to trigger React state update.
- **Lines 135-176** - `useMemo<AggregateStats>`: Derives the unified aggregate statistics object. Steps:
  1. Converts PumpFun events to unified format via `pumpFunEventsToUnified`.
  2. Converts claim events to unified format via `claimsToUnified`.
  3. Merges both arrays, sorts by timestamp descending, and trims to `MAX_UNIFIED_EVENTS`.
  4. Initializes per-category counts to zero.
  5. Computes launch vs agent launch counts by filtering token create events with `isAgent` flag.
  6. Aggregates trade and claim counts from respective stats.
  7. Calculates `totalTransactions` as the sum of all event types.
  8. Returns the complete `AggregateStats` object.
- **Lines 179-182** - `filteredEvents` via `useMemo`: Filters `recentEvents` to only include events whose `category` is in the `enabledCategories` set.

**Return Value:**

```typescript
{
  stats: AggregateStats;
  filteredEvents: UnifiedEvent[];
  enabledCategories: Set<CategoryId>;
  toggleCategory: (cat: CategoryId) => void;
  connected: {
    pumpFun: boolean;
    claims: boolean;
  };
}
```

| Property | Type | Description |
|---|---|---|
| `stats` | `AggregateStats` | Merged statistics from all data sources |
| `filteredEvents` | `UnifiedEvent[]` | Events filtered by currently enabled categories |
| `enabledCategories` | `Set<CategoryId>` | Set of currently active category IDs |
| `toggleCategory` | `(cat: CategoryId) => void` | Callback to toggle a category on or off |
| `connected` | `{ pumpFun: boolean; claims: boolean }` | Connection status for each underlying WebSocket |

## Usage Examples

```typescript
import { useDataProvider } from '@web3viz/providers';

function Dashboard() {
  const { stats, filteredEvents, toggleCategory, connected } = useDataProvider({ paused: false });

  return (
    <div>
      <p>Total Transactions: {stats.totalTransactions}</p>
      <p>PumpFun Connected: {connected.pumpFun ? 'Yes' : 'No'}</p>
      <button onClick={() => toggleCategory('trades')}>Toggle Trades</button>
      <ul>
        {filteredEvents.map((e) => (
          <li key={e.id}>{e.label} - {e.category}</li>
        ))}
      </ul>
    </div>
  );
}
```
