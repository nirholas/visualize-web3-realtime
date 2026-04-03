# Task 21: PumpFun Provider Class

## Context

PumpFun data is currently scattered across multiple locations:
- `hooks/usePumpFun.ts` — WebSocket to `wss://pumpportal.fun/api/data` for token launches + trades (React hook)
- `hooks/usePumpFunClaims.ts` — Solana RPC WebSocket for claim monitoring (React hook)
- `hooks/providers/pumpfun.ts` — Wrapper hook (`usePumpFunProvider`) that combines the above two and converts to unified events
- `packages/providers/src/pump-fun/usePumpFun.ts` — Duplicate of the root hook
- `packages/providers/src/pump-fun/usePumpFunClaims.ts` — Duplicate claims hook

None of these implement the `DataProvider` interface from `@web3viz/core`. The `MockProvider` at `packages/providers/src/mock/MockProvider.ts` shows the correct pattern — an imperative class with `connect()`, `disconnect()`, `onEvent()`, `getStats()`, etc.

We need to consolidate everything into a single `PumpFunProvider` class that properly implements `DataProvider`. This class is framework-agnostic (no React, no hooks) so it can be used in Node.js, tests, or React via a thin hook wrapper.

## Reference Files — Read These First

- `packages/core/src/providers/index.ts` — `DataProvider` interface and registry
- `packages/core/src/types/index.ts` — `DataProviderEvent`, `DataProviderStats`, `TopToken`, `TraderEdge`, `Token`, `Trade`, `Claim`, `RawEvent`
- `packages/core/src/categories/index.ts` — `SOURCE_CONFIGS`, `CATEGORY_CONFIGS`, `SourceConfig`, `CategoryConfig`, `getCategoriesForSource()`
- `packages/providers/src/mock/MockProvider.ts` — **Reference implementation** of `DataProvider` (follow this pattern closely)
- `hooks/usePumpFun.ts` — Existing trade/launch WebSocket logic to extract
- `hooks/usePumpFunClaims.ts` — Existing claims WebSocket logic to extract
- `hooks/providers/pumpfun.ts` — Existing conversion logic (events → unified format, source/category configs)

## What to Build

### 1. `packages/providers/src/pump-fun/PumpFunProvider.ts` (NEW)

A class implementing `DataProvider` from `@web3viz/core`.

**Constructor**:
```ts
interface PumpFunProviderOptions {
  /** Solana RPC WebSocket URL for claims monitoring */
  rpcWsUrl?: string;
  /** Max events kept in memory (default 200) */
  maxEvents?: number;
  /** Max top tokens tracked (default 8) */
  maxTopTokens?: number;
}
```

**DataProvider identity**:
- `id`: `'pumpfun'`
- `name`: `'PumpFun'`
- `sourceConfig`: Use the existing pumpfun `SourceConfig` from `@web3viz/core` (`SOURCE_CONFIGS.find(s => s.id === 'pumpfun')` or inline: `{ id: 'pumpfun', label: 'PumpFun', color: '#a78bfa', icon: '⚡', description: 'Solana token launches & trades via PumpPortal' }`)
- `categories`: Filter `CATEGORY_CONFIGS` from `@web3viz/core` where `sourceId === 'pumpfun'`, giving: launches, agentLaunches, trades, claimsWallet, claimsGithub, claimsFirst

**Internal connections** (managed as plain class fields, no React):

1. **Trades WebSocket** — `wss://pumpportal.fun/api/data`
   - On open: send `{ method: 'subscribeNewToken' }` and `{ method: 'subscribeTokenTrade', keys: ['allTrades'] }`
   - On message: parse JSON, detect token creates vs trades (same logic as `hooks/usePumpFun.ts`)
   - Agent detection: use `isAgentLaunch(name, symbol)` regex already in existing code (`/\b(agent|ai\b|gpt|bot|auto|llm|claude|openai|chatgpt|neural|sentient|autonomous)/i`)
   - Maintain: `tokenCache` (Map<mint, {name, symbol}>), `tokenAcc` (Map<mint, TopToken>), `traderAcc` (Map<key, TraderEdge>)
   - Auto-reconnect on close after 3s

