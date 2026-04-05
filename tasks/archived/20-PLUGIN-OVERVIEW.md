# Multi-Chain Plugin Architecture — Task Execution Order

Run these tasks sequentially in new Claude Code sessions. Each task builds on the previous.

## Phase 1: Core Infrastructure
1. `21-generalize-core-types.md` — Make all types chain-agnostic (remove Solana-specific fields)
2. `22-provider-registry-hook.md` — Rewrite useDataProvider to consume the provider registry
3. `23-refactor-pumpfun-provider.md` — Extract PumpFun into a standalone DataProvider plugin

## Phase 2: Data Providers
4. `24-ethereum-provider.md` — Ethereum mainnet provider (Uniswap swaps, token transfers)
5. `25-base-provider.md` — Base chain provider (DEX activity, token launches)
6. `26-agent-provider.md` — AI Agent activity provider (launches, interactions)
7. `27-erc8004-provider.md` — ERC-8004 tokenized asset provider
8. `28-cex-volume-provider.md` — CEX volume provider (Binance, exchange feeds)

## Phase 3: UI Generalization
9. `29-dynamic-ui-components.md` — Make all UI components provider-aware and dynamic
10. `30-provider-config-panel.md` — Add a provider management panel (enable/disable/configure)

## Architecture Principles
- Every provider is a self-contained module that implements the `DataProvider` interface from `@web3viz/core`
- Providers register their own categories (colors, icons, labels) via the category system
- The app discovers providers at runtime via the registry — zero hardcoded imports in the visualization layer
- Types use chain-agnostic naming: `tokenAddress` not `mint`, `volume` not `volumeSol`, `chain` field on every event
- Each provider lives in `providers/` directory at the app root with a standard structure
- The `.env.local` file holds all API keys/endpoints; providers read from `process.env.NEXT_PUBLIC_*`

## Environment Variables (`.env.local`)
```
# Solana
NEXT_PUBLIC_SOLANA_WS_URL=wss://mainnet.helius-rpc.com/?api-key=8bf1013b-d8a1-4bcb-8485-0299f6b0d20e
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=8bf1013b-d8a1-4bcb-8485-0299f6b0d20e

# Ethereum
NEXT_PUBLIC_ETH_WS_URL=wss://...
NEXT_PUBLIC_ETH_RPC_URL=https://...

# Base
NEXT_PUBLIC_BASE_WS_URL=wss://...
NEXT_PUBLIC_BASE_RPC_URL=https://...
```

## Current Codebase Context
- Next.js 14 app with React 18, Three.js, d3-force, Framer Motion
- Monorepo with `packages/core` (types, engine, categories, provider interface), `packages/ui`, `packages/react-graph`
- `packages/core` already defines `DataProvider` interface, registry, and extensible categories — but the app ignores it
- `hooks/useDataProvider.ts` is hardwired to `usePumpFun` + `usePumpFunClaims`
- All visualization is in `features/World/` — ForceGraph, LiveFeed, StatsBar, TimelineBar, ProtocolFilterSidebar
- Inline styles throughout (no CSS framework for components), IBM Plex Mono font
