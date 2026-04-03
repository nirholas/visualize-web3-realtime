# Provider Plugin System — Task Execution Order

Run these tasks sequentially in new Claude Code chats. Each task builds on the previous. These tasks refactor the app from hardcoded PumpFun hooks into a general-purpose provider plugin system where any data source can be added with minimal code.

## What We're Building

A plugin architecture where data providers (PumpFun, Base, Ethereum, CEX, etc.) are self-contained modules that implement the `DataProvider` interface from `@web3viz/core`. Each provider declares its own categories, manages its own connections, and emits unified events. The UI is fully provider-agnostic — it renders whatever providers are registered.

## Current State

- `@web3viz/core` already has `DataProvider` interface, registry, source/category configs
- `@web3viz/providers` has React hooks (`usePumpFun`, `usePumpFunClaims`) + a `MockProvider` class
- The hooks don't implement the `DataProvider` interface — they're consumed directly by `useDataProvider`
- `useDataProvider` hardcodes PumpFun + claims aggregation
- UI components (`ProtocolFilterSidebar`, `LiveFeed`, `StatsBar`) are semi-hardcoded to PumpFun categories
- Source configs already exist for: pumpfun, ethereum, base, agents, erc8004, cex

## Architecture Target

```
Provider Classes (implement DataProvider)
    │
    ├── PumpFunProvider (launches, agent launches, trades, claims)
    ├── BaseProvider (future)
    ├── EthereumProvider (future)
    └── ...
    │
    ▼
Provider Registry (@web3viz/core)
    │
    ▼
useProviders() hook — aggregates all registered providers
    │
    ▼
UI Components (provider-agnostic, driven by registry)
    ├── ProtocolFilterSidebar (grouped by provider)
    ├── LiveFeed (unified events)
    ├── StatsBar (aggregated stats)
    └── ForceGraph (nodes from all providers)
```

## Task Order

### Phase 1: PumpFun Provider Class
1. `21-pumpfun-provider-class.md` — Consolidate usePumpFun + usePumpFunClaims into a single PumpFunProvider class that implements DataProvider

### Phase 2: Provider Hook & Registration
2. `22-use-providers-hook.md` — Create useProviders() hook that consumes registered DataProvider instances, replacing useDataProvider

### Phase 3: Provider-Agnostic UI
3. `23-provider-agnostic-ui.md` — Update ProtocolFilterSidebar, LiveFeed, StatsBar, and world/page.tsx to be driven by provider registry

### Phase 4: Verification & Polish
4. `24-provider-verification.md` — End-to-end verification, fix type errors, ensure MockProvider works as second provider in sidebar
