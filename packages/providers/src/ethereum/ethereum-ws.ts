/**
 * Ethereum WebSocket client for streaming on-chain events.
 *
 * Subscribes to Uniswap V2/V3 swap events, ERC-20 transfers, and token mints
 * via eth_subscribe with log filtering. Decodes event data manually without
 * ethers.js or web3.js dependencies.
 */

import type { DataProviderEvent } from '@web3viz/core';
import { WebSocketManager, safeJsonParse, isObject, isValidEthLog } from '../shared';
import {
  UNISWAP_V2_SWAP_TOPIC,
  UNISWAP_V3_SWAP_TOPIC,
  ERC20_TRANSFER_TOPIC,
  MIN_TRANSFER_VALUE,
  KNOWN_TOKENS,
  WETH_ADDRESS,
} from './constants';

// ---------------------------------------------------------------------------
// ABI decoding helpers (no ethers.js dependency)
// ---------------------------------------------------------------------------

const ZERO_ADDRESS = '0x' + '0'.repeat(40);

/** Extract an address from a 32-byte hex topic (strip leading 12 zero bytes) */
function topicToAddress(topic: string): string {
  return '0x' + topic.slice(26).toLowerCase();
}

/** Decode a 256-bit signed integer from a 64-char hex word */
function decodeInt256(hex: string): bigint {
  const val = BigInt('0x' + hex);
  // If the high bit is set, it's negative (two's complement)
  if (val >= BigInt('0x8000000000000000000000000000000000000000000000000000000000000000')) {
    return val - BigInt('0x10000000000000000000000000000000000000000000000000000000000000000');
  }
  return val;
}

/** Decode a 256-bit unsigned integer from a 64-char hex word */
function decodeUint256(hex: string): bigint {
  return BigInt('0x' + hex);
}

/** Get the Nth 32-byte word from ABI-encoded data (0-indexed) */
function getWord(data: string, index: number): string {
  const offset = index * 64;
  return data.slice(offset, offset + 64);
}

/** Format a bigint wei value to ETH (rough float, for display) */
function weiToEth(wei: bigint): number {
  // Convert to a float — acceptable precision loss for display
  return Number(wei) / 1e18;
}

