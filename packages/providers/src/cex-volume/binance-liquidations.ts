/**
 * Binance futures liquidation stream.
 *
 * Connects to wss://fstream.binance.com/ws/!forceOrder@arr
 * Streams all liquidation events across all futures pairs.
 */

import type { DataProviderEvent } from '@web3viz/core';
import { WebSocketManager } from '../shared';
import { safeJsonParse, isObject, parseFiniteFloat } from '../shared/validate';

interface LiquidationConfig {
  onEvent: (event: DataProviderEvent) => void;
  isPaused: () => boolean;
}

export class BinanceLiquidationStream {
  private config: LiquidationConfig;
  private wsManager: WebSocketManager | null = null;
  private connected = false;

  constructor(config: LiquidationConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.wsManager?.isConnected) return;

    this.wsManager = new WebSocketManager({
      url: 'wss://fstream.binance.com/ws/!forceOrder@arr',
      heartbeatIntervalMs: 0, // Binance sends its own pings
      onStateChange: (state) => {
        this.connected = state === 'connected';
      },
      onMessage: (raw) => {
        if (this.config.isPaused()) return;
        const data = safeJsonParse(raw);
        if (!isObject(data)) return;
        if (data.e === 'forceOrder' && isObject(data.o)) {
          this.handleLiquidation(data.o as Record<string, unknown>);
        }
      },
    });

    this.wsManager.connect();
  }

  disconnect(): void {
    this.wsManager?.disconnect();
    this.wsManager = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleLiquidation(order: Record<string, unknown>): void {
    const symbol = order.s as string;
    const side = order.S as string; // SELL = long liq'd, BUY = short liq'd
    const quantity = parseFiniteFloat(order.q as string);
    const price = parseFiniteFloat((order.ap || order.p) as string);
    if (price == null || quantity == null) return;
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
