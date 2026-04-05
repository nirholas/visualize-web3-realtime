// ============================================================================
// Built-in plugins — stub definitions
// ============================================================================

import { definePlugin, type SourcePluginDefinition } from './plugin';

export interface WebSocketPluginConfig {
  url: string;
  reconnect?: boolean;
}

export interface SolanaPluginConfig {
  rpcUrl?: string;
  wsUrl?: string;
}

export interface EthereumPluginConfig {
  rpcUrl?: string;
  wsUrl?: string;
}

export interface MockPluginConfig {
  interval?: number;
  tokenCount?: number;
}

export const websocketPlugin: SourcePluginDefinition = definePlugin({
  name: 'swarming-plugin-websocket',
  type: 'source',
  meta: { id: 'websocket', name: 'WebSocket', version: '1.0.0' },
  createProvider: () => null,
});

export const solanaPlugin: SourcePluginDefinition = definePlugin({
  name: 'swarming-plugin-solana',
  type: 'source',
  meta: { id: 'solana', name: 'Solana', version: '1.0.0' },
  createProvider: () => null,
});

export const ethereumPlugin: SourcePluginDefinition = definePlugin({
  name: 'swarming-plugin-ethereum',
  type: 'source',
  meta: { id: 'ethereum', name: 'Ethereum', version: '1.0.0' },
  createProvider: () => null,
});

export const mockPlugin: SourcePluginDefinition = definePlugin({
  name: 'swarming-plugin-mock',
  type: 'source',
  meta: { id: 'mock', name: 'Mock', version: '1.0.0' },
  createProvider: () => null,
});
