# Task 24: Ethereum Mainnet Data Provider

## Goal
Create an Ethereum mainnet data provider that visualizes real-time DEX swaps (Uniswap V2/V3), token transfers, and large transactions via WebSocket. Self-registers with the `@web3viz/core` provider registry.

## Prerequisites
- Tasks 21-23 must be complete (generalized types, registry hook, PumpFun refactored)

## Architecture

### Data Sources

**Option A (recommended): Public Ethereum WebSocket + Log Filtering**
- Connect to `process.env.NEXT_PUBLIC_ETH_WS_URL` (e.g. Alchemy, Infura, or public WSS)
- Use `eth_subscribe` with `logs` filter for specific contract events
- Parse swap/transfer events from log topics

**Option B: Alchemy/Infura Enhanced APIs**
- Use Alchemy's `alchemy_pendingTransactions` or `alchemy_minedTransactions` subscriptions
- Richer data but vendor-specific

Use Option A as the primary approach with well-known contract addresses.

### Contracts to Monitor

```typescript
const UNISWAP_V2_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const UNISWAP_V3_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

// Swap event topic (same for V2 and V3)
const UNISWAP_V2_SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
const UNISWAP_V3_SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';

// ERC-20 Transfer event
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Large ETH transfers via newPendingTransactions (value > threshold)
```

### Event Categories

| Category ID | Label | Icon | Color | Source |
|---|---|---|---|---|
| `ethSwaps` | ETH Swaps | ↔ | `#627EEA` (ETH blue) | Uniswap V2/V3 Swap events |
| `ethTransfers` | ETH Transfers | → | `#8B9DC3` | ERC-20 Transfer events (large) |
| `ethMints` | ETH Mints | ✦ | `#C99BFF` | Token creation / first transfer from zero |

## Files to Create

### 1. `providers/ethereum/index.ts`

```typescript
/**
 * Ethereum Mainnet Data Provider
 *
 * Connects to an Ethereum WebSocket RPC to stream:
 * - Uniswap V2/V3 swap events
 * - Large ERC-20 transfers
 * - Token mints (Transfer from 0x0)
 *
 * Self-registers with @web3viz/core on import.
 */

import {
  registerProvider,
  type DataProvider,
  type DataProviderEvent,
  type DataProviderStats,
  type ConnectionState,
  type CategoryConfig,
  type TopToken,
  type TraderEdge,
  type RawEvent,
} from '@web3viz/core';

import { ETH_CATEGORIES } from './categories';
import { EthereumWebSocket } from './ethereum-ws';

class EthereumProvider implements DataProvider {
  readonly id = 'ethereum';
  readonly name = 'Ethereum';
  readonly chains = ['ethereum'];
  readonly categories: CategoryConfig[] = ETH_CATEGORIES;

  private listeners = new Set<(event: DataProviderEvent) => void>();
  private paused = false;
  private ws: EthereumWebSocket;

  private stats: DataProviderStats = {
    counts: {},
    totalVolume: { ethereum: 0 },
    totalTransactions: 0,
    totalAgents: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
    rawEvents: [],
  };

  // Top token accumulator: tokenAddress → TopToken
  private tokenAcc = new Map<string, TopToken>();
  // Trader edge accumulator: "trader:token" → TraderEdge
  private traderAcc = new Map<string, TraderEdge>();

  constructor() {
    this.ws = new EthereumWebSocket({
      onEvent: (event) => this.handleEvent(event),
      onSwap: (swap) => this.handleSwap(swap),
      isPaused: () => this.paused,
    });
  }

  connect(): void { this.ws.connect(); }
  disconnect(): void { this.ws.disconnect(); }
  getStats(): DataProviderStats { return { ...this.stats }; }

  getConnections(): ConnectionState[] {
    return [{ name: 'Ethereum', connected: this.ws.isConnected() }];
  }

  onEvent(callback: (event: DataProviderEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  setPaused(paused: boolean): void { this.paused = paused; }
  isPaused(): boolean { return this.paused; }

  private handleEvent(event: DataProviderEvent): void {
    if (this.paused) return;
    this.stats.counts[event.category] = (this.stats.counts[event.category] || 0) + 1;
    if (event.amount) {
      this.stats.totalVolume.ethereum = (this.stats.totalVolume.ethereum || 0) + event.amount;
    }
    this.stats.totalTransactions++;
    this.stats.recentEvents = [event, ...this.stats.recentEvents].slice(0, 300);
    for (const listener of this.listeners) listener(event);
  }

  private handleSwap(swap: { tokenAddress: string; symbol: string; name: string; trader: string; volume: number }) {
    // Update top tokens
    const existing = this.tokenAcc.get(swap.tokenAddress);
    if (existing) {
      existing.trades++;
      existing.volume += swap.volume;
    } else {
      this.tokenAcc.set(swap.tokenAddress, {
        tokenAddress: swap.tokenAddress,
        symbol: swap.symbol || swap.tokenAddress.slice(0, 8),
        name: swap.name || swap.symbol || 'Unknown',
        chain: 'ethereum',
        trades: 1,
        volume: swap.volume,
        nativeSymbol: 'ETH',
      });
    }

    // Update trader edges
    const edgeKey = `${swap.trader}:${swap.tokenAddress}`;
    const existingEdge = this.traderAcc.get(edgeKey);
    if (existingEdge) {
      existingEdge.trades++;
      existingEdge.volume += swap.volume;
    } else {
      this.traderAcc.set(edgeKey, {
        trader: swap.trader,
        tokenAddress: swap.tokenAddress,
        chain: 'ethereum',
        trades: 1,
        volume: swap.volume,
      });
    }

    // Rebuild sorted top tokens
    const sorted = Array.from(this.tokenAcc.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
    const topAddrs = new Set(sorted.map(t => t.tokenAddress));

    this.stats.topTokens = sorted;
    this.stats.traderEdges = Array.from(this.traderAcc.values())
      .filter(e => topAddrs.has(e.tokenAddress))
      .slice(0, 5000);
    this.stats.totalAgents = sorted.length;
  }
}

const provider = new EthereumProvider();
registerProvider(provider);
export { provider as ethereumProvider };
```

