# Task 27: ERC-8004 Tokenized Asset Data Provider

## Goal
Create a data provider that tracks ERC-8004 (Mutable Token Metadata / tokenized real-world and digital assets) activity on Ethereum and Base. ERC-8004 extends ERC-721 with mutable metadata, enabling tokenized real-world assets, dynamic NFTs, and evolving digital assets.

## Prerequisites
- Tasks 21-23 must be complete
- Task 24 or 25 should be complete (for the shared EVM WS utility if created)

## Background on ERC-8004

ERC-8004 ("Mutable Metadata for Non-Fungible Tokens") allows NFT metadata to be updated on-chain. Key events:

```solidity
// Standard ERC-721 events still apply
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

// ERC-8004 specific events
event MetadataUpdate(uint256 indexed tokenId);
event BatchMetadataUpdate(uint256 indexed fromTokenId, uint256 indexed toTokenId);
```

The standard also uses ERC-4906 event signatures for metadata updates:
```
MetadataUpdate(uint256):      topic = 0xf8e1a15aba9398e019f0b49df1a4fde98ee17ae345cb5f6b5e2c27f5033e8ce7
BatchMetadataUpdate(uint256,uint256): topic = 0x6bd5c950a8d8df17f772f5af37cb3655737899cbf903264b9795592da439661c
```

## Architecture

### Data Sources

**WebSocket subscriptions** to Ethereum and Base RPCs for:
1. ERC-721 Transfer events from known ERC-8004 contracts
2. MetadataUpdate events (ERC-4906 topics)
3. Minting events (Transfer from 0x0)

### Known ERC-8004 / Dynamic NFT Contracts

```typescript
// These are example contracts — update with actual deployed ERC-8004 contracts
const ERC8004_CONTRACTS: Record<string, { name: string; chain: string }> = {
  // Add known ERC-8004 contract addresses as they're deployed
  // For now, monitor for the MetadataUpdate event topic across all contracts
};
```

### Event Categories

| Category ID | Label | Icon | Color | Source |
|---|---|---|---|---|
| `erc8004Mints` | Asset Mints | ◈ | `#00BCD4` (cyan) | New ERC-8004 token mints |
| `erc8004Transfers` | Asset Transfers | ◇ | `#26C6DA` (light cyan) | ERC-8004 token transfers |
| `erc8004Updates` | Metadata Updates | ↻ | `#00ACC1` (teal) | MetadataUpdate events |

## Files to Create

### 1. `providers/erc8004/index.ts`

```typescript
/**
 * ERC-8004 Tokenized Asset Data Provider
 *
 * Tracks mutable-metadata NFT activity (ERC-8004 / ERC-4906) on
 * Ethereum and Base chains.
 *
 * Monitors:
 * - Token mints (Transfer from 0x0)
 * - Token transfers
 * - Metadata update events (ERC-4906)
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

import { ERC8004_CATEGORIES } from './categories';
import { ERC8004WebSocket } from './erc8004-ws';

class ERC8004Provider implements DataProvider {
  readonly id = 'erc8004';
  readonly name = 'ERC-8004 Assets';
  readonly chains = ['ethereum', 'base'];
  readonly categories: CategoryConfig[] = ERC8004_CATEGORIES;

  private listeners = new Set<(event: DataProviderEvent) => void>();
  private paused = false;
  
  // One WS connection per chain
  private ethWs: ERC8004WebSocket;
  private baseWs: ERC8004WebSocket;

  private stats: DataProviderStats = {
    counts: { erc8004Mints: 0, erc8004Transfers: 0, erc8004Updates: 0 },
    totalVolume: {},
    totalTransactions: 0,
    totalAgents: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
    rawEvents: [],
  };

  // Track collections by contract address
  private collectionAcc = new Map<string, TopToken>();

  constructor() {
    const handler = (event: DataProviderEvent) => this.handleEvent(event);
    const isPaused = () => this.paused;

    this.ethWs = new ERC8004WebSocket({
      wsUrl: process.env.NEXT_PUBLIC_ETH_WS_URL || 'wss://ethereum-rpc.publicnode.com',
      chain: 'ethereum',
      providerId: 'erc8004',
      onEvent: handler,
      onCollection: (c) => this.handleCollection(c),
      isPaused,
    });

    this.baseWs = new ERC8004WebSocket({
      wsUrl: process.env.NEXT_PUBLIC_BASE_WS_URL || 'wss://base-rpc.publicnode.com',
      chain: 'base',
      providerId: 'erc8004',
      onEvent: handler,
      onCollection: (c) => this.handleCollection(c),
      isPaused,
    });
  }

  connect(): void {
    this.ethWs.connect();
    this.baseWs.connect();
  }

  disconnect(): void {
    this.ethWs.disconnect();
    this.baseWs.disconnect();
  }

  getStats(): DataProviderStats { return { ...this.stats }; }

  getConnections(): ConnectionState[] {
    return [
      { name: 'ERC-8004 (ETH)', connected: this.ethWs.isConnected() },
      { name: 'ERC-8004 (Base)', connected: this.baseWs.isConnected() },
    ];
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
    this.stats.totalTransactions++;
    this.stats.recentEvents = [event, ...this.stats.recentEvents].slice(0, 300);
    for (const listener of this.listeners) listener(event);
  }

  private handleCollection(info: { address: string; chain: string; name: string }) {
    const existing = this.collectionAcc.get(info.address);
    if (existing) {
      existing.trades++;
    } else {
      this.collectionAcc.set(info.address, {
        tokenAddress: info.address,
        symbol: info.name.slice(0, 6).toUpperCase(),
        name: info.name,
        chain: info.chain,
        trades: 1,
        volume: 0,
        nativeSymbol: info.chain === 'base' ? 'ETH' : 'ETH',
      });
    }
    this.stats.topTokens = Array.from(this.collectionAcc.values())
      .sort((a, b) => b.trades - a.trades)
      .slice(0, 8);
  }
}

const provider = new ERC8004Provider();
registerProvider(provider);
export { provider as erc8004Provider };
```

