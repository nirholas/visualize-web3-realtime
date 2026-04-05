# Task 28: CEX Volume Data Provider

## Goal
Create a data provider that streams real-time centralized exchange (CEX) trading data from public WebSocket APIs. Primary source: Binance (largest CEX by volume, public WebSocket, no API key required). Secondary: additional exchanges via similar public feeds.

## Prerequisites
- Tasks 21-23 must be complete

## Architecture

### Data Sources

**Binance Public WebSocket Streams** (no API key required):
- **Base URL**: `wss://stream.binance.com:9443/ws`
- **Combined streams**: `wss://stream.binance.com:9443/stream?streams=<stream1>/<stream2>/...`

Key streams:
1. **Individual trade streams**: `<symbol>@trade` — Real-time trades for a symbol
2. **Mini ticker (all)**: `!miniTicker@arr` — 24h price/volume summary for all symbols, updates every second
3. **Aggregate trade streams**: `<symbol>@aggTrade` — Aggregated trade data
4. **Liquidation streams**: `!forceOrder@arr` — All liquidation orders (futures)

For visualization, use:
- `!miniTicker@arr` for overall volume monitoring (all pairs)
- Individual `@trade` streams for top pairs (BTC, ETH, SOL)
- `!forceOrder@arr` for liquidation events (dramatic for visualization)

### Binance WebSocket Message Formats

**Mini Ticker (`!miniTicker@arr`)**:
```json
[{
  "e": "24hrMiniTicker",
  "s": "BTCUSDT",       // Symbol
  "c": "68432.10",      // Close price
  "o": "67890.00",      // Open price
  "h": "69000.00",      // High price
  "l": "67500.00",      // Low price
  "v": "12345.678",     // Base asset volume (BTC)
  "q": "845123456.78"   // Quote asset volume (USDT)
}]
```

**Individual Trade (`<symbol>@trade`)**:
```json
{
  "e": "trade",
  "s": "BTCUSDT",
  "p": "68432.10",    // Price
  "q": "0.5",         // Quantity
  "b": 12345,         // Buyer order ID
  "a": 67890,         // Seller order ID
  "T": 1234567890000, // Trade time
  "m": true           // Is buyer the market maker?
}
```

**Liquidation (`!forceOrder@arr`)**:
```json
{
  "e": "forceOrder",
  "o": {
    "s": "BTCUSDT",
    "S": "SELL",        // Side (SELL = long liquidated, BUY = short liquidated)
    "q": "0.5",         // Original quantity
    "p": "68000.00",    // Price
    "ap": "67950.00",   // Average price
    "X": "FILLED",
    "T": 1234567890000
  }
}
```

### Event Categories

| Category ID | Label | Icon | Color | Source |
|---|---|---|---|---|
| `cexSpotTrades` | CEX Trades | $ | `#FFB300` (amber) | Binance spot trades (large) |
| `cexLiquidations` | Liquidations | 💥 | `#FF6D00` (deep orange) | Binance futures liquidations |

## Files to Create

### 1. `providers/cex-volume/index.ts`

