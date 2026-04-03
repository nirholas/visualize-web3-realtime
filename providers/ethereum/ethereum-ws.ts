/**
 * Ethereum WebSocket Handler
 * Connects to Ethereum RPC and streams swap/transfer events
 */

import type { DataProviderEvent } from '@web3viz/core';
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

interface JsonRpcMessage {
  jsonrpc: string;
  method?: string;
  params?: unknown;
  id?: number;
  result?: unknown;
}

export class EthereumWebSocket {
  private ws: WebSocket | null = null;
  private config: EthereumWSConfig;
  private isConnected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventBuffer: DataProviderEvent[] = [];
  private lastEmitTime = 0;

  constructor(config: EthereumWSConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const wsUrl = process.env.NEXT_PUBLIC_ETH_WS_URL || 'wss://ethereum-rpc.publicnode.com';

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupHandlers();
    } catch (error) {
      console.error('Failed to create Ethereum WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }

  isConnected_(): boolean {
    return this.isConnected;
  }

  private setupHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnected = true;
      console.log('Ethereum WebSocket connected');
      this.subscribe();
    };

    this.ws.onmessage = (event) => {
      if (this.config.isPaused()) return;

      try {
        const msg = JSON.parse(event.data) as JsonRpcMessage;
        this.handleMessage(msg);
      } catch (error) {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      console.log('Ethereum WebSocket closed');
      this.isConnected = false;
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('Ethereum WebSocket error:', error);
      this.isConnected = false;
      if (this.ws) {
        this.ws.close();
      }
    };
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to logs for swap and transfer events
    const subscribeMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: [
        'logs',
        {
          topics: [
            [UNISWAP_V2_SWAP_TOPIC, UNISWAP_V3_SWAP_TOPIC, ERC20_TRANSFER_TOPIC],
          ],
        },
      ],
    };

    this.ws.send(JSON.stringify(subscribeMsg));
  }