2. **Claims WebSocket** — Solana RPC (configurable URL, default: `wss://atlas-mainnet.helius-rpc.com?api-key=1be79a41-8a57-4498-a35f-3b77c53db786`)
   - On open: send `logsSubscribe` for PumpFun program `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
   - Parse claim instructions from `Program data:` logs (decode base64 → hex discriminator):
     - Wallet claims: discriminators `7a027f010ebf0caf`, `a537817004b3ca28`, `e2d6f62107f293e5`, `e8f5c2eeeada3a59`
     - GitHub claims: discriminator `3212c141edd2eaec`
   - First-claim tracking: maintain `seenWallets` Set. If wallet not seen before → `isFirstClaim: true`
   - Auto-reconnect on close after 5s

**Event emission**:
- Maintain `Set<(event: DataProviderEvent) => void>` of listeners
- `onEvent(cb)` adds listener, returns unsubscribe function
- When raw data arrives and is parsed, construct `DataProviderEvent`:
  - `id`: transaction signature (append `-first` for first claim events)
  - `category`: `'launches'` | `'agentLaunches'` | `'trades'` | `'claimsWallet'` | `'claimsGithub'` | `'claimsFirst'`
  - `source`: `'pumpfun'`
  - `timestamp`: `Date.now()`
  - `label`: token symbol for launches/trades, `'Wallet Claim'`/`'GitHub Claim'`/`'First Claim'` for claims
  - `amount`: SOL amount (trades: `solAmount / 1e9`)
  - `address`: trader public key or claimer wallet
  - `mint`: token mint address
- Also emit first-claim as a second event when applicable (same as `hooks/providers/pumpfun.ts` does)
- If `paused`, ignore incoming messages (don't disconnect)

**Stats** (`getStats()` → `DataProviderStats`):
- `counts`: per-category counts (increment on each event)
- `totalVolumeSol`: accumulated from trades
- `totalTransactions`: total events
- `totalAgents`: `topTokens.length`
- `recentEvents`: last N `DataProviderEvent` objects (ring buffer)
- `topTokens`: top 8 by volume (re-sort from `tokenAcc` on each trade)
- `traderEdges`: edges from `traderAcc`, filtered to top token mints, max 5000
- `rawEvents`: last N `RawEvent` objects

**Connections** (`getConnections()` → `ConnectionState[]`):
```ts
[
  { name: 'PumpPortal', connected: /* trades ws state */ },
  { name: 'Solana RPC', connected: /* claims ws state */ },
]
```

**Lifecycle**: `connect()` opens both WebSockets. `disconnect()` closes both, clears reconnect timers.

### 2. Update `packages/providers/src/pump-fun/index.ts`

```ts
export { PumpFunProvider, type PumpFunProviderOptions } from './PumpFunProvider';
// Legacy hooks (to be removed in task 23)
export { usePumpFun } from './usePumpFun';
export { usePumpFunClaims } from './usePumpFunClaims';
```

### 3. Update `packages/providers/src/index.ts`

Add PumpFunProvider to barrel exports:
```ts
export { PumpFunProvider, type PumpFunProviderOptions } from './pump-fun/PumpFunProvider';
```

## Important Notes

- **No React**: This is a plain TypeScript class. No `useState`, `useRef`, `useEffect`. Use class fields and methods.
- **Follow MockProvider**: Study `packages/providers/src/mock/MockProvider.ts` and mirror its structure.
- **No new dependencies**: Use native browser `WebSocket`. No `@solana/web3.js` needed — the claims hook already uses raw WebSocket JSON-RPC.
- **Do NOT delete** existing hook files — they'll be cleaned up in task 23/24.
- **Do NOT modify** UI, app, or page files.

## Verification

1. `cd /workspaces/visualize-web3-realtime && npx turbo typecheck` — zero errors
2. `PumpFunProvider` importable via `import { PumpFunProvider } from '@web3viz/providers'`
3. Verify MockProvider still compiles (same interface)