```typescript
/**
 * CEX Volume Data Provider
 *
 * Streams real-time centralized exchange data from Binance public WebSocket.
 * No API key required.
 *
 * Monitors:
 * - Large spot trades (BTC, ETH, SOL, and other top pairs)
 * - Futures liquidation events
 * - 24h volume tickers for aggregate stats
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

import { CEX_CATEGORIES } from './categories';
import { BinanceTradeStream } from './binance-trades';
import { BinanceLiquidationStream } from './binance-liquidations';

// Top trading pairs to monitor individual trades
const MONITORED_PAIRS = [
  'btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt',
  'dogeusdt', 'adausdt', 'avaxusdt', 'dotusdt', 'linkusdt',
];

// Minimum trade size in USDT to display (filter noise)
const MIN_TRADE_USD = 50_000; // $50k minimum for spot trades

class CexVolumeProvider implements DataProvider {
  readonly id = 'cex-volume';
  readonly name = 'CEX Volume';
  readonly chains = ['cex']; // virtual chain for CEX data
  readonly categories: CategoryConfig[] = CEX_CATEGORIES;

  private listeners = new Set<(event: DataProviderEvent) => void>();
  private paused = false;
  private tradeStream: BinanceTradeStream;
  private liquidationStream: BinanceLiquidationStream;

  private stats: DataProviderStats = {
    counts: { cexSpotTrades: 0, cexLiquidations: 0 },
    totalVolume: { cex: 0 },
    totalTransactions: 0,
    totalAgents: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
    rawEvents: [],
  };

  // Track volume per symbol for top tokens display
  private symbolAcc = new Map<string, TopToken>();

  constructor() {
    const handler = (event: DataProviderEvent) => this.handleEvent(event);
    const isPaused = () => this.paused;

    this.tradeStream = new BinanceTradeStream({
      pairs: MONITORED_PAIRS,
      minTradeUsd: MIN_TRADE_USD,
      onEvent: handler,
      onTrade: (trade) => this.handleTrade(trade),
      isPaused,
    });

    this.liquidationStream = new BinanceLiquidationStream({
      onEvent: handler,
      isPaused,
    });
  }

  connect(): void {
    this.tradeStream.connect();
    this.liquidationStream.connect();
  }

  disconnect(): void {
    this.tradeStream.disconnect();
    this.liquidationStream.disconnect();
  }

  getStats(): DataProviderStats { return { ...this.stats }; }

  getConnections(): ConnectionState[] {
    return [
      { name: 'Binance Trades', connected: this.tradeStream.isConnected() },
      { name: 'Binance Liquidations', connected: this.liquidationStream.isConnected() },
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
    if (event.amountUsd) {
      this.stats.totalVolume.cex = (this.stats.totalVolume.cex || 0) + event.amountUsd;
    }
    this.stats.totalTransactions++;
    this.stats.recentEvents = [event, ...this.stats.recentEvents].slice(0, 300);
    for (const listener of this.listeners) listener(event);
  }

  private handleTrade(trade: { symbol: string; baseAsset: string; volumeUsd: number }) {
    const existing = this.symbolAcc.get(trade.symbol);
    if (existing) {
      existing.trades++;
      existing.volume += trade.volumeUsd;
      if (existing.volumeUsd !== undefined) {
        existing.volumeUsd = (existing.volumeUsd || 0) + trade.volumeUsd;
      }
    } else {
      this.symbolAcc.set(trade.symbol, {
        tokenAddress: trade.symbol, // Use symbol as address for CEX
        symbol: trade.baseAsset,
        name: trade.baseAsset,
        chain: 'cex',
        trades: 1,
        volume: trade.volumeUsd,
        nativeSymbol: 'USD',
        volumeUsd: trade.volumeUsd,
      });
    }

    this.stats.topTokens = Array.from(this.symbolAcc.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
  }
}

const provider = new CexVolumeProvider();
registerProvider(provider);
export { provider as cexVolumeProvider };
```

### 2. `providers/cex-volume/categories.ts`

```typescript
import type { CategoryConfig } from '@web3viz/core';

export const CEX_CATEGORIES: CategoryConfig[] = [
  { id: 'cexSpotTrades',   label: 'CEX Trades',    icon: '$',  color: '#FFB300' },
  { id: 'cexLiquidations', label: 'Liquidations',   icon: '💥', color: '#FF6D00' },
];
```

### 3. `providers/cex-volume/binance-trades.ts`

```typescript
/**
 * Binance spot trade WebSocket stream.
 *
 * Connects to the combined stream endpoint for multiple pairs.
 * Filters for large trades above the minimum USD threshold.
 */

import type { DataProviderEvent } from '@web3viz/core';

interface BinanceTradeConfig {
  pairs: string[];
  minTradeUsd: number;
  onEvent: (event: DataProviderEvent) => void;
  onTrade: (trade: { symbol: string; baseAsset: string; volumeUsd: number }) => void;
  isPaused: () => boolean;
}

export class BinanceTradeStream {
  private config: BinanceTradeConfig;
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Price cache from mini-ticker for USD conversion
  private prices = new Map<string, number>();

  constructor(config: BinanceTradeConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    // Build combined stream URL
    // Include trade streams for each pair + mini-ticker for price data
    const streams = [
      ...this.config.pairs.map(p => `${p}@trade`),
      '!miniTicker@arr',
    ];
    const url = `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => { this.connected = true; };

    ws.onmessage = (event) => {
      if (this.config.isPaused()) return;
      try {
        const wrapper = JSON.parse(event.data);
        const data = wrapper.data;

        if (Array.isArray(data)) {
          // Mini ticker array — update price cache
          for (const ticker of data) {
            if (ticker.s && ticker.c) {
              this.prices.set(ticker.s, parseFloat(ticker.c));
            }
          }
          return;
        }

        if (data.e === 'trade') {
          this.handleTrade(data);
        }
      } catch {
        // Ignore malformed
      }
    };

    ws.onclose = () => {
      this.connected = false;
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    ws.onerror = () => { ws.close(); };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected(): boolean { return this.connected; }

  private handleTrade(data: any): void {
    const symbol = data.s as string;           // e.g. "BTCUSDT"
    const price = parseFloat(data.p);
    const quantity = parseFloat(data.q);
    const usdValue = price * quantity;

    // Filter small trades
    if (usdValue < this.config.minTradeUsd) return;

    // Extract base asset from symbol (e.g. "BTC" from "BTCUSDT")
    const baseAsset = symbol.replace(/USDT$|BUSD$|USDC$/, '');
    const isBuyerMaker = data.m; // true = sell (taker sold), false = buy (taker bought)

    const event: DataProviderEvent = {
      id: `bnc-${data.t || Date.now()}`, // trade ID
      providerId: 'cex-volume',
      category: 'cexSpotTrades',
      chain: 'cex',
      timestamp: data.T || Date.now(),
      label: `${baseAsset} ${isBuyerMaker ? 'SELL' : 'BUY'} $${formatUsd(usdValue)}`,
      amount: quantity,
      nativeSymbol: baseAsset,
      amountUsd: usdValue,
      address: symbol, // Use symbol as "address" for CEX
      tokenAddress: symbol,
      meta: {
        price,
        quantity,
        side: isBuyerMaker ? 'sell' : 'buy',
        exchange: 'binance',
      },
    };

    this.config.onEvent(event);
    this.config.onTrade({ symbol, baseAsset, volumeUsd: usdValue });
  }
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}
```

### 4. `providers/cex-volume/binance-liquidations.ts`

```typescript
/**
 * Binance futures liquidation stream.
 *
 * Connects to wss://fstream.binance.com/ws/!forceOrder@arr
 * Streams all liquidation events across all futures pairs.
 */

