# Task 21: PumpFun Provider Class

## Context

The PumpFun data integration is currently spread across two React hooks:
- `packages/providers/src/pump-fun/usePumpFun.ts` — WebSocket to `wss://pumpportal.fun/api/data` for token launches + trades
- `packages/providers/src/pump-fun/usePumpFunClaims.ts` — Solana RPC WebSocket (Helius) for claim event monitoring

These hooks work but they don't implement the `DataProvider` interface from `@web3viz/core`. The `MockProvider` at `packages/providers/src/mock/MockProvider.ts` shows the correct pattern — an imperative class with `connect()`, `disconnect()`, `onEvent()`, `getStats()`, etc.

We need to consolidate PumpFun into a single `PumpFunProvider` class that properly implements the `DataProvider` interface, so it can be registered in the provider registry like any other data source.

## What to Build

### 1. `packages/providers/src/pump-fun/PumpFunProvider.ts` (NEW)

A class that implements `DataProvider` from `@web3viz/core`. It manages two internal WebSocket connections (PumpPortal + Solana RPC) and emits unified `DataProviderEvent` objects.

**Constructor**:
```ts
constructor(options?: {
  /** Solana RPC WebSocket URL for claims monitoring */
  rpcWsUrl?: string;
  /** Maximum events to keep in memory */
  maxEvents?: number;
})
```

**Required DataProvider fields** (see `packages/core/src/providers/index.ts`):
- `id`: `'pumpfun'`
- `name`: `'PumpFun'`
- `sourceConfig`: Use the existing pumpfun source from `@web3viz/core` categories (`SOURCE_CONFIGS`)
- `categories`: The PumpFun categories from `CATEGORY_CONFIGS` filtered by `sourceId === 'pumpfun'`

**Internal streams** (extract logic from existing hooks):

1. **Trades stream** — PumpPortal WebSocket (`wss://pumpportal.fun/api/data`)
   - Subscribe to `subscribeNewToken` and `subscribeTokenTrade` with `keys: ['allTrades']`
   - On token create: emit event with category `'launches'` or `'agentLaunches'` (use `isAgentLaunch()` keyword detection already in the existing hook)
   - On trade: emit event with category `'trades'`
   - Maintain token cache (mint → name/symbol), topTokens accumulator, traderEdges accumulator
   - Auto-reconnect on close (3s delay)

2. **Claims stream** — Solana RPC WebSocket
   - Connect to `rpcWsUrl` (default: `wss://atlas-mainnet.helius-rpc.com?api-key=1be79a41-8a57-4498-a35f-3b77c53db786` — the key already in the existing code)
   - Subscribe via `logsSubscribe` to the PumpFun claims program `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
   - Parse claim instructions from logs (extract wallet, mint, solAmount, tokenAmount)
   - Emit events with category `'claimsWallet'`
   - Track seen wallets in a Set for first-claim detection — if wallet not in set, also emit a `'claimsFirst'` event
   - For GitHub claims: check for `SocialFeePdaClaimed` discriminator (`3212c141edd2eaec`) in Program data logs — emit as `'claimsGithub'` instead of `'claimsWallet'`
   - Auto-reconnect on close (5s delay)

**Event emission**: Use the `onEvent(callback)` pattern from DataProvider. Internally maintain a `Set<(event: DataProviderEvent) => void>` of listeners. When a raw event is processed, construct a `DataProviderEvent` and call all listeners. Events must have:
- `id`: transaction signature (or `signature + '-first'` for first claim duplicate)
- `category`: one of the pumpfun categories
- `source`: `'pumpfun'`
- `timestamp`: `Date.now()`
- `label`: token symbol/name for launches/trades, `'Wallet Claim'` / `'GitHub Claim'` / `'First Claim'` for claims
- `amount`: SOL amount (divide lamports by 1e9 for trades)
- `address`: trader public key or claimer wallet
- `mint`: token mint address

**Stats** (`getStats()` returns `DataProviderStats`):
- `counts`: per-category event counts (launches, agentLaunches, trades, claimsWallet, claimsGithub, claimsFirst)
- `totalVolumeSol`: accumulated from trades
- `totalTransactions`: total events across all categories
- `totalAgents`: count of unique traders seen (or just topTokens.length)
- `recentEvents`: last N unified events (default 200)
- `topTokens`: top 8 tokens by volume (same logic as existing hook)
- `traderEdges`: trader→token edges for force graph (same logic as existing hook)
- `rawEvents`: last N raw events

**Connections** (`getConnections()` returns `ConnectionState[]`):
```ts
[
  { name: 'PumpPortal', connected: this.tradesWsConnected },
  { name: 'Solana RPC', connected: this.claimsWsConnected },
]
```

**Paused/Enabled**: Standard boolean flags. When paused, incoming WS messages are ignored (don't disconnect).

### 2. Update `packages/providers/src/pump-fun/index.ts`

Re-export the new `PumpFunProvider` class. Keep the old hooks exported for backward compatibility during migration:
```ts
export { PumpFunProvider } from './PumpFunProvider';
// Legacy hooks — will be removed after migration
export { usePumpFun } from './usePumpFun';
export { usePumpFunClaims } from './usePumpFunClaims';
```

### 3. Update `packages/providers/src/index.ts`

Add `PumpFunProvider` to the barrel exports:
```ts
export { PumpFunProvider } from './pump-fun/PumpFunProvider';
```

## Reference Files

Read these files to understand the patterns:
- `packages/core/src/providers/index.ts` — DataProvider interface and registry
- `packages/core/src/types/index.ts` — DataProviderEvent, DataProviderStats, TopToken, TraderEdge, etc.
- `packages/core/src/categories/index.ts` — SOURCE_CONFIGS, CATEGORY_CONFIGS, getCategoriesForSource()
- `packages/providers/src/mock/MockProvider.ts` — Reference implementation of DataProvider (follow this pattern)
- `packages/providers/src/pump-fun/usePumpFun.ts` — Existing trade/launch logic to extract
- `packages/providers/src/pump-fun/usePumpFunClaims.ts` — Existing claims logic to extract

## Important Notes

- This is a **class**, not a React hook. It should work outside React (Node.js, tests, etc.)
- Use native `WebSocket` (browser) — no external dependencies needed
- The class must be framework-agnostic. No `useState`, `useRef`, `useEffect`.
- Follow the `MockProvider` pattern closely for the event emission and lifecycle methods
- Do NOT delete the existing hooks yet — they'll be removed in a later task after the UI migration
- Do NOT modify any UI files or the app — this task is purely the provider class

## Verification

After creating the provider class:
1. Run `cd /workspaces/visualize-web3-realtime && npx turbo typecheck` — should pass with no errors
2. The PumpFunProvider should be importable: `import { PumpFunProvider } from '@web3viz/providers'`
3. Verify it compiles by checking the mock provider compiles too (same interface)
