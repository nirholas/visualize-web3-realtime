// ============================================================================
// swarming-plugin-ethereum — Ethereum / EVM data source
//
// Lightweight plugin adapter for Ethereum mainnet events.
// For full provider with topic filtering, use @web3viz/providers EthereumProvider.
// ============================================================================

import { definePlugin } from '../plugin';

export interface EthereumPluginConfig {
  /** Ethereum RPC WebSocket URL */
  rpcWsUrl: string;
  /** Minimum trade value in ETH to emit (default: 0.1) */
  minValueEth?: number;
}

export const ethereumPlugin = definePlugin({
  name: 'swarming-plugin-ethereum',
  type: 'source',
  meta: {
    description: 'Ethereum mainnet DEX swaps, transfers, and mints',
    author: 'swarming',
    icon: '◆',
    tags: ['ethereum', 'evm', 'defi', 'blockchain'],
  },
  config: {
    rpcWsUrl: {
      type: 'string',
      label: 'Ethereum RPC WebSocket URL',
      required: true,
      description: 'e.g. wss://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    },
    minValueEth: {
      type: 'number',
      label: 'Minimum Value (ETH)',
      default: 0.1,
    },
  },
  sourceConfig: {
    id: 'ethereum',
    label: 'Ethereum',
    color: '#627EEA',
    icon: '◆',
    description: 'Ethereum mainnet activity',
  },
  categories: [
    { id: 'ethSwaps', label: 'ETH Swaps', icon: '⇄', color: '#627EEA', sourceId: 'ethereum' },
    { id: 'ethTransfers', label: 'ETH Transfers', icon: '→', color: '#8799EE', sourceId: 'ethereum' },
    { id: 'ethMints', label: 'ETH Mints', icon: '✦', color: '#4B6AE5', sourceId: 'ethereum' },
  ],
  createProvider: {
    connect(config, emit) {
      let ws: WebSocket | null = null;
      let disposed = false;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
      let subId: string | null = null;

      function open() {
        if (disposed) return;
        try {
          ws = new WebSocket(config.rpcWsUrl);
        } catch {
          scheduleReconnect();
          return;
        }

        ws.onopen = () => {
          // Subscribe to pending transactions
          ws?.send(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_subscribe',
            params: ['newHeads'],
          }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            // Store subscription ID
            if (msg.id === 1 && msg.result) {
              subId = msg.result;
              return;
            }

            if (msg.method === 'eth_subscription' && msg.params?.result) {
              const block = msg.params.result;
              const now = Date.now();
              emit({
                id: `eth-block-${block.number}`,
                providerId: 'ethereum',
                category: 'ethTransfers',
                chain: 'ethereum',
                timestamp: now,
                label: `Block ${parseInt(block.number, 16)}`,
                address: block.miner ?? '',
              });
            }
          } catch {
            // skip
          }
        };

        ws.onclose = () => {
          subId = null;
          if (!disposed) scheduleReconnect();
        };

        ws.onerror = () => { ws?.close(); };
      }

      function scheduleReconnect() {
        if (disposed) return;
        reconnectTimeout = setTimeout(open, 3000);
      }

      open();

      return () => {
        disposed = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (ws && subId) {
          try {
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'eth_unsubscribe',
              params: [subId],
            }));
          } catch { /* closing anyway */ }
        }
        ws?.close();
      };
    },
  },
});