import type { DataProviderEvent } from '@web3viz/core';

interface LiquidationConfig {
  onEvent: (event: DataProviderEvent) => void;
  isPaused: () => boolean;
}

export class BinanceLiquidationStream {
  private config: LiquidationConfig;
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: LiquidationConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    // Binance futures liquidation stream
    const ws = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');
    this.ws = ws;

    ws.onopen = () => { this.connected = true; };

    ws.onmessage = (event) => {
      if (this.config.isPaused()) return;
      try {
        const data = JSON.parse(event.data);
        if (data.e === 'forceOrder') {
          this.handleLiquidation(data.o);
        }
      } catch {
        // Ignore
      }
    };

    ws.onclose = () => {
      this.connected = false;
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    };

    ws.onerror = () => { ws.close(); };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected(): boolean { return this.connected; }

  private handleLiquidation(order: any): void {
    const symbol = order.s as string;
    const side = order.S as string; // SELL = long liq'd, BUY = short liq'd
    const quantity = parseFloat(order.q);
    const price = parseFloat(order.ap || order.p);
    const usdValue = price * quantity;

    const baseAsset = symbol.replace(/USDT$|BUSD$/, '');
    const direction = side === 'SELL' ? 'LONG' : 'SHORT';

    const event: DataProviderEvent = {
      id: `liq-${order.T || Date.now()}-${symbol}`,
      providerId: 'cex-volume',
      category: 'cexLiquidations',
      chain: 'cex',
      timestamp: order.T || Date.now(),
      label: `${baseAsset} ${direction} LIQ $${formatUsd(usdValue)}`,
      amount: quantity,
      nativeSymbol: baseAsset,
      amountUsd: usdValue,
      address: symbol,
      tokenAddress: symbol,
      meta: {
        side,
        direction,
        price,
        quantity,
        exchange: 'binance',
        status: order.X,
      },
    };

    this.config.onEvent(event);
  }
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}
```

## Update `providers/index.ts`

```typescript
import './solana-pumpfun';
import './ethereum';
import './base';
import './agents';
import './erc8004';
import './cex-volume';
```

## Verification

1. Start dev server
2. Open `/world`
3. Two Binance connection indicators (Trades + Liquidations)
4. Large BTC/ETH trades appear in live feed with amber `$` icons
5. Liquidation events appear with orange `💥` icons and LONG/SHORT labels
6. Force graph shows top trading pairs as hub nodes
7. Stats show CEX volume in USD
8. Category filters work for CEX categories

## Important Notes
- **No API key required** — Binance public WebSocket streams are free and unauthenticated
- **Rate limits**: Binance allows 5 connections per IP. The combined stream URL reduces this to 2 connections (trades + liquidations)
- **Volume filtering**: The $50K minimum trade filter is important — without it, the UI would be overwhelmed with thousands of small trades per second
- **Liquidations**: The futures stream (`fstream.binance.com`) is separate from spot (`stream.binance.com`)
- **USD amounts**: CEX data is natively in USD (USDT pairs), unlike on-chain data which is in native tokens. Display as `$` amounts.
- **Symbol as address**: Since CEX doesn't have wallet addresses, use the trading pair symbol (e.g. "BTCUSDT") as the address/tokenAddress field. This works fine for the graph visualization.
- If Binance is blocked in the user's region, the WebSocket will fail to connect. The provider handles this gracefully via auto-reconnect and shows disconnected status.
