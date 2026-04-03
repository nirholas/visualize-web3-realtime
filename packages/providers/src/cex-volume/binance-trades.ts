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

  constructor(config: BinanceTradeConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    // Build combined stream URL: trade streams for each pair + mini-ticker for price data
    const streams = [
      ...this.config.pairs.map((p) => `${p}@trade`),
      '!miniTicker@arr',
    ];
    const url = `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
    };

    ws.onmessage = (event) => {
      if (this.config.isPaused()) return;
      try {
        const wrapper = JSON.parse(event.data as string);
        const data = wrapper.data;

        if (Array.isArray(data)) {
          // Mini ticker array — update price cache (unused locally but keeps stream alive)
          return;
        }

        if (data.e === 'trade') {
          this.handleTrade(data);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      this.connected = false;
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleTrade(data: Record<string, unknown>): void {
    const symbol = data.s as string; // e.g. "BTCUSDT"
    const price = parseFloat(data.p as string);
    const quantity = parseFloat(data.q as string);
    const usdValue = price * quantity;

    // Filter small trades
    if (usdValue < this.config.minTradeUsd) return;

    // Extract base asset from symbol (e.g. "BTC" from "BTCUSDT")
    const baseAsset = symbol.replace(/USDT$|BUSD$|USDC$/, '');
    const isBuyerMaker = data.m as boolean; // true = sell (taker sold), false = buy (taker bought)

    const event: DataProviderEvent = {
      id: `bnc-${(data.t as number) || Date.now()}`,
      providerId: 'cex-volume',
      category: 'cexSpotTrades',
      chain: 'cex',
      timestamp: (data.T as number) || Date.now(),
      label: `${baseAsset} ${isBuyerMaker ? 'SELL' : 'BUY'} $${formatUsd(usdValue)}`,
      amount: quantity,
      nativeSymbol: baseAsset,
      amountUsd: usdValue,
      address: symbol,
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
