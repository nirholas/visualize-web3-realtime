# Task 22: useProviders Hook

## Context

Task 21 created `PumpFunProvider`, a class implementing `DataProvider` from `@web3viz/core`. Currently the app uses `hooks/useDataProvider.ts` which directly calls React hooks (`usePumpFun`, `usePumpFunClaims`) and hardcodes PumpFun aggregation.

We need a `useProviders` hook that bridges imperative `DataProvider` classes into React. It manages lifecycle (connect/disconnect), aggregates events from multiple providers, and exposes filtering. This replaces both `hooks/useDataProvider.ts` and `packages/providers/src/useDataProvider.ts`.

## Reference Files — Read These First

- `packages/core/src/providers/index.ts` — `DataProvider` interface: `connect()`, `disconnect()`, `onEvent()`, `getStats()`, `getConnections()`, `categories`, `sourceConfig`, `setPaused()`, `setEnabled()`
- `packages/core/src/types/index.ts` — `DataProviderEvent`, `DataProviderStats`, `MergedStats`, `TopToken`, `TraderEdge`
- `packages/core/src/categories/index.ts` — `CategoryConfig`, `SourceConfig`
- `packages/providers/src/mock/MockProvider.ts` — A `DataProvider` class (test that hook works with this)
- `packages/providers/src/pump-fun/PumpFunProvider.ts` — PumpFun `DataProvider` class (created in task 21)
- `hooks/useDataProvider.ts` — Current hook being replaced (understand its return type and what the page expects)
- `hooks/providers/pumpfun.ts` — Alternative wrapper (understand what it returns)

## What to Build

### 1. `packages/providers/src/useProviders.ts` (NEW)

```ts
export interface UseProvidersOptions {
  /** DataProvider instances to manage */
  providers: DataProvider[];
  /** Start paused? (default false) */
  paused?: boolean;
  /** Max unified events to retain (default 300) */
  maxEvents?: number;
}

export interface UseProvidersReturn {
  /** Merged stats from all providers */
  stats: MergedStats;
  /** Recent events filtered by enabled categories */
  filteredEvents: DataProviderEvent[];
  /** All recent events (unfiltered) */
  allEvents: DataProviderEvent[];
  /** Currently enabled category IDs */
  enabledCategories: Set<string>;
  /** Toggle a single category */
  toggleCategory: (categoryId: string) => void;
  /** Currently enabled provider IDs */
  enabledProviders: Set<string>;
  /** Toggle a provider on/off */
  toggleProvider: (providerId: string) => void;
  /** All categories from all enabled providers */
  categories: CategoryConfig[];
  /** All source configs from enabled providers */
  sources: SourceConfig[];
  /** Per-provider connection state, keyed by provider ID */
  connections: Record<string, ConnectionState[]>;
}

export function useProviders(options: UseProvidersOptions): UseProvidersReturn;
```

**Implementation details**:

1. **Provider lifecycle** (`useEffect`):
   - On mount: call `provider.connect()` for each provider
   - On unmount: call `provider.disconnect()` for each provider
   - Use a ref to track current providers. If the `providers` array identity changes, diff and connect/disconnect new/removed providers
   - Pass `providers` by reference — consumers should `useMemo` upstream

2. **Event subscription** (`useEffect`):
   - For each provider, call `provider.onEvent(callback)` — returns unsubscribe fn
   - The callback pushes events into a `useRef<DataProviderEvent[]>` buffer
   - Flush buffer to state every 100ms via `setInterval` (batching for perf)
   - When flushing: merge with existing events, sort by timestamp desc, cap at `maxEvents`
   - Store unsubscribe functions in a ref, call them on cleanup

3. **Stats aggregation** (derived via `useMemo` from events + providers):
   - Call `provider.getStats()` for each enabled provider
   - Merge:
     - `counts`: sum per-category from all providers
     - `totalVolumeSol`: sum
     - `totalTransactions`: sum
     - `totalAgents`: sum
     - `topTokens`: concat all, re-sort by `volumeSol` desc, take top 8
     - `traderEdges`: concat all
     - `recentEvents`: the unified event buffer (already sorted)
     - `rawEvents`: concat
     - `bySource`: `Record<string, DataProviderStats>` — stats from each provider keyed by `provider.id`

   **Important**: Stats need to update when new events arrive. Since events flush on interval, stats should re-derive when the event list changes. Use `useMemo` keyed on events state + a counter that increments on each flush.

4. **Category management**:
   - Collect `provider.categories` from all providers into one array
   - `enabledCategories`: `useState<Set<string>>` initialized with all category IDs
   - `toggleCategory(id)`: flip membership in the set
   - `filteredEvents`: `allEvents.filter(e => enabledCategories.has(e.category))`

5. **Provider management**:
   - `enabledProviders`: `useState<Set<string>>` initialized with all provider IDs
   - `toggleProvider(id)`: flip membership, call `provider.setEnabled(enabled)`, filter events
   - When provider is disabled: its events are excluded from filteredEvents and allEvents

6. **Connection state**:
   - `connections`: derived from `provider.getConnections()` for each provider, keyed by ID
   - Refresh on same interval as event flush (100ms)

7. **Pause/resume**:
   - When `paused` prop changes, call `provider.setPaused(paused)` on all providers (via `useEffect`)

### 2. Update `packages/providers/src/index.ts`

Add exports:
```ts
export { useProviders } from './useProviders';
export type { UseProvidersOptions, UseProvidersReturn } from './useProviders';
```

### 3. Deprecate old hooks

Add to top of `packages/providers/src/useDataProvider.ts`:
```ts
/** @deprecated Use useProviders() with DataProvider instances instead */
```

Do NOT delete it yet — the app still imports it. That changes in task 23.

## Important Notes

- The hook must work with **any** `DataProvider` — don't import PumpFun-specific types
- Import all types from `@web3viz/core`
- Use `useRef` for mutable state (event buffers, unsubscribe fns, timers) to avoid re-render cascades
- The `providers` array should be treated as referentially stable. Use a ref + shallow comparison to detect changes.
- Do NOT modify any UI, page, or component files

## Verification

1. `cd /workspaces/visualize-web3-realtime && npx turbo typecheck` — zero errors
2. Importable: `import { useProviders } from '@web3viz/providers'`
3. Should accept `[new PumpFunProvider(), new MockProvider()]` without type errors
