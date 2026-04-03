# Task 25: Base Chain Data Provider

## Goal
Create a Base (Coinbase L2) data provider that visualizes real-time DEX activity, token launches, and transfers. Self-registers with the `@web3viz/core` provider registry.

## Prerequisites
- Tasks 21-23 must be complete
- Task 24 (Ethereum provider) should be complet e — you can reuse patterns and ABI decoding utils

## Architecture

### Data Sources

Base is an OP Stack L2 — it uses the same JSON-RPC WebSocket API as Ethereum.

**Primary**: `process.env.NEXT_PUBLIC_BASE_WS_URL` (e.g. `wss://base-rpc.publicnode.com`)
**Fallback**: `wss://base-rpc.publicnode.com`

### Contracts to Monitor

```typescript
// Aerodrome (largest Base DEX — Uniswap V2-style)
const AERODROME_SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';

// Uniswap V3 on Base
const UNISWAP_V3_SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';

// BaseSwap (another popular Base DEX)
// Uses same Uniswap V2 swap topic

// ERC-20 Transfer
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
```

### Well-Known Base Tokens

```typescript
const KNOWN_BASE_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  '0x4200000000000000000000000000000000000006': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA': { symbol: 'USDbC', name: 'USD Base Coin', decimals: 6 },
  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  '0x940181a94A35A4569E4529A3CDfB74e38FD98631': { symbol: 'AERO', name: 'Aerodrome', decimals: 18 },
  '0x532f27101965dd16442E59d40670FaF5eBB142E4': { symbol: 'BRETT', name: 'Brett', decimals: 18 },
  '0xfA980cEd6895AC314E7dE34Ef1bFAE90a5AdD21b': { symbol: 'PRIME', name: 'Echelon Prime', decimals: 18 },
};
```

### Event Categories

| Category ID | Label | Icon | Color | Source |
|---|---|---|---|---|
| `baseSwaps` | Base Swaps | ↔ | `#0052FF` (Base blue) | DEX swap events |
| `baseTransfers` | Base Transfers | → | `#3B7CFF` | Large ERC-20 transfers |
| `baseMints` | Base Mints | ✦ | `#6CA0FF` | Token creation (Transfer from 0x0) |

## Files to Create

### 1. `providers/base/index.ts`

Same pattern as the Ethereum provider. Key differences:
- `id = 'base'`
- `name = 'Base'`
- `chains = ['base']`
- `categories = BASE_CATEGORIES`
- Stats track `totalVolume.base`
- Events have `chain: 'base'`, `nativeSymbol: 'ETH'` (Base uses ETH as native)

### 2. `providers/base/categories.ts`

```typescript
import type { CategoryConfig } from '@web3viz/core';

export const BASE_CATEGORIES: CategoryConfig[] = [
  { id: 'baseSwaps',     label: 'Base Swaps',     icon: '↔', color: '#0052FF' },
  { id: 'baseTransfers', label: 'Base Transfers',  icon: '→', color: '#3B7CFF' },
  { id: 'baseMints',     label: 'Base Mints',      icon: '✦', color: '#6CA0FF' },
];
```

### 3. `providers/base/base-ws.ts`

This should follow the exact same pattern as `providers/ethereum/ethereum-ws.ts` but connecting to the Base RPC. To avoid code duplication, consider:

**Option A (preferred)**: Create a shared `providers/_shared/evm-ws.ts` utility class that both Ethereum and Base providers can use. It accepts:
```typescript
interface EvmWebSocketConfig {
  wsUrl: string;
  fallbackUrl: string;
  chain: string;
  providerId: string;
  nativeSymbol: string;
  knownTokens: Record<string, { symbol: string; name: string; decimals: number }>;
  swapTopics: string[];
  transferTopic: string;
  minTransferValue: bigint;
  onEvent: (event: DataProviderEvent) => void;
  onSwap: (swap: SwapInfo) => void;
  isPaused: () => boolean;
}
```

Then both `providers/ethereum/ethereum-ws.ts` and `providers/base/base-ws.ts` become thin wrappers that instantiate this shared class with chain-specific config.

**Option B**: Copy the Ethereum WS class and change the constants. Simpler but duplicated.

If you go with Option A, also refactor the Ethereum provider to use the shared class.

### 4. `providers/base/constants.ts`

Known tokens, swap topics, and Base-specific configuration.

## Shared EVM Utility (if using Option A)

### `providers/_shared/evm-ws.ts`

A generic EVM WebSocket class that:
1. Connects to any EVM-compatible WebSocket RPC
2. Subscribes to swap + transfer log topics
3. Decodes Uniswap V2/V3 style swap events
4. Decodes ERC-20 transfer events
5. Labels tokens from a provided lookup map
6. Emits `DataProviderEvent` objects with the correct chain/provider metadata
7. Auto-reconnects with configurable delay
8. Throttles events (max ~10/sec configurable)

This shared class should be usable for any EVM chain (Ethereum, Base, Arbitrum, Polygon, etc.) by just passing different config.

## Update `providers/index.ts`

```typescript
import './solana-pumpfun';
import './ethereum';
import './base';
```

## Update `.env.local`

```
NEXT_PUBLIC_BASE_WS_URL=wss://base-rpc.publicnode.com
```

## Verification

1. Start dev server
2. Open `/world`
3. Should see Base connection indicator alongside Ethereum and PumpFun
4. Base swap events appear in live feed with Base blue icons
5. Force graph shows Base tokens as separate hub nodes
6. Base categories appear in the filter sidebar
7. Stats show Base volume

## Important Notes
- Base has faster block times (~2s) and more transactions than Ethereum mainnet. Throttling is important.
- The shared EVM utility (Option A) is strongly recommended — it sets the pattern for easily adding Arbitrum, Polygon, Optimism, etc. in the future.
- Public Base RPCs are generally more generous with rate limits than Ethereum mainnet.
- AERO (Aerodrome) is the dominant DEX on Base — most swap events will come from Aerodrome pools.
