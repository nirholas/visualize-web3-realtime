# @web3viz/providers

Data provider infrastructure. Connects to blockchain data sources and normalizes events into `DataProviderEvent` for the visualization.

## Structure

- `src/shared/` — Core infrastructure:
  - `WebSocketManager.ts` — Reconnecting WebSocket with exponential backoff, heartbeat
  - `BoundedMap.ts` — LRU-evicting `BoundedMap` and `BoundedSet` (use these, never plain `Map`/`Set` for caches)
  - `validate.ts` — Runtime validators for external data (`isObject`, `getString`, `getNumber`, address validators)
- `src/ethereum/` — Ethereum/EVM provider
- `src/pump-fun/` — Solana PumpFun provider
- `src/cex-volume/` — Centralized exchange volume
- `src/agents/` — Agent event detection and mock data
- `src/mock/` — Mock provider for testing/demos
- `src/custom/` — User-defined custom providers
- `src/useProviders.ts` — React hook aggregating all active providers

## Key Conventions

- All external data **must** be validated with `validate.ts` helpers before use
- WebSocket connections go through `WebSocketManager` (never raw `new WebSocket()`)
- Caches must use `BoundedMap`/`BoundedSet` with explicit capacity
- Peer dependency: `react ^18`

## Testing

```bash
npm test -- --run packages/providers
```

## Type-checking

```bash
npx tsc --noEmit -p packages/providers/tsconfig.json
```
