/**
 * CEX Volume Data Provider
 *
 * Streams real-time centralized exchange data from Binance public WebSocket.
 * No API key required.
 *
 * Monitors:
 * - Large spot trades (BTC, ETH, SOL, and other top pairs)
 * - Futures liquidation events
 *
 * Self-registers with @web3viz/core on import.
 */

import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  ConnectionState,
  CategoryConfig,
  SourceConfig,
  RawEvent,
  TopToken,
  TraderEdge,
} from '@web3viz/core';
import { registerProvider, getCategoriesForSource, SOURCE_CONFIG_MAP } from '@web3viz/core';

import { BinanceTradeStream } from './binance-trades';
import { BinanceLiquidationStream } from './binance-liquidations';

// Top trading pairs to monitor individual trades
const MONITORED_PAIRS = [
  'btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt',
  'dogeusdt', 'adausdt', 'avaxusdt', 'dotusdt', 'linkusdt',
];

// Minimum trade size in USDT to display (filter noise)
const MIN_TRADE_USD = 50_000;

export class CexVolumeProvider implements DataProvider {
  readonly id = 'cex-volume';
  readonly name = 'CEX Volume';
  readonly chains = ['cex'];
  readonly sourceConfig: SourceConfig;
  readonly categories: CategoryConfig[];

  private eventListeners = new Set<(event: DataProviderEvent) => void>();
  private _paused = false;
  private _enabled = true;
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
    this.sourceConfig = SOURCE_CONFIG_MAP['cex'] ?? {
      id: 'cex',
      label: 'CEX Volume',
      color: '#fbbf24',
      icon: '\u25CF',
      description: 'Centralized exchange volume',
    };
    this.categories = getCategoriesForSource('cex');

    const handler = (event: DataProviderEvent) => this.handleEvent(event);
    const isPaused = () => this._paused;

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

  getStats(): DataProviderStats {
    return { ...this.stats };
  }

  getConnections(): ConnectionState[] {
    return [
      { name: 'Binance Trades', connected: this.tradeStream.isConnected() },
      { name: 'Binance Liquidations', connected: this.liquidationStream.isConnected() },
    ];
  }

  onEvent(callback: (event: DataProviderEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  setPaused(paused: boolean): void {
    this._paused = paused;
  }

  isPaused(): boolean {
    return this._paused;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  private handleEvent(event: DataProviderEvent): void {
    if (this._paused) return;
    this.stats.counts[event.category] = (this.stats.counts[event.category] || 0) + 1;
    if (event.amountUsd) {
      this.stats.totalVolume = this.stats.totalVolume ?? {};
      this.stats.totalVolume.cex = (this.stats.totalVolume.cex || 0) + event.amountUsd;
    }
    this.stats.totalTransactions++;
    this.stats.recentEvents = [event, ...this.stats.recentEvents].slice(0, 300);
    for (const listener of this.eventListeners) listener(event);
  }

  private handleTrade(trade: { symbol: string; baseAsset: string; volumeUsd: number }) {
    const existing = this.symbolAcc.get(trade.symbol);
    if (existing) {
      existing.trades++;
      existing.volume += trade.volumeUsd;
      existing.volumeUsd = (existing.volumeUsd ?? 0) + trade.volumeUsd;
    } else {
      this.symbolAcc.set(trade.symbol, {
        tokenAddress: trade.symbol,
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
