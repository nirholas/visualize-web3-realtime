/**
 * Shared EVM WebSocket Handler
 *
 * Generic WebSocket class for any EVM-compatible chain.
 * Connects to a JSON-RPC WebSocket, subscribes to swap and transfer
 * log topics, decodes events, and emits DataProviderEvent objects.
 *
 * Used by both Ethereum and Base providers (and future EVM chains).
 */

import type { DataProviderEvent } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface EvmWebSocketConfig {
  /** Primary WebSocket RPC URL */
  wsUrl: string;
  /** Fallback URL if primary fails */
  fallbackUrl: string;
  /** Chain identifier (e.g. 'ethereum', 'base') */
  chain: string;
  /** Provider ID for event metadata */
  providerId: string;
  /** Native currency symbol (e.g. 'ETH') */
  nativeSymbol: string;
  /** Known token addresses → metadata */
  knownTokens: Record<string, { symbol: string; name: string; decimals: number }>;
  /** Swap event topic hashes to subscribe to */
  swapTopics: string[];
  /** ERC-20 Transfer event topic hash */
  transferTopic: string;
  /** Minimum transfer value (in wei) to emit */
  minTransferValue: bigint;
  /** Max events per second for throttling */
  maxEventsPerSecond: number;
  /** Known DEX pair addresses for token labeling */
  knownPairs?: Record<string, [string, string]>;
  /** Callback when a DataProviderEvent is ready */
  onEvent: (event: DataProviderEvent) => void;
  /** Callback for graph accumulation data */
  onSwap: (swap: {
    tokenAddress: string;
    symbol: string;
    name: string;
    trader: string;
    volume: number;
  }) => void;
  /** Whether the provider is currently paused */
  isPaused: () => boolean;
}

interface JsonRpcMessage {
  jsonrpc: string;
  method?: string;
  params?: unknown;
  id?: number;
  result?: unknown;
}

// ---------------------------------------------------------------------------
// Shared EVM WebSocket class
// ---------------------------------------------------------------------------

export class EvmWebSocket {
  private ws: WebSocket | null = null;
  private config: EvmWebSocketConfig;
  private connected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventBuffer: DataProviderEvent[] = [];
  private lastEmitTime = 0;
  private useFallback = false;

  constructor(config: EvmWebSocketConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = this.useFallback ? this.config.fallbackUrl : this.config.wsUrl;

    try {
      this.ws = new WebSocket(url);
      this.setupHandlers();
    } catch (error) {
      console.error(`Failed to create ${this.config.chain} WebSocket:`, error);
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

    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // -------------------------------------------------------------------------
  // Internal handlers
  // -------------------------------------------------------------------------

  private setupHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.connected = true;
      this.useFallback = false; // Reset on successful connection
      console.log(`${this.config.chain} WebSocket connected`);
      this.subscribe();
    };

    this.ws.onmessage = (event) => {
      if (this.config.isPaused()) return;

      try {
        const msg = JSON.parse(event.data) as JsonRpcMessage;
        this.handleMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      console.log(`${this.config.chain} WebSocket closed`);
      this.connected = false;
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error(`${this.config.chain} WebSocket error:`, error);
      this.connected = false;
      if (this.ws) {
        this.ws.close();
      }
    };
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const allTopics = [...this.config.swapTopics, this.config.transferTopic];

    const subscribeMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: [
        'logs',
        {
          topics: [allTopics],
        },
      ],
    };

    this.ws.send(JSON.stringify(subscribeMsg));
  }

