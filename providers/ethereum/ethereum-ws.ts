/**
 * Ethereum WebSocket Handler
 *
 * Thin wrapper around the shared EvmWebSocket class
 * with Ethereum-specific configuration.
 */

import type { DataProviderEvent } from '@web3viz/core';
import { EvmWebSocket } from '../_shared/evm-ws';
import {
  UNISWAP_V2_SWAP_TOPIC,
  UNISWAP_V3_SWAP_TOPIC,
  ERC20_TRANSFER_TOPIC,
  KNOWN_TOKENS,
  MIN_TRANSFER_VALUE,
  MAX_EVENTS_PER_SECOND,
} from './constants';

interface EthereumWSConfig {
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

/** Well-known Uniswap pair addresses for token labeling */
const KNOWN_PAIRS: Record<string, [string, string]> = {
  '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11': ['DAI', 'WETH'],
  '0x0d4a11d5eeac28ec3f61038fd89ba2037f06daf2': ['USDC', 'WETH'],
  '0xbb2b8038a1640196fbe3e38816f3e67cba72d940': ['USDT', 'WETH'],
  '0x1b94e0a6cbb16d42b0c79637fe8eec2d4c9a7551': ['AAVE', 'WETH'],
  '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8': ['USDC', 'WETH'], // V3
};

export class EthereumWebSocket {
  private evm: EvmWebSocket;

  constructor(config: EthereumWSConfig) {
    const wsUrl = process.env.NEXT_PUBLIC_ETH_WS_URL || 'wss://ethereum-rpc.publicnode.com';

    this.evm = new EvmWebSocket({
      wsUrl,
      fallbackUrl: 'wss://ethereum-rpc.publicnode.com',
      chain: 'ethereum',
      providerId: 'ethereum',
      nativeSymbol: 'ETH',
      knownTokens: KNOWN_TOKENS,
      swapTopics: [UNISWAP_V2_SWAP_TOPIC, UNISWAP_V3_SWAP_TOPIC],
      transferTopic: ERC20_TRANSFER_TOPIC,
      minTransferValue: MIN_TRANSFER_VALUE,
      maxEventsPerSecond: MAX_EVENTS_PER_SECOND,
      knownPairs: KNOWN_PAIRS,
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

  isConnected_(): boolean {
    return this.evm.isConnected();
  }
}
