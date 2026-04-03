# Task 24: Provider System Verification & Polish

## Context

Tasks 21-23 built the provider plugin system:
- Task 21: `PumpFunProvider` class implementing `DataProvider`
- Task 22: `useProviders` hook for aggregating multiple providers
- Task 23: Provider-agnostic UI wiring

This task verifies everything works end-to-end, fixes any type errors or runtime issues, and adds the `MockProvider` as a second data source to prove the plugin system works.

## What to Do

### 1. Fix all TypeScript errors

Run `npx turbo typecheck` from the repo root. Fix every error. Common issues to expect:
- Import paths that still reference old hooks (`@/hooks/useDataProvider`, `@/hooks/usePumpFun`)
- Type mismatches between old `PumpFunCategory` and new `string` category IDs
- Missing fields on `DataProviderEvent` (e.g., `source` field)
- The `MergedStats` type may not match what `useProviders` returns
- LiveFeed props changed from `PumpFunEvent[]` to `DataProviderEvent[]`
- ProtocolFilterSidebar props changed

### 2. Fix all build errors

Run `npx turbo build`. Fix any Next.js build issues:
- Client component boundaries ('use client' directives)
- Dynamic imports
- Missing exports from packages

### 3. Add MockProvider as second provider

Update `app/world/providers.ts` to include MockProvider:
```ts
import { PumpFunProvider, MockProvider } from '@web3viz/providers';

export const providers = [
  new PumpFunProvider({
    rpcWsUrl: process.env.NEXT_PUBLIC_SOLANA_WS_URL,
  }),
  // Mock provider for development — proves multi-provider works
  // Comment out for production
  // new MockProvider({ interval: 1000 }),
];
```

Verify that when MockProvider is uncommented:
- A second section appears in the filter sidebar
- Mock events appear in the LiveFeed with different colors
- Stats aggregate across both providers
- Force graph shows mock data nodes alongside PumpFun nodes

### 4. Verify all existing features still work

Run `npm run dev` and check:
- [ ] Page loads at localhost:3100/world without errors
- [ ] PumpFun WebSocket connects (green connection dot)
- [ ] Token launches appear in LiveFeed (purple)
- [ ] Trades appear in LiveFeed (blue, with green/red for buy/sell)
- [ ] Claims appear when detected (amber for wallet, emerald for GitHub)
- [ ] Filter sidebar shows all PumpFun categories
- [ ] Clicking a category in sidebar highlights it
- [ ] Stats bar shows live token count, volume, transactions
- [ ] Address search works
- [ ] Timeline scrubber works
- [ ] Force graph renders with hub nodes and agent nodes
- [ ] Share panel opens and functions
- [ ] Embed page works (`/embed`)
- [ ] No console errors

### 5. Clean up dead code

- Remove any remaining imports of old hooks from UI components
- Remove `hooks/useDataProvider.ts` at root level if it still exists
- Remove `hooks/usePumpFun.ts` at root level if it still exists
- Remove `hooks/usePumpFunClaims.ts` at root level if it still exists
- Remove `packages/providers/src/useDataProvider.ts` if fully replaced by `useProviders`
- Remove the old hook files in `packages/providers/src/pump-fun/` (`usePumpFun.ts`, `usePumpFunClaims.ts`) IF the `PumpFunProvider` class doesn't import from them. If it does, leave them.
- Update `packages/providers/src/index.ts` to remove deprecated exports

### 6. Verify provider addition DX

Create a brief test: add a comment block in `app/world/providers.ts` showing how a new provider would be added:
```ts
// To add a new data provider:
// 1. Create a class implementing DataProvider from @web3viz/core
// 2. See PumpFunProvider or MockProvider for reference
// 3. Add it to this array:
//    new MyProvider({ wsUrl: '...' }),
// The provider's categories will automatically appear in the filter sidebar
```

## Reference Files

- `app/world/page.tsx` — Main page
- `app/world/providers.ts` — Provider config (created in task 23)
- `packages/providers/src/useProviders.ts` — New hook (task 22)
- `packages/providers/src/pump-fun/PumpFunProvider.ts` — PumpFun provider (task 21)
- `packages/providers/src/mock/MockProvider.ts` — Mock provider
- `features/World/ProtocolFilterSidebar.tsx` — Filter sidebar
- `features/World/LiveFeed.tsx` — Live feed
- `features/World/StatsBar.tsx` — Stats bar
- `features/World/ForceGraph.tsx` — Force graph
- `app/embed/` — Embed pages (check for breakage)

## Verification

1. `npx turbo typecheck` — zero errors
2. `npx turbo build` — clean build
3. `npm run dev` — all features work at localhost:3100
4. Browser console — no errors
5. With MockProvider enabled — two provider sections in sidebar, mixed events in feed