  private handleMessage(msg: JsonRpcMessage): void {
    // Handle subscription confirmation
    if (msg.result && typeof msg.result === 'string') {
      console.log(`${this.config.chain} subscription ID:`, msg.result);
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
        if (topic0 === this.config.transferTopic) {
          this.handleTransfer(topics, data, address, transactionHash, logIndex);
        } else if (this.config.swapTopics.includes(topic0)) {
          this.handleSwap(topic0, data, address, transactionHash, logIndex);
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }

  // -------------------------------------------------------------------------
  // Swap decoding
  // -------------------------------------------------------------------------

  private handleSwap(
    topic0: string,
    data: string,
    pairAddress: string,
    txHash: string | undefined,
    logIndex: string | undefined,
  ): void {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;

    // Determine if this is a V2 or V3 style swap based on data length
    // V2: 4 x 32 bytes = 256 hex chars
    // V3: 5 x 32 bytes = 320 hex chars
    const isV3 = cleanData.length >= 320;
    const isV2 = cleanData.length >= 256;

    if (!isV2) return;

    let volume: number;

    if (isV3) {
      const amount0 = BigInt('0x' + cleanData.slice(0, 64));
      const amount1 = BigInt('0x' + cleanData.slice(64, 128));
      const volume0 = Math.abs(Number(amount0) / 1e18);
      const volume1 = Math.abs(Number(amount1) / 1e18);
      volume = Math.max(volume0, volume1);
    } else {
      const amount0In = BigInt('0x' + cleanData.slice(0, 64));
      const amount1In = BigInt('0x' + cleanData.slice(64, 128));
      const amount0Out = BigInt('0x' + cleanData.slice(128, 192));
      const amount1Out = BigInt('0x' + cleanData.slice(192, 256));
      const volume0 = Number(amount0Out) / 1e18;
      const volume1 = Number(amount1Out) / 1e18;
      volume = Math.max(volume0, volume1);
    }

    if (volume < 0.001) return;

    const token0 = this.guessToken(pairAddress, 0);
    const token1 = this.guessToken(pairAddress, 1);

    const label = `${token0.symbol}/${token1.symbol} Swap`;
    const id = `${this.config.chain}-${txHash}-${logIndex}`;
    const category = this.config.chain === 'ethereum' ? 'ethSwaps' : `${this.config.providerId}Swaps`;

    const event: DataProviderEvent = {
      id,
      providerId: this.config.providerId,
      category,
      chain: this.config.chain,
      timestamp: Date.now(),
      label,
      amount: volume,
      nativeSymbol: this.config.nativeSymbol,
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
  }

  // -------------------------------------------------------------------------
  // Transfer decoding
  // -------------------------------------------------------------------------

  private handleTransfer(
    topics: string[],
    data: string,
    tokenAddress: string,
    txHash: string | undefined,
    logIndex: string | undefined,
  ): void {
    if (topics.length < 3 || !data) return;

    const from = this.unpadAddress(topics[1]);
    const to = this.unpadAddress(topics[2]);

    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (cleanData.length < 64) return;

    const value = BigInt('0x' + cleanData.slice(0, 64));

    const isMint = from === '0x0000000000000000000000000000000000000000';

    if (!isMint && value < this.config.minTransferValue) return;

    const token = this.config.knownTokens[tokenAddress.toLowerCase()];
    const symbol = token?.symbol || 'TOKEN';
    const name = token?.name || 'Token';
    const decimals = token?.decimals || 18;

    const valueDecimal = Number(value) / Math.pow(10, decimals);

    const prefix = this.config.chain === 'ethereum' ? 'eth' : this.config.providerId;
    const category = isMint ? `${prefix}Mints` : `${prefix}Transfers`;
    const label = isMint ? `${symbol} Mint` : `${symbol} Transfer`;
    const id = `${this.config.chain}-${txHash}-${logIndex}`;

    const event: DataProviderEvent = {
      id,
      providerId: this.config.providerId,
      category,
      chain: this.config.chain,
      timestamp: Date.now(),
      label,
      amount: valueDecimal,
      nativeSymbol: this.config.nativeSymbol,
      address: isMint ? to : from,
      tokenAddress: tokenAddress.toLowerCase(),
    };

    this.bufferEvent(event);

    const trader = isMint ? to : from;
    this.config.onSwap({
      tokenAddress: tokenAddress.toLowerCase(),
      symbol,
      name,
      trader,
      volume: valueDecimal,
    });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private unpadAddress(paddedAddress: string): string {
    const clean = paddedAddress.startsWith('0x') ? paddedAddress.slice(2) : paddedAddress;
    const addr = clean.slice(-40);
    return '0x' + addr;
  }

  private guessToken(
    pairAddress: string,
    index: number,
  ): { symbol: string; name: string } {
    const lowerPair = pairAddress.toLowerCase();

    if (this.config.knownPairs?.[lowerPair]) {
      const tokens = this.config.knownPairs[lowerPair];
      return {
        symbol: tokens[index] || '???',
        name: tokens[index] || 'Unknown',
      };
    }

    return {
      symbol: index === 0 ? 'TKN0' : 'TKN1',
      name: index === 0 ? 'Token 0' : 'Token 1',
    };
  }

  private bufferEvent(event: DataProviderEvent): void {
    this.eventBuffer.push(event);

    const now = Date.now();
    const timeSinceLastEmit = now - this.lastEmitTime;
    const minInterval = 1000 / this.config.maxEventsPerSecond;

    if (timeSinceLastEmit >= minInterval && this.eventBuffer.length > 0) {
      for (const evt of this.eventBuffer) {
        this.config.onEvent(evt);
      }
      this.eventBuffer = [];
      this.lastEmitTime = now;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    // Try fallback URL on next reconnect
    this.useFallback = !this.useFallback;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 3000);
  }
}