### 2. `providers/ethereum/categories.ts`

```typescript
import type { CategoryConfig } from '@web3viz/core';

export const ETH_CATEGORIES: CategoryConfig[] = [
  { id: 'ethSwaps',     label: 'ETH Swaps',     icon: '↔', color: '#627EEA' },
  { id: 'ethTransfers', label: 'ETH Transfers',  icon: '→', color: '#8B9DC3' },
  { id: 'ethMints',     label: 'ETH Mints',      icon: '✦', color: '#C99BFF' },
];
```

### 3. `providers/ethereum/ethereum-ws.ts`

Plain TypeScript class that:

1. **Connects** to `process.env.NEXT_PUBLIC_ETH_WS_URL` (fallback: `wss://ethereum-rpc.publicnode.com`)
2. **Subscribes** to logs via JSON-RPC:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "eth_subscribe",
     "params": ["logs", { "topics": [["<SWAP_V2_TOPIC>", "<SWAP_V3_TOPIC>", "<TRANSFER_TOPIC>"]] }]
   }
   ```
3. **Parses** incoming log events:
   - **Uniswap V2 Swap**: Decode `amount0In`, `amount1In`, `amount0Out`, `amount1Out` from data. The log address is the pair contract. Emit as `ethSwaps` category.
   - **Uniswap V3 Swap**: Decode `amount0`, `amount1`, `sqrtPriceX96`, `liquidity`, `tick` from data. Emit as `ethSwaps` category.
   - **ERC-20 Transfer**: Decode `from` (topic[1]), `to` (topic[2]), `value` (data). If `from` is `0x0000...0000`, emit as `ethMints`. Otherwise emit as `ethTransfers` if value exceeds a threshold.
4. **Emits** `DataProviderEvent` objects:
   ```typescript
   {
     id: `${txHash}-${logIndex}`,
     providerId: 'ethereum',
     category: 'ethSwaps',
     chain: 'ethereum',
     timestamp: Date.now(),
     label: 'USDC/WETH Swap', // or token symbol if known
     amount: ethAmount,
     nativeSymbol: 'ETH',
     address: senderAddress,
     tokenAddress: pairOrTokenAddress,
   }
   ```
5. **Auto-reconnects** on close (3s delay)
6. **Rate limiting**: Buffer events and emit max ~10 per second to avoid overwhelming the UI

### 4. `providers/ethereum/constants.ts`

```typescript
// Well-known token addresses for labeling
export const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
  '0x514910771AF9Ca656af840dff83E8264EcF986CA': { symbol: 'LINK', name: 'Chainlink', decimals: 18 },
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': { symbol: 'UNI', name: 'Uniswap', decimals: 18 },
  // Add more as needed
};

// Uniswap event topics
export const UNISWAP_V2_SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
export const UNISWAP_V3_SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
export const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Minimum transfer value to display (in wei) — ~0.1 ETH
export const MIN_TRANSFER_VALUE = BigInt('100000000000000000');
```

## Update `providers/index.ts`

Uncomment the ethereum import:
```typescript
import './solana-pumpfun';
import './ethereum';
```

## Update `.env.local`

Add:
```
NEXT_PUBLIC_ETH_WS_URL=wss://ethereum-rpc.publicnode.com
```

(Users can replace with Alchemy/Infura WSS for better rate limits)

## ABI Decoding Note
Do NOT add ethers.js or web3.js as dependencies. Decode the log topics/data manually using basic hex parsing:
- Topics are 32-byte hex strings (addresses are zero-padded to 32 bytes)
- Data is ABI-encoded (concatenated 32-byte words)
- Use `BigInt('0x' + hex)` for number parsing
- Create small utility functions for decoding, not a full ABI framework

## Verification

1. Start dev server
2. Open `/world`
3. Should see Ethereum connection indicator
4. ETH swap events should appear in the live feed with blue `↔` icons
5. Force graph should show ETH tokens as hub nodes alongside Solana tokens
6. Category sidebar should show ETH categories that can be toggled
7. Stats bar should show ETH volume separately or combined

## Important Notes
- Public Ethereum WebSocket RPCs have rate limits. Implement backoff and consider filtering only high-value events.
- The provider must work without any API key (public RPCs as fallback), but should support authenticated endpoints via env vars.
- Buffer/throttle events to avoid flooding the UI — Ethereum generates far more events per second than PumpFun.
- For token labeling, use the `KNOWN_TOKENS` map. Unknown tokens display truncated address.
