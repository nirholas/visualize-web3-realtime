// ============================================================================
// swarming-plugin-solana — Solana / PumpFun data source
//
// Wraps the existing PumpFun WebSocket feed as a plugin.
// For standalone use, install @web3viz/providers and use PumpFunProvider directly.
// This plugin is a lightweight adapter for the plugin system.
// ============================================================================

import { definePlugin } from '../plugin';

export interface SolanaPluginConfig {
  /** PumpFun WebSocket URL (default: wss://pumpportal.fun/api/data) */
  wsUrl?: string;
  /** Solana RPC WebSocket URL for claim events (optional) */
  rpcWsUrl?: string;
}

export const solanaPlugin = definePlugin({
  name: 'swarming-plugin-solana',
  type: 'source',
  meta: {
    description: 'Solana token launches and trades via PumpFun',
    author: 'swarming',
    icon: '◎',
    tags: ['solana', 'pumpfun', 'defi', 'blockchain'],
  },
  config: {
    wsUrl: {
      type: 'string',
      label: 'PumpFun WebSocket URL',
      default: 'wss://pumpportal.fun/api/data',
    },
    rpcWsUrl: {
      type: 'string',
      label: 'Solana RPC WebSocket URL',
      description: 'For fee claim event monitoring (optional)',
    },
  },
  sourceConfig: {
    id: 'pumpfun',
    label: 'PumpFun',
    color: '#a78bfa',
    icon: '⚡',
    description: 'Solana token launches & trades',
  },
  categories: [
    { id: 'launches', label: 'Launches', icon: '⚡', color: '#a78bfa', sourceId: 'pumpfun' },
    { id: 'agentLaunches', label: 'Agent Launches', icon: '⬡', color: '#f472b6', sourceId: 'pumpfun' },
    { id: 'trades', label: 'Trades', icon: '▲', color: '#60a5fa', sourceId: 'pumpfun' },
  ],
  createProvider: {
    connect(config: SolanaPluginConfig, emit: (event: Record<string, unknown>) => void) {
      const url = config.wsUrl ?? 'wss://pumpportal.fun/api/data';
      let ws: WebSocket | null = null;
      let disposed = false;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

      function open() {
        if (disposed) return;
        try {
          ws = new WebSocket(url);
        } catch {
          scheduleReconnect();
          return;
        }

        ws.onopen = () => {
          // Subscribe to new token events and trades
          ws?.send(JSON.stringify({ method: 'subscribeNewToken' }));
          ws?.send(JSON.stringify({ method: 'subscribeTokenTrade' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data || typeof data !== 'object') return;

            const now = Date.now();
            if (data.txType === 'create' || data.mint) {
              emit({
                id: `sol-${data.signature ?? now}`,
                providerId: 'pumpfun',
                category: 'launches',
                chain: 'solana',
                timestamp: now,
                label: data.name ?? data.symbol ?? 'New Token',
                address: data.traderPublicKey ?? data.mint ?? '',
                tokenAddress: data.mint,
                amount: data.initialBuy,
                nativeSymbol: 'SOL',
              });
            } else if (data.txType === 'buy' || data.txType === 'sell') {
              emit({
                id: `sol-${data.signature ?? now}`,
                providerId: 'pumpfun',
                category: 'trades',
                chain: 'solana',
                timestamp: now,
                label: `${data.txType} ${data.symbol ?? ''}`.trim(),
                address: data.traderPublicKey ?? '',
                tokenAddress: data.mint,
                amount: data.solAmount,
                nativeSymbol: 'SOL',
              });
            }
          } catch {
            // skip
          }
        };

        ws.onclose = () => {
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
        ws?.close();
      };
    },
  },
});
