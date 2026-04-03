# Task 22: useProviders Hook

## Context

Task 21 created a `PumpFunProvider` class that implements the `DataProvider` interface. Currently the app uses `useDataProvider` (at `packages/providers/src/useDataProvider.ts`) which directly calls the old React hooks (`usePumpFun`, `usePumpFunClaims`) and hardcodes their aggregation.

We need a new `useProviders` hook that works with any `DataProvider` instances — it subscribes to their events, aggregates stats, manages category filtering, and provides connection state. This is the bridge between imperative provider classes and React.

## What to Build

### 1. `packages/providers/src/useProviders.ts` (NEW)

A React hook that takes an array of `DataProvider` instances and provides unified access to all their data.

**Signature**:
```ts
interface UseProvidersOptions {
  /** Provider instances to manage */
  providers: DataProvider[];
  /** Start paused? */
  paused?: boolean;
  /** Max unified events to keep */
  maxEvents?: number;
}

interface UseProvidersReturn {
  /** Merged stats from all providers */
  stats: MergedStats;
  /** All recent events filtered by enabled categories */
  filteredEvents: DataProviderEvent[];
  /** All recent events unfiltered */
  allEvents: DataProviderEvent[];
  /** Set of enabled category IDs */
  enabledCategories: Set<string>;
  /** Toggle a category on/off */
  toggleCategory: (categoryId: string) => void;
  /** Set of enabled provider IDs */
  enabledProviders: Set<string>;
  /** Toggle a provider on/off */
  toggleProvider: (providerId: string) => void;
  /** All categories from all providers */
  categories: CategoryConfig[];
  /** All source configs from all providers */
  sources: SourceConfig[];
  /** Per-provider connection state */
  connections: Record<string, ConnectionState[]>;
}

function useProviders(options: UseProvidersOptions): UseProvidersReturn;
```

**Implementation details**:

1. **Lifecycle management** — `useEffect` that calls `provider.connect()` on mount and `provider.disconnect()` on unmount for each provider. When providers array changes, diff and connect/disconnect accordingly.

2. **Event subscription** — For each provider, call `provider.onEvent(callback)` to subscribe. The callback pushes events into a shared buffer. Use `useRef` for the buffer and flush to state on a 100ms debounce (to batch rapid events).

3. **Stats aggregation** — Poll `provider.getStats()` on each event batch (or on interval). Merge stats from all providers:
   - `counts`: sum per-category counts from all providers
   - `totalVolumeSol`: sum
   - `totalTransactions`: sum
   - `topTokens`: concatenate from all providers, re-sort by volume, take top 8
   - `traderEdges`: concatenate from all providers
   - `recentEvents`: merge all providers' events, sort by timestamp desc, take maxEvents
   - `bySource`: stats breakdown per provider ID (from `MergedStats` type in `@web3viz/core`)

4. **Category management** — Collect `provider.categories` from all providers into a single array. Maintain a `Set<string>` of enabled category IDs (all enabled by default). `toggleCategory` flips membership. `filteredEvents` = `allEvents.filter(e => enabledCategories.has(e.category))`.

5. **Provider management** — Maintain a `Set<string>` of enabled provider IDs (all enabled by default). When a provider is disabled, call `provider.setEnabled(false)` and filter its events from the unified stream.

6. **Connection state** — Build from `provider.getConnections()` for each provider, keyed by provider ID.

7. **Pause/resume** — When `paused` option changes, call `provider.setPaused(paused)` on all providers.

### 2. Update `packages/providers/src/index.ts`

Add the new hook to exports:
```ts
export { useProviders } from './useProviders';
export type { UseProvidersOptions, UseProvidersReturn } from './useProviders';
```

### 3. Keep `useDataProvider.ts` for now

Do NOT delete it yet. It will be removed in task 23 when the UI is updated. Mark it with a deprecation comment:
```ts
/** @deprecated Use useProviders() instead */
```

## Reference Files

Read these files:
- `packages/core/src/providers/index.ts` — DataProvider interface (connect, disconnect, onEvent, getStats, getConnections, categories, etc.)
- `packages/core/src/types/index.ts` — DataProviderEvent, DataProviderStats, MergedStats, TopToken, TraderEdge
- `packages/core/src/categories/index.ts` — CategoryConfig, SourceConfig types
- `packages/providers/src/useDataProvider.ts` — The old hook being replaced (understand what it returns so we don't break consumers)
- `packages/providers/src/pump-fun/PumpFunProvider.ts` — The provider class this hook will consume (created in task 21)
- `packages/providers/src/mock/MockProvider.ts` — Another provider class this hook should work with

## Important Notes

- This hook must work with ANY DataProvider, not just PumpFun. Don't import PumpFun-specific types.
- Use `useRef` for mutable accumulators (event buffers, subscription cleanup functions) to avoid re-render loops.
- The providers array should be treated as stable (passed via useMemo upstream). Don't re-subscribe on every render.
- Import types from `@web3viz/core`, not from local files.
- Do NOT modify any UI components or the app page — that's task 23.

## Verification

1. Run `cd /workspaces/visualize-web3-realtime && npx turbo typecheck` — should pass
2. The hook should be importable: `import { useProviders } from '@web3viz/providers'`
3. It should accept `[new PumpFunProvider(), new MockProvider()]` as providers