### 2. `providers/erc8004/categories.ts`

```typescript
import type { CategoryConfig } from '@web3viz/core';

export const ERC8004_CATEGORIES: CategoryConfig[] = [
  { id: 'erc8004Mints',     label: 'Asset Mints',      icon: '◈', color: '#00BCD4' },
  { id: 'erc8004Transfers', label: 'Asset Transfers',   icon: '◇', color: '#26C6DA' },
  { id: 'erc8004Updates',   label: 'Metadata Updates',  icon: '↻', color: '#00ACC1' },
];
```

### 3. `providers/erc8004/erc8004-ws.ts`

WebSocket class that:

1. **Connects** to the provided EVM WebSocket RPC
2. **Subscribes** to logs with topics:
   ```typescript
   const METADATA_UPDATE_TOPIC = '0xf8e1a15aba9398e019f0b49df1a4fde98ee17ae345cb5f6b5e2c27f5033e8ce7';
   const BATCH_METADATA_UPDATE_TOPIC = '0x6bd5c950a8d8df17f772f5af37cb3655737899cbf903264b9795592da439661c';
   const ERC721_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
   ```
3. **Filters** events:
   - MetadataUpdate/BatchMetadataUpdate → category `erc8004Updates`
   - Transfer from 0x0 → category `erc8004Mints`
   - Transfer (non-zero from) → category `erc8004Transfers`
   
   **Important**: ERC-20 and ERC-721 share the same Transfer topic. To distinguish:
   - ERC-721 Transfer has 3 indexed topics (from, to, tokenId) and no data
   - ERC-20 Transfer has 2 indexed topics (from, to) and value in data
   - Check `topics.length === 4` for ERC-721 (topic0 + 3 indexed params)

4. **MetadataUpdate filtering**: Only emit MetadataUpdate events if the contract has also emitted a Transfer event (confirms it's an active ERC-8004 contract, not just any contract emitting ERC-4906 events)

5. **Emits** `DataProviderEvent`:
   ```typescript
   {
     id: `${txHash}-${logIndex}`,
     providerId: 'erc8004',
     category: 'erc8004Mints' | 'erc8004Transfers' | 'erc8004Updates',
     chain: 'ethereum' | 'base',
     timestamp: Date.now(),
     label: `Token #${tokenId}` || contractName,
     address: fromOrToAddress,
     tokenAddress: contractAddress,
     meta: { tokenId, from, to },
   }
   ```

6. **Rate limiting**: These events can be frequent. Throttle to ~5 events/second.
7. **Auto-reconnect** on disconnect (5s delay)

### 4. `providers/erc8004/constants.ts`

```typescript
export const METADATA_UPDATE_TOPIC = '0xf8e1a15aba9398e019f0b49df1a4fde98ee17ae345cb5f6b5e2c27f5033e8ce7';
export const BATCH_METADATA_UPDATE_TOPIC = '0x6bd5c950a8d8df17f772f5af37cb3655737899cbf903264b9795592da439661c';
export const ERC721_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Known ERC-8004 collections (expand over time)
export const KNOWN_COLLECTIONS: Record<string, { name: string; chain: string }> = {
  // Add known contract addresses as they're discovered
};
```

## Update `providers/index.ts`

```typescript
import './solana-pumpfun';
import './ethereum';
import './base';
import './agents';
import './erc8004';
```

## Verification

1. Start dev server
2. Open `/world`
3. ERC-8004 connection indicators show for ETH and Base
4. Metadata update events appear in the live feed with cyan icons
5. NFT mint events show as `erc8004Mints`
6. Categories appear in filter sidebar
7. ERC-8004 activity doesn't overwhelm the feed (throttling works)

## Important Notes
- ERC-8004 is relatively new — there may not be many contracts actively using it yet. The provider should gracefully handle low event volume.
- The MetadataUpdate event (ERC-4906) is used by many contracts beyond ERC-8004. Use the tracking set of active contracts to reduce noise.
- Since ERC-721 Transfer and ERC-20 Transfer share the same topic, the `topics.length` check is critical to avoid mixing them up.
- This provider reuses the same WebSocket RPC endpoints as the Ethereum and Base providers. If rate limiting is an issue, consider sharing a single WebSocket connection per chain across providers (future optimization).
