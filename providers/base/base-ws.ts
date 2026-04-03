/**
 * Base WebSocket Handler
 *
 * Thin wrapper around the shared EvmWebSocket class
 * with Base-specific configuration.
 */

import type { DataProviderEvent } from '@web3viz/core';
import { EvmWebSocket } from '../_shared/evm-ws';
import {
  AERODROME_SWAP_TOPIC,
  UNISWAP_V3_SWAP_TOPIC,
  ERC20_TRANSFER_TOPIC,
  KNOWN_BASE_TOKENS,
  MIN_TRANSFER_VALUE,
  MAX_EVENTS_PER_SECOND,
} from './constants';

interface BaseWSConfig {
  onEvent: (event: DataProviderEvent) => void;
  onSwap: (swap: {
    tokenAddress: string;
    symbol: string;
    name: string;
    trader: string;
    volume: number;
  }) => void;
  isPaused: () => boolean;
}

export class BaseWebSocket {
  private evm: EvmWebSocket;

  constructor(config: BaseWSConfig) {
    const wsUrl = process.env.NEXT_PUBLIC_BASE_WS_URL || 'wss://base-rpc.publicnode.com';

    this.evm = new EvmWebSocket({
      wsUrl,
      fallbackUrl: 'wss://base-rpc.publicnode.com',
      chain: 'base',
      providerId: 'base',
      nativeSymbol: 'ETH',
      knownTokens: KNOWN_BASE_TOKENS,
      swapTopics: [AERODROME_SWAP_TOPIC, UNISWAP_V3_SWAP_TOPIC],
      transferTopic: ERC20_TRANSFER_TOPIC,
      minTransferValue: MIN_TRANSFER_VALUE,
      maxEventsPerSecond: MAX_EVENTS_PER_SECOND,
      onEvent: config.onEvent,
      onSwap: config.onSwap,
      isPaused: config.isPaused,
    });
  }

  connect(): void {
    this.evm.connect();
  }

  disconnect(): void {
    this.evm.disconnect();
  }

  isConnected(): boolean {
    return this.evm.isConnected();
  }
}
