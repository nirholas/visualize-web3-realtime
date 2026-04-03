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

    const ws = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
    };

    ws.onmessage = (event) => {
      if (this.config.isPaused()) return;
      try {
        const data = JSON.parse(event.data as string);
        if (data.e === 'forceOrder') {
          this.handleLiquidation(data.o);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      this.connected = false;
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
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

  private handleLiquidation(order: Record<string, unknown>): void {
    const symbol = order.s as string;
    const side = order.S as string; // SELL = long liq'd, BUY = short liq'd
    const quantity = parseFloat(order.q as string);
    const price = parseFloat((order.ap || order.p) as string);
    const usdValue = price * quantity;

    const baseAsset = symbol.replace(/USDT$|BUSD$/, '');
    const direction = side === 'SELL' ? 'LONG' : 'SHORT';

    const event: DataProviderEvent = {
      id: `liq-${(order.T as number) || Date.now()}-${symbol}`,
      providerId: 'cex-volume',
      category: 'cexLiquidations',
      chain: 'cex',
      timestamp: (order.T as number) || Date.now(),
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
