# Task 23: Provider-Agnostic UI

## Context

Tasks 21-22 created:
- `PumpFunProvider` class implementing `DataProvider` (in `packages/providers/src/pump-fun/PumpFunProvider.ts`)
- `useProviders` hook that aggregates multiple `DataProvider` instances (in `packages/providers/src/useProviders.ts`)

The UI currently uses `hooks/useDataProvider.ts` which hardcodes PumpFun. This task wires the new provider system into the UI so everything is driven dynamically by registered providers.

## Reference Files — Read These First

Read each of these files in full before making changes:

- `app/world/page.tsx` — **Main page** (the primary file to modify, ~590 lines)
- `hooks/useDataProvider.ts` — Current hook used by page (being replaced)
- `features/World/ProtocolFilterSidebar.tsx` — Filter sidebar (needs generic types)
- `features/World/LiveFeed.tsx` — Live event feed (needs to accept unified events)
- `features/World/StatsBar.tsx` — Stats bar (check if PumpFun-specific)
- `packages/providers/src/useProviders.ts` — New hook to use (created in task 22)
- `packages/providers/src/pump-fun/PumpFunProvider.ts` — Provider to instantiate (task 21)
- `packages/core/src/types/index.ts` — `DataProviderEvent`, `MergedStats`
- `packages/core/src/categories/index.ts` — `CategoryConfig`, `SourceConfig`

## What to Build

### 1. `app/world/providers.ts` (NEW)

Create a provider configuration file. This is where providers are instantiated:

```ts
'use client';

import { PumpFunProvider } from '@web3viz/providers';

// ---------------------------------------------------------------------------
// Provider instances
//
// To add a new data provider:
// 1. Create a class implementing DataProvider from @web3viz/core
//    (see PumpFunProvider or MockProvider for reference)
// 2. Add it to this array
// 3. The provider's categories automatically appear in the filter sidebar
// ---------------------------------------------------------------------------

export const providers = [
  new PumpFunProvider({
    rpcWsUrl: process.env.NEXT_PUBLIC_SOLANA_WS_URL || undefined,
  }),
];
```

### 2. Update `app/world/page.tsx`

**Replace data hook**:
- Remove: all imports from `@/hooks/useDataProvider` (or `hooks/useDataProvider`)
- Add:
  ```ts
  import { useProviders } from '@web3viz/providers';
  import { providers } from './providers';
  ```
- Replace `useDataProvider({ paused: !isPlaying })` with:
  ```ts
  const {
    stats, filteredEvents, allEvents, enabledCategories, toggleCategory,
    enabledProviders, toggleProvider, categories, sources, connections
  } = useProviders({ providers, paused: !isPlaying });
  ```

**Update ProtocolFilterSidebar props**:
- Pass `categories` from `useProviders` (not hardcoded `CATEGORY_CONFIGS`)
- Pass `sources` for grouping by provider
- Pass `enabledCategories` for highlight state
- Pass `toggleCategory` as the toggle handler
- Pass `enabledProviders` and `toggleProvider` for provider-level controls
- Pass `stats.counts` for count badges

**Update connection dots** — replace hardcoded PumpFun/SOL dots:
```tsx
{Object.entries(connections).map(([pid, conns]) =>
  conns.map(conn => (
    <ConnectionDot key={`${pid}-${conn.name}`} connected={conn.connected} label={conn.name} />
  ))
)}
```

**Update LiveFeed** — pass unified events instead of raw PumpFun events:
```tsx
<LiveFeed events={filteredEvents} categories={categories} />
```
(or `allEvents` if you want LiveFeed to show everything, and filter in the feed itself)

**Update stats**:
- Token count: `stats.counts.launches + stats.counts.agentLaunches` (or derive from stats)
- Volume: `stats.totalVolumeSol`
- Trades: `stats.totalTransactions`

**Update title**: Change `"World of PumpFun"` to `"Web3 Realtime"` or similar.

**Update ForceGraph data**: `stats.topTokens` and `stats.traderEdges` should work as-is since useProviders merges them.