/** Look up a token symbol from KNOWN_TOKENS, or return truncated address */
function tokenLabel(address: string): string {
  const known = KNOWN_TOKENS[address.toLowerCase()];
  return known ? known.symbol : address.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EthereumWSCallbacks {
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

interface EthLog {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  logIndex: string;
  blockNumber: string;
}

// ---------------------------------------------------------------------------
// EthereumWebSocket
// ---------------------------------------------------------------------------

export class EthereumWebSocket {
  private ws: WebSocket | null = null;
  private callbacks: EthereumWSCallbacks;
  private wsUrl: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private _connected = false;
  private subscriptionId: string | null = null;
  private rpcId = 1;

  // Throttle: buffer events and flush at a controlled rate
  private eventBuffer: Array<{ event: DataProviderEvent; swap?: EthereumWSCallbacks['onSwap'] extends (s: infer S) => void ? S : never }> = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly MAX_EVENTS_PER_FLUSH = 10;
  private static readonly FLUSH_INTERVAL_MS = 1000;

  private static readonly BASE_RECONNECT_MS = 3000;
  private static readonly MAX_RECONNECT_MS = 60000;

  constructor(callbacks: EthereumWSCallbacks) {
    this.callbacks = callbacks;
    this.wsUrl = process.env.NEXT_PUBLIC_ETH_WS_URL || 'wss://ethereum-rpc.publicnode.com';
  }

  isConnected(): boolean {
    return this._connected;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(this.wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      console.log('[EthereumProvider] WS connected');
      this._connected = true;
      this.reconnectAttempts = 0;

      // Subscribe to logs matching our event topics
      const id = this.rpcId++;
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'eth_subscribe',
        params: [
          'logs',
          {
            topics: [[
              UNISWAP_V2_SWAP_TOPIC,
              UNISWAP_V3_SWAP_TOPIC,
              ERC20_TRANSFER_TOPIC,
            ]],
          },
        ],
      }));

      // Start the flush timer for rate-limiting
      this.startFlushTimer();
    };

    ws.onmessage = (event) => {
      if (this.callbacks.isPaused()) return;

      try {
        const msg = JSON.parse(event.data);

        // Subscription confirmation
        if (msg.id && msg.result && typeof msg.result === 'string') {
          this.subscriptionId = msg.result;
          return;
        }

        // Log notification
        if (msg.method === 'eth_subscription' && msg.params?.result) {
          this.handleLog(msg.params.result as EthLog);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      this._connected = false;
      this.subscriptionId = null;
      this.stopFlushTimer();
      this.reconnectAttempts++;
      const delay = Math.min(
        EthereumWebSocket.BASE_RECONNECT_MS * Math.pow(2, this.reconnectAttempts - 1),
        EthereumWebSocket.MAX_RECONNECT_MS,
      );
      console.warn(`[EthereumProvider] WS closed — reconnecting in ${(delay / 1000).toFixed(0)}s (attempt ${this.reconnectAttempts})`);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  disconnect(): void {
    this.stopFlushTimer();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
    this.reconnectAttempts = 0;
    this.subscriptionId = null;
    this.eventBuffer = [];
  }

  // -------------------------------------------------------------------------
  // Log parsing
  // -------------------------------------------------------------------------

  private handleLog(log: EthLog): void {
    if (!log.topics || log.topics.length === 0) return;

    const topic0 = log.topics[0];
    const data = log.data.startsWith('0x') ? log.data.slice(2) : log.data;

    if (topic0 === UNISWAP_V2_SWAP_TOPIC) {
      this.handleV2Swap(log, data);
    } else if (topic0 === UNISWAP_V3_SWAP_TOPIC) {
      this.handleV3Swap(log, data);
    } else if (topic0 === ERC20_TRANSFER_TOPIC) {
      this.handleTransfer(log, data);
    }
  }

  private handleV2Swap(log: EthLog, data: string): void {
    // Uniswap V2 Swap(address sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address to)
    // data: amount0In (word0), amount1In (word1), amount0Out (word2), amount1Out (word3)
    // topics: [event sig, sender (indexed), to (indexed)]
    if (data.length < 256) return;

    const amount0In = decodeUint256(getWord(data, 0));
    const amount1In = decodeUint256(getWord(data, 1));
    const amount0Out = decodeUint256(getWord(data, 2));
    const amount1Out = decodeUint256(getWord(data, 3));

    // Rough volume estimate: sum of all non-zero amounts, convert from wei
    const totalWei = amount0In + amount1In + amount0Out + amount1Out;
    const ethAmount = weiToEth(totalWei > BigInt(0) ? totalWei / BigInt(2) : BigInt(0));

    const pairAddress = log.address.toLowerCase();
    const sender = log.topics.length > 1 ? topicToAddress(log.topics[1]) : '';
    const txHash = log.transactionHash;
    const logIndex = log.logIndex;

    const event: DataProviderEvent = {
      id: `${txHash}-${logIndex}`,
      providerId: 'ethereum',
      category: 'ethSwaps',
      chain: 'ethereum',
      timestamp: Date.now(),
      label: 'V2 Swap',
      amount: ethAmount,
      nativeSymbol: 'ETH',
      address: sender,
      tokenAddress: pairAddress,
    };

    const swap = {
      tokenAddress: pairAddress,
      symbol: tokenLabel(pairAddress),
      name: tokenLabel(pairAddress),
      trader: sender,
      volume: ethAmount,
    };

    this.bufferEvent(event, swap);
  }

  private handleV3Swap(log: EthLog, data: string): void {
    // Uniswap V3 Swap(address sender, address recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)
    // data: amount0 (word0), amount1 (word1), sqrtPriceX96 (word2), liquidity (word3), tick (word4)
    // topics: [event sig, sender (indexed), recipient (indexed)]
    if (data.length < 320) return;

    const amount0 = decodeInt256(getWord(data, 0));
    const amount1 = decodeInt256(getWord(data, 1));

    // Use absolute values for volume
    const abs0 = amount0 < BigInt(0) ? -amount0 : amount0;
    const abs1 = amount1 < BigInt(0) ? -amount1 : amount1;
    const ethAmount = weiToEth(abs0 > abs1 ? abs0 : abs1);

    const poolAddress = log.address.toLowerCase();
    const sender = log.topics.length > 1 ? topicToAddress(log.topics[1]) : '';
    const txHash = log.transactionHash;
    const logIndex = log.logIndex;

    const event: DataProviderEvent = {
      id: `${txHash}-${logIndex}`,
      providerId: 'ethereum',
      category: 'ethSwaps',
      chain: 'ethereum',
      timestamp: Date.now(),
      label: 'V3 Swap',
      amount: ethAmount,
      nativeSymbol: 'ETH',
      address: sender,
      tokenAddress: poolAddress,
    };

    const swap = {
      tokenAddress: poolAddress,
      symbol: tokenLabel(poolAddress),
      name: tokenLabel(poolAddress),
      trader: sender,
      volume: ethAmount,
    };

    this.bufferEvent(event, swap);
  }

  private handleTransfer(log: EthLog, data: string): void {
    // Transfer(address from, address to, uint256 value)
    // topics: [event sig, from (indexed), to (indexed)]
    // data: value (word0)
    if (log.topics.length < 3 || data.length < 64) return;

    const from = topicToAddress(log.topics[1]);
    const to = topicToAddress(log.topics[2]);
    const value = decodeUint256(getWord(data, 0));
    const tokenAddress = log.address.toLowerCase();

    const isFromZero = from === ZERO_ADDRESS;
    const isMint = isFromZero;

    // For non-mints, filter out small transfers
    if (!isMint && value < MIN_TRANSFER_VALUE) return;

    const known = KNOWN_TOKENS[tokenAddress];
    const symbol = known ? known.symbol : tokenAddress.slice(0, 8);
    const decimals = known ? known.decimals : 18;
    const amount = Number(value) / Math.pow(10, decimals);

    const category = isMint ? 'ethMints' : 'ethTransfers';
    const label = isMint ? `Mint ${symbol}` : `${symbol} Transfer`;

    const txHash = log.transactionHash;
    const logIndex = log.logIndex;

    const event: DataProviderEvent = {
      id: `${txHash}-${logIndex}`,
      providerId: 'ethereum',
      category,
      chain: 'ethereum',
      timestamp: Date.now(),
      label,
      amount,
      nativeSymbol: 'ETH',
      address: isMint ? to : from,
      tokenAddress,
    };

    this.bufferEvent(event);
  }

  // -------------------------------------------------------------------------
  // Rate limiting / throttle
  // -------------------------------------------------------------------------

  private bufferEvent(
    event: DataProviderEvent,
    swap?: { tokenAddress: string; symbol: string; name: string; trader: string; volume: number },
  ): void {
    this.eventBuffer.push({ event, swap });
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flushEvents(), EthereumWebSocket.FLUSH_INTERVAL_MS);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private flushEvents(): void {
    if (this.eventBuffer.length === 0) return;

    // Take up to MAX_EVENTS_PER_FLUSH from the buffer
    const batch = this.eventBuffer.splice(0, EthereumWebSocket.MAX_EVENTS_PER_FLUSH);

    for (const { event, swap } of batch) {
      this.callbacks.onEvent(event);
      if (swap) {
        this.callbacks.onSwap(swap);
      }
    }

    // If buffer is growing too large, drop oldest events
    if (this.eventBuffer.length > 500) {
      this.eventBuffer = this.eventBuffer.slice(-200);
    }
  }
}
