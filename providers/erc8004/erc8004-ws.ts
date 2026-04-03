/**
 * ERC-8004 WebSocket Handler
 * Connects to EVM RPC and streams ERC-721 transfer + ERC-4906 metadata update events
 */

import type { DataProviderEvent } from '@web3viz/core';
import {
  ERC721_TRANSFER_TOPIC,
  METADATA_UPDATE_TOPIC,
  BATCH_METADATA_UPDATE_TOPIC,
  ZERO_ADDRESS,
  KNOWN_COLLECTIONS,
  MAX_EVENTS_PER_SECOND,
} from './constants';

interface ERC8004WSConfig {
  wsUrl: string;
  chain: string;
  providerId: string;
  onEvent: (event: DataProviderEvent) => void;
  onCollection: (info: { address: string; chain: string; name: string }) => void;
  isPaused: () => boolean;
}

interface JsonRpcMessage {
  jsonrpc: string;
  method?: string;
  params?: unknown;
  id?: number;
  result?: unknown;
}

export class ERC8004WebSocket {
  private ws: WebSocket | null = null;
  private config: ERC8004WSConfig;
  private connected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventBuffer: DataProviderEvent[] = [];
  private lastEmitTime = 0;

  // Track contracts that have emitted ERC-721 Transfer events,
  // so we only emit MetadataUpdate for confirmed ERC-8004 contracts
  private activeContracts = new Set<string>();

  constructor(config: ERC8004WSConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.config.wsUrl);
      this.setupHandlers();
    } catch (error) {
      console.error(`ERC-8004 (${this.config.chain}) WebSocket creation failed:`, error);
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

  private setupHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.connected = true;
      console.log(`ERC-8004 (${this.config.chain}) WebSocket connected`);
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
      console.log(`ERC-8004 (${this.config.chain}) WebSocket closed`);
      this.connected = false;
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error(`ERC-8004 (${this.config.chain}) WebSocket error:`, error);
      this.connected = false;
      if (this.ws) {
        this.ws.close();
      }
    };
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to ERC-721 Transfer + ERC-4906 MetadataUpdate topics
    const subscribeMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: [
        'logs',
        {
          topics: [
            [ERC721_TRANSFER_TOPIC, METADATA_UPDATE_TOPIC, BATCH_METADATA_UPDATE_TOPIC],
          ],
        },
      ],
    };

    this.ws.send(JSON.stringify(subscribeMsg));
  }

  private handleMessage(msg: JsonRpcMessage): void {
    // Handle subscription confirmation
    if (msg.result && typeof msg.result === 'string') {
      console.log(`ERC-8004 (${this.config.chain}) subscription ID:`, msg.result);
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

      if (!topics || !address) return;

      const topic0 = topics[0];

      try {
        if (topic0 === ERC721_TRANSFER_TOPIC) {
          this.handleTransfer(topics, data, address, transactionHash, logIndex);
        } else if (topic0 === METADATA_UPDATE_TOPIC) {
          this.handleMetadataUpdate(topics, address, transactionHash, logIndex);
        } else if (topic0 === BATCH_METADATA_UPDATE_TOPIC) {
          this.handleBatchMetadataUpdate(topics, address, transactionHash, logIndex);
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }

  private handleTransfer(
    topics: string[],
    _data: string | undefined,
    contractAddress: string,
    txHash: string | undefined,
    logIndex: string | undefined,
  ): void {
    // ERC-721 Transfer has 4 topics: topic0 + from + to + tokenId
    // ERC-20 Transfer has 3 topics: topic0 + from + to (value in data)
    if (topics.length !== 4) return;

    const from = this.unpadAddress(topics[1]);
    const to = this.unpadAddress(topics[2]);
    const tokenId = this.parseTokenId(topics[3]);
    const contract = contractAddress.toLowerCase();

    // Mark this contract as active (has ERC-721 transfers)
    this.activeContracts.add(contract);

    const isMint = topics[1] === ZERO_ADDRESS;
    const category = isMint ? 'erc8004Mints' : 'erc8004Transfers';

    const collectionName = KNOWN_COLLECTIONS[contract]?.name || `Collection ${contract.slice(0, 8)}`;
    const label = isMint
      ? `Mint Token #${tokenId}`
      : `Transfer Token #${tokenId}`;

    const id = `erc8004-${txHash}-${logIndex}`;

    const event: DataProviderEvent = {
      id,
      providerId: this.config.providerId,
      category,
      chain: this.config.chain,
      timestamp: Date.now(),
      label,
      address: isMint ? to : from,
      tokenAddress: contract,
      meta: { tokenId, from, to },
    };

    this.bufferEvent(event);

    // Report collection activity
    this.config.onCollection({
      address: contract,
      chain: this.config.chain,
      name: collectionName,
    });
  }

  private handleMetadataUpdate(
    topics: string[],
    contractAddress: string,
    txHash: string | undefined,
    logIndex: string | undefined,
  ): void {
    const contract = contractAddress.toLowerCase();

    // Only emit if this contract has been seen emitting ERC-721 transfers
    if (!this.activeContracts.has(contract)) return;

    const tokenId = topics.length > 1 ? this.parseTokenId(topics[1]) : 'unknown';
    const collectionName = KNOWN_COLLECTIONS[contract]?.name || `Collection ${contract.slice(0, 8)}`;

    const id = `erc8004-${txHash}-${logIndex}`;

    const event: DataProviderEvent = {
      id,
      providerId: this.config.providerId,
      category: 'erc8004Updates',
      chain: this.config.chain,
      timestamp: Date.now(),
      label: `${collectionName} #${tokenId} Updated`,
      address: contract,
      tokenAddress: contract,
      meta: { tokenId },
    };

    this.bufferEvent(event);
  }

  private handleBatchMetadataUpdate(
    topics: string[],
    contractAddress: string,
    txHash: string | undefined,
    logIndex: string | undefined,
  ): void {
    const contract = contractAddress.toLowerCase();

    // Only emit if this contract has been seen emitting ERC-721 transfers
    if (!this.activeContracts.has(contract)) return;

    const fromTokenId = topics.length > 1 ? this.parseTokenId(topics[1]) : '?';
    const toTokenId = topics.length > 2 ? this.parseTokenId(topics[2]) : '?';
    const collectionName = KNOWN_COLLECTIONS[contract]?.name || `Collection ${contract.slice(0, 8)}`;

    const id = `erc8004-${txHash}-${logIndex}`;

    const event: DataProviderEvent = {
      id,
      providerId: this.config.providerId,
      category: 'erc8004Updates',
      chain: this.config.chain,
      timestamp: Date.now(),
      label: `${collectionName} #${fromTokenId}-#${toTokenId} Updated`,
      address: contract,
      tokenAddress: contract,
      meta: { fromTokenId, toTokenId },
    };

    this.bufferEvent(event);
  }

  private unpadAddress(paddedAddress: string): string {
    const clean = paddedAddress.startsWith('0x') ? paddedAddress.slice(2) : paddedAddress;
    return '0x' + clean.slice(-40);
  }

  private parseTokenId(topic: string): string {
    try {
      const n = BigInt(topic);
      return n.toString();
    } catch {
      return topic.slice(0, 10);
    }
  }

  private bufferEvent(event: DataProviderEvent): void {
    this.eventBuffer.push(event);

    const now = Date.now();
    const timeSinceLastEmit = now - this.lastEmitTime;
    const minInterval = 1000 / MAX_EVENTS_PER_SECOND;

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

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }
}