**Update timeline data**: `stats.recentEvents` is now `DataProviderEvent[]` — adapt the timestamp accumulation code if it accesses `evt.data.timestamp` (it should use `evt.timestamp` directly).

**Remove unused imports**: Clean up any remaining references to `PumpFunCategory`, `CATEGORY_CONFIGS` from old hook, `PumpFunEvent`, etc.

### 3. Update `features/World/ProtocolFilterSidebar.tsx`

**New props** (replace `PumpFunCategory` types with generic strings):
```ts
interface ProtocolFilterSidebarProps {
  categories: CategoryConfig[];
  sources?: SourceConfig[];
  enabledCategories: Set<string>;
  onToggleCategory: (id: string) => void;
  enabledProviders?: Set<string>;
  onToggleProvider?: (id: string) => void;
  counts?: Record<string, number>;
}
```

**Group by source**:
- If `sources` is provided and has more than 1 entry: group categories under source headers
- Each source header shows: source icon, source label, source color dot
- Under each source: render category buttons (existing `ProtocolButton`)
- If only one source: render flat (like now)

**Update ProtocolButton**:
- `isActive` should check `enabledCategories.has(category.id)` instead of comparing to `activeProtocol`

**Remove PumpFun-specific imports**: No more `PumpFunCategory` type — all category IDs are `string`.

### 4. Update `features/World/LiveFeed.tsx`

Read this file first to understand current structure.

**New props**:
```ts
interface LiveFeedProps {
  events: DataProviderEvent[];
  categories?: CategoryConfig[];
}
```

Replace `PumpFunEvent[]` with `DataProviderEvent[]`. Update `EventCard`:
- Look up category color from `categories` prop (or use a default color map)
- Use `event.label` as display text
- Use `event.amount` (already in SOL) — format with existing `formatSol` helper (but adjust since amounts are already in SOL, not lamports)
- Use `event.category` for the type badge text
- Use `event.id` as React key
- Use `event.timestamp` for time display

Remove all `PumpFunEvent`, `PumpFunToken`, `PumpFunTrade` type imports.

### 5. Check & update `features/World/StatsBar.tsx`

Read the file. If it imports PumpFun-specific types, update imports to use `@web3viz/core`. Its props interface should stay generic (totalTokens, totalVolumeSol, etc.) — just make sure the page passes correct values.

### 6. Check & update embed pages

Check `app/embed/` — if any embed pages import the old `useDataProvider`, update them to use `useProviders` with the same providers array.

### 7. Delete old hook files

Remove these files (the providers package copies are the canonical ones now):
- `hooks/useDataProvider.ts`
- `hooks/usePumpFun.ts`
- `hooks/usePumpFunClaims.ts`
- `hooks/providers/` (entire directory — the hook-based provider wrappers are replaced by class-based providers)

If any other files import from these paths, update them to import from `@web3viz/providers` instead.

## Important Notes

- Import types from `@web3viz/core`, not from local hook files
- The ForceGraph component should NOT change — it takes `topTokens` and `traderEdges` generically
- Check that `app/embed/` pages still work after the migration
- Run the dev server and verify visually before considering this done
- If something breaks in a way that's hard to fix, leave a `// TODO:` comment rather than reverting

## Verification

1. `cd /workspaces/visualize-web3-realtime && npx turbo typecheck` — zero errors
2. `cd /workspaces/visualize-web3-realtime && npx turbo build` — clean build  
3. `npm run dev` — verify at localhost:3100/world:
   - [ ] Page loads without console errors
   - [ ] Connection dots show for PumpFun streams
   - [ ] Launches appear in LiveFeed with correct color
   - [ ] Trades appear in LiveFeed
   - [ ] Filter sidebar shows PumpFun categories
   - [ ] Clicking category toggles filter
   - [ ] Stats bar shows live counts
   - [ ] Force graph renders nodes
   - [ ] Timeline scrubber works
   - [ ] Share panel opens
