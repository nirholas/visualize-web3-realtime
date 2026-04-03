# Task 24: Provider System Verification & Cleanup

## Context

Tasks 21-23 built the provider plugin system:
- Task 21: `PumpFunProvider` class at `packages/providers/src/pump-fun/PumpFunProvider.ts`
- Task 22: `useProviders` hook at `packages/providers/src/useProviders.ts`
- Task 23: Wired UI to use new provider system, deleted old hooks

This task is a full verification pass — fix every remaining error, clean up dead code, and prove multi-provider works by enabling MockProvider.

## What to Do

### 1. Fix ALL TypeScript errors

```bash
cd /workspaces/visualize-web3-realtime && npx turbo typecheck 2>&1
```

Fix every error. Common issues to expect:
- Import paths still referencing deleted files (`@/hooks/useDataProvider`, `@/hooks/usePumpFun`, `@/hooks/providers/*`)
- Type mismatches: `PumpFunCategory` (old) vs `string` (new) for category IDs
- Missing `source` field on `DataProviderEvent`
- `MergedStats` shape mismatch with what `useProviders` returns
- LiveFeed/StatsBar props changed
- Any `CategoryId` type references that should now be `string`

### 2. Fix ALL build errors

```bash
cd /workspaces/visualize-web3-realtime && npx turbo build 2>&1
```

Fix any Next.js issues:
- `'use client'` directives needed
- Dynamic import issues
- Missing package exports

### 3. Verify MockProvider works as second provider

Update `app/world/providers.ts` to include MockProvider alongside PumpFun:

```ts
import { PumpFunProvider, MockProvider } from '@web3viz/providers';

export const providers = [
  new PumpFunProvider({
    rpcWsUrl: process.env.NEXT_PUBLIC_SOLANA_WS_URL || undefined,
  }),
  new MockProvider({ interval: 1000 }),
];
```

With MockProvider enabled, verify:
- MockProvider's categories appear in the filter sidebar (in a separate section from PumpFun if the sidebar groups by source)
- Mock events appear in LiveFeed with their own colors
- Stats aggregate both providers
- Force graph shows data from both
- Connection dots show for both providers

After verifying, comment out MockProvider (leave the import and code as a commented example for developers):
```ts
// Uncomment to test multi-provider:
// new MockProvider({ interval: 1000 }),
```

### 4. Clean up dead code

Search for and remove:
```bash
# Find any remaining imports of deleted hooks
grep -r "hooks/useDataProvider\|hooks/usePumpFun\|hooks/usePumpFunClaims\|hooks/providers" --include="*.ts" --include="*.tsx" -l
```

For each file found:
- Update imports to use `@web3viz/providers` or `@web3viz/core`
- Remove any unused type imports

Check if these files still exist and delete if so:
- `hooks/useDataProvider.ts`
- `hooks/usePumpFun.ts`
- `hooks/usePumpFunClaims.ts`
- `hooks/providers/` directory (all files)

Check `packages/providers/src/`:
- Remove `useDataProvider.ts` if fully replaced by `useProviders.ts`
- Remove `pump-fun/usePumpFun.ts` and `pump-fun/usePumpFunClaims.ts` IF `PumpFunProvider.ts` does not import from them

Update `packages/providers/src/index.ts` — remove exports for deleted files, ensure clean:
```ts
export { PumpFunProvider, type PumpFunProviderOptions } from './pump-fun/PumpFunProvider';
export { MockProvider } from './mock/MockProvider';
export { useProviders } from './useProviders';
export type { UseProvidersOptions, UseProvidersReturn } from './useProviders';
```

### 5. Full manual verification checklist

Run `npm run dev` and verify every feature at localhost:3100:

**Core functionality**:
- [ ] Page loads without white screen or console errors
- [ ] PumpFun WebSocket connects (green connection dot for PumpPortal)
- [ ] Solana RPC connects (green connection dot for Solana RPC)
- [ ] Token launches appear in LiveFeed
- [ ] Trades appear in LiveFeed (buy/sell)
- [ ] Claims appear when detected
- [ ] Force graph renders hub nodes for top tokens
- [ ] Agent/wallet nodes cluster around hubs

**Filtering**:
- [ ] Filter sidebar shows all PumpFun categories with correct icons/colors
- [ ] Clicking a category highlights it
- [ ] Stats bar shows live token count, volume, transaction count
- [ ] Address search works (enter a wallet → highlights in graph)

**Timeline**:
- [ ] Timeline scrubber renders at top
- [ ] Dragging timeline filters visible data
- [ ] Play/pause works

**Share & extras**:
- [ ] Share panel opens
- [ ] Download world/snapshot buttons work
- [ ] Embed page loads (`/embed`)
- [ ] Journey/tour can be started

**Browser console**:
- [ ] No errors
- [ ] No warnings about missing props or invalid types

### 6. Add developer documentation comment

Ensure `app/world/providers.ts` has clear instructions for adding providers:

```ts
// ---------------------------------------------------------------------------
// Data Provider Registration
//
// To add a new real-time data source:
//
// 1. Create a class implementing DataProvider from @web3viz/core
//    (see PumpFunProvider and MockProvider for reference patterns)
//
// 2. Your provider must declare:
//    - id, name, sourceConfig, categories
//    - connect() / disconnect() for WebSocket/API lifecycle
//    - onEvent(cb) to emit DataProviderEvent objects
//    - getStats() returning DataProviderStats
//    - getConnections() returning ConnectionState[]
//
// 3. Add your provider instance to this array:
//    new MyChainProvider({ wsUrl: '...' }),
//
// Your provider's categories will automatically appear in the filter sidebar,
// events will appear in the LiveFeed, and stats will aggregate into the dashboard.
// ---------------------------------------------------------------------------
```

## Reference Files

- `app/world/page.tsx`
- `app/world/providers.ts`
- `features/World/ProtocolFilterSidebar.tsx`
- `features/World/LiveFeed.tsx`
- `features/World/StatsBar.tsx`
- `features/World/ForceGraph.tsx`
- `packages/providers/src/useProviders.ts`
- `packages/providers/src/pump-fun/PumpFunProvider.ts`
- `packages/providers/src/mock/MockProvider.ts`
- `packages/providers/src/index.ts`
- `packages/core/src/providers/index.ts`
- `packages/core/src/types/index.ts`
- `app/embed/` (check all pages)

## Verification

Final checklist:
1. `npx turbo typecheck` — zero errors
2. `npx turbo build` — clean build
3. `npm run dev` — all features work
4. Browser console — zero errors
5. No remaining imports from deleted hook files
6. `grep -r "PumpFunCategory" --include="*.ts" --include="*.tsx"` returns nothing (type fully removed)
