# Task 22: Rewrite useDataProvider to Use the Provider Registry

## Goal
Replace the hardcoded `useDataProvider` hook (which directly imports `usePumpFun` and `usePumpFunClaims`) with a generic hook that consumes any number of registered `DataProvider` instances from the `@web3viz/core` registry. The hook should aggregate stats, events, and categories from all active providers.

## Prerequisites
- Task 21 (generalized core types) must be complete

## Context

### Current State (`hooks/useDataProvider.ts`)
- Directly imports `usePumpFun` and `usePumpFunClaims` hooks
- Hardcodes `PumpFunCategory` type and `CATEGORY_CONFIGS` array
- Manually converts PumpFun events and claims into unified events
- Duplicates type definitions that already exist in `@web3viz/core`

### Target State
- `hooks/useDataProvider.ts` imports from `@web3viz/core` only (no provider-specific imports)
- Discovers providers via `getAllProviders()` from the registry
- Aggregates stats by merging each provider's `getStats()`
- Categories are dynamically collected from all registered providers
- Components that consume this hook need no knowledge of which providers are active

## Files to Modify

### 1. `hooks/useDataProvider.ts` — Full Rewrite

Delete the entire file and replace with:

```typescript
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAllProviders,
  type DataProvider,
  type DataProviderEvent,
  type DataProviderStats,
  type TopToken,
  type TraderEdge,
  type CategoryConfig,
  type RawEvent,
} from '@web3viz/core';

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

const MAX_UNIFIED_EVENTS = 500;

function mergeStats(providers: DataProvider[]): DataProviderStats {
  const counts: Record<string, number> = {};
  const totalVolume: Record<string, number> = {};
  let totalTransactions = 0;
  let totalAgents = 0;
  const allEvents: DataProviderEvent[] = [];
  const allTopTokens: TopToken[] = [];
  const allTraderEdges: TraderEdge[] = [];
  const allRawEvents: RawEvent[] = [];

  for (const provider of providers) {
    const stats = provider.getStats();

    // Merge counts
    for (const [key, val] of Object.entries(stats.counts)) {
      counts[key] = (counts[key] || 0) + val;
    }

    // Merge volumes per chain
    for (const [chain, vol] of Object.entries(stats.totalVolume)) {
      totalVolume[chain] = (totalVolume[chain] || 0) + vol;
    }

    totalTransactions += stats.totalTransactions;
    totalAgents += stats.totalAgents;
    allEvents.push(...stats.recentEvents);
    allTopTokens.push(...stats.topTokens);
    allTraderEdges.push(...stats.traderEdges);
    allRawEvents.push(...stats.rawEvents);
  }

  // Sort events newest first, cap
  allEvents.sort((a, b) => b.timestamp - a.timestamp);
  allEvents.length = Math.min(allEvents.length, MAX_UNIFIED_EVENTS);

  // Sort top tokens by volume descending, take top 12
  allTopTokens.sort((a, b) => b.volume - a.volume);
  allTopTokens.length = Math.min(allTopTokens.length, 12);

  return {
    counts,
    totalVolume,
    totalTransactions,
    totalAgents,
    recentEvents: allEvents,
    topTokens: allTopTokens,
    traderEdges: allTraderEdges,
    rawEvents: allRawEvents,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDataProvider({ paused = false }: { paused?: boolean } = {}) {
  const [stats, setStats] = useState<DataProviderStats>({
    counts: {},
    totalVolume: {},
    totalTransactions: 0,
    totalAgents: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
    rawEvents: [],
  });

  // Track registered providers
  const [providers, setProviders] = useState<DataProvider[]>([]);
  const providersRef = useRef<DataProvider[]>([]);

  // Collect all categories from registered providers
  const allCategories = useMemo<CategoryConfig[]>(() => {
    const seen = new Set<string>();
    const result: CategoryConfig[] = [];
    for (const p of providers) {
      for (const cat of p.categories) {
        if (!seen.has(cat.id)) {
          seen.add(cat.id);
          result.push(cat);
        }
      }
    }
    return result;
  }, [providers]);

  // Category visibility (all enabled by default)
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(() => new Set());

  // When categories change, enable new ones by default
  useEffect(() => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      for (const cat of allCategories) {
        // Only add if we haven't seen it before (don't re-enable user-disabled ones)
        if (!next.has(cat.id) && !prev.has(cat.id)) {
          next.add(cat.id);
        }
      }
      // On first load, enable all
      if (prev.size === 0 && allCategories.length > 0) {
        return new Set(allCategories.map((c) => c.id));
      }
      return next;
    });
  }, [allCategories]);

  const toggleCategory = useCallback((catId: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  // Poll for providers and connect/disconnect
  useEffect(() => {
    const check = () => {
      const current = getAllProviders();
      if (current.length !== providersRef.current.length) {
        providersRef.current = current;
        setProviders(current);
      }
    };
    check();
    // Poll every 2s for newly registered providers
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  // Connect all providers, set paused state
  useEffect(() => {
    for (const p of providers) {
      p.setPaused(paused);
      p.connect();
    }
    return () => {
      for (const p of providers) {
        p.disconnect();
      }
    };
  }, [providers, paused]);

  // Subscribe to events and rebuild stats
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    for (const p of providers) {
      const unsub = p.onEvent(() => {
        // Rebuild merged stats on any event
        setStats(mergeStats(providersRef.current));
      });
      unsubs.push(unsub);
    }

    // Initial stats
    if (providers.length > 0) {
      setStats(mergeStats(providers));
    }

    return () => unsubs.forEach((u) => u());
  }, [providers]);

  // Connection states
  const connections = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const p of providers) {
      for (const conn of p.getConnections()) {
        result[conn.name] = conn.connected;
      }
    }
    return result;
  }, [providers, stats]); // re-derive when stats change (proxy for connection changes)

  // Filtered events
  const filteredEvents = useMemo(
    () => stats.recentEvents.filter((e) => enabledCategories.has(e.category)),
    [stats.recentEvents, enabledCategories],
  );

  // Build category config map for consumers
  const categoryConfigMap = useMemo(() => {
    return Object.fromEntries(allCategories.map((c) => [c.id, c])) as Record<string, CategoryConfig>;
  }, [allCategories]);

  return {
    stats,
    filteredEvents,
    enabledCategories,
    toggleCategory,
    connections,
    allCategories,
    categoryConfigMap,
    providers,
  };
}
```

