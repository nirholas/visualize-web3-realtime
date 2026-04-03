# Provider Plugin System — Task Execution Order

Run these tasks **sequentially** in new Claude Code chats. Each task builds on the previous.

## What We're Building

A general-purpose plugin architecture where data providers (PumpFun, Base, Ethereum, CEX, etc.) are self-contained classes implementing the `DataProvider` interface from `@web3viz/core`. Each provider declares its own categories, manages its own WebSocket/API connections, and emits unified events. The UI renders whatever providers are registered — no hardcoding.

## Current State

- `@web3viz/core` has `DataProvider` interface, registry, source/category configs for 6 providers
- `@web3viz/providers` has React hooks (`usePumpFun`, `usePumpFunClaims`) + `MockProvider` class + `useDataProvider` aggregator
- `hooks/` has root-level duplicates + stub provider hooks for all 6 sources
- `app/world/page.tsx` uses `hooks/useDataProvider` which hardcodes PumpFun
- The `DataProvider` class interface exists but only `MockProvider` implements it
- Real data flows through React hooks, not through the class interface

## Target Architecture

```
DataProvider classes (imperative, framework-agnostic)
    ├── PumpFunProvider  (launches, agent launches, trades, claims)
    ├── MockProvider     (dev/testing)
    ├── BaseProvider     (future)
    ├── EthereumProvider (future)
    └── ...
         │
         ▼
    useProviders() hook  ← bridges classes into React
         │
         ▼
    UI (provider-agnostic)
    ├── ProtocolFilterSidebar (grouped by source)
    ├── LiveFeed (unified events)
    ├── StatsBar (aggregated)
    └── ForceGraph (nodes from all providers)
```

## Tasks

| # | File | Summary |
|---|------|---------|
| 21 | `21-pumpfun-provider-class.md` | Create `PumpFunProvider` class implementing `DataProvider` — consolidates usePumpFun + usePumpFunClaims into one imperative class with both WebSocket connections |
| 22 | `22-use-providers-hook.md` | Create `useProviders()` hook — bridges `DataProvider[]` into React, manages lifecycle, aggregates events/stats, category filtering |
| 23 | `23-provider-agnostic-ui.md` | Wire UI to new system — page uses `useProviders`, sidebar groups by source, LiveFeed accepts unified events, delete old hooks |
| 24 | `24-provider-verification.md` | End-to-end verification — fix all type/build errors, prove MockProvider works as 2nd source, clean dead code, full QA checklist |

## Adding a New Provider (after these tasks)

```ts
// app/world/providers.ts
import { PumpFunProvider } from '@web3viz/providers';
import { MyChainProvider } from './my-chain-provider';

export const providers = [
  new PumpFunProvider(),
  new MyChainProvider({ wsUrl: 'wss://...' }),
];
// That's it. MyChainProvider's categories appear in sidebar automatically.
```