  private handleMessage(msg: JsonRpcMessage): void {
    // Handle subscription confirmation
    if (msg.result && typeof msg.result === 'string') {
      console.log('Subscription ID:', msg.result);
      return;
    }

    // Handle log notifications
    if (msg.method === 'eth_subscription' && msg.params) {
      const params = msg.params as Record<string, unknown>;
      const result = params.result as Record<string, unknown>;

      if (!result || typeof result !== 'object') return;

      const topics = result.topics as string[] | undefined;
      const data = result.data as string | undefined;
      const address = result.address as string | undefined;
      const transactionHash = result.transactionHash as string | undefined;
      const logIndex = result.logIndex as string | undefined;

      if (!topics || !data || !address) return;

      const topic0 = topics[0];

      try {
        if (topic0 === UNISWAP_V2_SWAP_TOPIC) {
          this.handleUniswapV2Swap(data, address, transactionHash, logIndex);
        } else if (topic0 === UNISWAP_V3_SWAP_TOPIC) {
          this.handleUniswapV3Swap(data, address, transactionHash, logIndex);
        } else if (topic0 === ERC20_TRANSFER_TOPIC) {
          this.handleTransfer(topics, data, address, transactionHash, logIndex);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
  }

  private handleUniswapV2Swap(
    data: string,
    pairAddress: string,
    txHash: string | undefined,
    logIndex: string | undefined
  ): void {
    // Uniswap V2 Swap event:
    // data = [amount0In, amount1In, amount0Out, amount1Out]
    // Each field is 32 bytes (64 hex chars)

    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (cleanData.length < 256) return; // Need at least 8 * 32 bytes

    try {
      const amount0In = BigInt('0x' + cleanData.slice(0, 64));
      const amount1In = BigInt('0x' + cleanData.slice(64, 128));
      const amount0Out = BigInt('0x' + cleanData.slice(128, 192));
      const amount1Out = BigInt('0x' + cleanData.slice(192, 256));

      // Convert to ETH (assume one of the tokens is likely WETH)
      // Use the larger outflow as the volume
      const volume0 = Number(amount0Out) / 1e18;
      const volume1 = Number(amount1Out) / 1e18;
      const volume = Math.max(volume0, volume1);

      if (volume < 0.001) return; // Too small

      // Try to identify the token from the pair
      const token0 = this.guessToken(pairAddress, 0);
      const token1 = this.guessToken(pairAddress, 1);

      const label = `${token0.symbol}/${token1.symbol} Swap`;
      const id = `eth-${txHash}-${logIndex}`;

      const event: DataProviderEvent = {
        id,
        providerId: 'ethereum',
        category: 'ethSwaps',
        chain: 'ethereum',
        timestamp: Date.now(),
        label,
        amount: volume,
        nativeSymbol: 'ETH',
        address: pairAddress.toLowerCase(),
        tokenAddress: pairAddress.toLowerCase(),
      };

      this.bufferEvent(event);

      // Emit swap for graph accumulation
      this.config.onSwap({
        tokenAddress: pairAddress.toLowerCase(),
        symbol: token0.symbol,
        name: token0.name,
        trader: pairAddress.toLowerCase(),
        volume,
      });
    } catch (error) {
      // Ignore parsing errors
    }
  }

  private handleUniswapV3Swap(
    data: string,
    pairAddress: string,
    txHash: string | undefined,
    logIndex: string | undefined
  ): void {
    // Uniswap V3 Swap event:
    // data = [amount0, amount1, sqrtPriceX96, liquidity, tick]
    // Each field is 32 bytes

    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (cleanData.length < 320) return; // Need at least 10 * 32 bytes

    try {
      const amount0 = BigInt('0x' + cleanData.slice(0, 64));
      const amount1 = BigInt('0x' + cleanData.slice(64, 128));

      // Convert to ETH (use the larger amount)
      const volume0 = Math.abs(Number(amount0) / 1e18);
      const volume1 = Math.abs(Number(amount1) / 1e18);
      const volume = Math.max(volume0, volume1);

      if (volume < 0.001) return;

      const token0 = this.guessToken(pairAddress, 0);
      const token1 = this.guessToken(pairAddress, 1);

      const label = `${token0.symbol}/${token1.symbol} Swap`;
      const id = `eth-${txHash}-${logIndex}`;

      const event: DataProviderEvent = {
        id,
        providerId: 'ethereum',
        category: 'ethSwaps',
        chain: 'ethereum',
        timestamp: Date.now(),
        label,
        amount: volume,
        nativeSymbol: 'ETH',
        address: pairAddress.toLowerCase(),
        tokenAddress: pairAddress.toLowerCase(),
      };

      this.bufferEvent(event);

      this.config.onSwap({
        tokenAddress: pairAddress.toLowerCase(),
        symbol: token0.symbol,
        name: token0.name,
        trader: pairAddress.toLowerCase(),
        volume,
      });
    } catch (error) {
      // Ignore parsing errors
    }
  }

  private handleTransfer(
    topics: string[],
    data: string,
    tokenAddress: string,
    txHash: string | undefined,
    logIndex: string | undefined
  ): void {
    // ERC-20 Transfer event:
    // topic[0] = event signature
    // topic[1] = from (padded to 32 bytes)
    // topic[2] = to (padded to 32 bytes)
    // data = value (32 bytes)

    if (topics.length < 3 || !data) return;

    const from = this.unpadAddress(topics[1]);
    const to = this.unpadAddress(topics[2]);

    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (cleanData.length < 64) return;

    try {
      const value = BigInt('0x' + cleanData.slice(0, 64));

      // Check if it's a mint (from 0x0)
      const isMint = from === '0x0000000000000000000000000000000000000000';

      // Only emit if value is significant or it's a mint
      if (!isMint && value < MIN_TRANSFER_VALUE) return;

      const token = KNOWN_TOKENS[tokenAddress.toLowerCase()];
      const symbol = token?.symbol || 'TOKEN';
      const name = token?.name || 'Token';
      const decimals = token?.decimals || 18;

      const valueDecimal = Number(value) / Math.pow(10, decimals);

      const category = isMint ? 'ethMints' : 'ethTransfers';
      const label = isMint ? `${symbol} Mint` : `${symbol} Transfer`;
      const id = `eth-${txHash}-${logIndex}`;

      const event: DataProviderEvent = {
        id,
        providerId: 'ethereum',
        category,
        chain: 'ethereum',
        timestamp: Date.now(),
        label,
        amount: valueDecimal,
        nativeSymbol: 'ETH',
        address: isMint ? to : from,
        tokenAddress: tokenAddress.toLowerCase(),
      };

      this.bufferEvent(event);

      // Emit swap for graph accumulation
      const trader = isMint ? to : from;
      this.config.onSwap({
        tokenAddress: tokenAddress.toLowerCase(),
        symbol,
        name,
        trader,
        volume: valueDecimal,
      });
    } catch (error) {
      // Ignore parsing errors
    }
  }

  private unpadAddress(paddedAddress: string): string {
    // Remove 0x prefix and take the last 40 characters
    const clean = paddedAddress.startsWith('0x') ? paddedAddress.slice(2) : paddedAddress;
    const addr = clean.slice(-40);
    return '0x' + addr;
  }

  private guessToken(
    pairAddress: string,
    index: number
  ): { symbol: string; name: string } {
    // Try to identify tokens from known pair addresses or use generic names
    const lowerPair = pairAddress.toLowerCase();

    // Hardcoded well-known pairs
    const knownPairs: Record<string, [string, string]> = {
      '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11': ['DAI', 'WETH'],
      '0x0d4a11d5eeac28ec3f61038fd89ba2037f06daf2': ['USDC', 'WETH'],
      '0xbb2b8038a1640196fbe3e38816f3e67cba72d940': ['USDT', 'WETH'],
      '0x1b94e0a6cbb16d42b0c79637fe8eec2d4c9a7551': ['AAVE', 'WETH'],
      '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8': ['USDC', 'WETH'], // V3
    };

    if (knownPairs[lowerPair]) {
      const tokens = knownPairs[lowerPair];
      return {
        symbol: tokens[index] || '???',
        name: tokens[index] || 'Unknown',
      };
    }

    // Generic fallback
    return {
      symbol: index === 0 ? 'TKN0' : 'TKN1',
      name: index === 0 ? 'Token 0' : 'Token 1',
    };
  }

  private bufferEvent(event: DataProviderEvent): void {
    this.eventBuffer.push(event);

    // Throttle event emission to avoid overwhelming the UI
    const now = Date.now();
    const timeSinceLastEmit = now - this.lastEmitTime;
    const minInterval = 1000 / MAX_EVENTS_PER_SECOND;

    if (timeSinceLastEmit >= minInterval && this.eventBuffer.length > 0) {
      // Emit all buffered events
      for (const evt of this.eventBuffer) {
        this.config.onEvent(evt);
      }
      this.eventBuffer = [];
      this.lastEmitTime = now;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 3000);
  }
}