### 2. Create `providers/index.ts` — Provider Registration Entry Point

Create a new file `providers/index.ts` at the app root. This is where providers get registered at app startup:

```typescript
'use client';

/**
 * Provider registration entry point.
 * Import this file once in the app layout/page to register all providers.
 * Each provider self-registers via registerProvider() from @web3viz/core.
 *
 * To add a new provider:
 * 1. Create a provider module in providers/<name>/
 * 2. Import it here
 * 3. That's it — useDataProvider discovers it automatically
 */

// Register providers (each file calls registerProvider internally)
// import './solana-pumpfun';   // ← Task 23 will add this
// import './ethereum';          // ← Task 24
// import './base';              // ← Task 25
// import './agents';            // ← Task 26
// import './erc8004';           // ← Task 27
// import './cex-volume';        // ← Task 28

export {};
```

### 3. Update `app/world/page.tsx` — Import Provider Registration

At the top of the file, add the provider registration import so providers are loaded:

```typescript
// Register all data providers (must be imported before useDataProvider)
import '@/providers';
```

Update the destructured return from `useDataProvider` to use the new shape:

**Old:**
```typescript
const { stats, filteredEvents, enabledCategories, toggleCategory, connected } = useDataProvider({ paused: !isPlaying });
```

**New:**
```typescript
const { stats, filteredEvents, enabledCategories, toggleCategory, connections, allCategories, categoryConfigMap } = useDataProvider({ paused: !isPlaying });
```

Update all references:
- `connected.pumpFun` → `connections['PumpFun']` (or iterate `connections` for status dots)
- `connected.claims` → `connections['Solana Claims']`
- `CATEGORY_CONFIGS` (imported from old useDataProvider) → `allCategories`
- `CATEGORY_CONFIG_MAP` → `categoryConfigMap`
- Any `PumpFunCategory` type → `string`
- `stats.totalVolumeSol` → display first entry from `stats.totalVolume` or sum all
- `stats.rawPumpFunEvents` → `stats.rawEvents`

### 4. Update `features/World/LiveFeed.tsx`

- Change imports from `@/hooks/usePumpFun` and `@/hooks/useDataProvider` to accept categories via props
- The `CATEGORY_CONFIG_MAP` should be passed as a prop from the parent (WorldPage) instead of imported
- Replace `'SOL'` hardcoded currency with event's `nativeSymbol` field
- Update the `formatSol` helper to `formatAmount` that takes a symbol parameter

### 5. Update `features/World/StatsBar.tsx`

- Remove any PumpFun-specific references
- Accept `totalVolume: Record<string, number>` and display formatted multi-chain volume
- Accept categories as props rather than importing them

### 6. Update `features/World/ForceGraph.tsx`

- Change import `type { TopToken, TraderEdge } from '@/hooks/usePumpFun'` → import from `@web3viz/core`
- Update references from `token.mint` → `token.tokenAddress`
- Update `edge.volumeSol` → `edge.volume`
- Update `TopToken.volumeSol` → `TopToken.volume`

### 7. Update `features/World/ProtocolFilterSidebar.tsx`

- Change import `type { TopToken } from '@/hooks/usePumpFun'` → import from `@web3viz/core`
- Update `token.mint` → `token.tokenAddress`

### 8. Update `features/World/TimelineBar.tsx`

- If it references PumpFun-specific types, update to generic types

## Important Notes
- After this task, the app will NOT work yet because no providers are registered. Task 23 will restore PumpFun.
- The key insight: `useDataProvider` should have ZERO knowledge of any specific provider. It only talks to the registry.
- All category configs come from providers, not from a static array.
- The `providers/` directory at the app root is where provider registration happens (NOT `packages/providers/`).
- Ensure TypeScript compiles: `npx tsc --noEmit` from root.

## Verification
- The app should build without TypeScript errors
- `useDataProvider` should return empty stats when no providers are registered
- All component prop types should be updated to match the new generic types
