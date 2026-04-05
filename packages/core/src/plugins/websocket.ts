// ============================================================================
// swarming-plugin-websocket — Generic WebSocket data source
//
// Connects to any WebSocket endpoint and maps JSON messages to swarming events.
// ============================================================================

import { definePlugin } from '../plugin';
import type { DataProviderEvent } from '../types';

export interface WebSocketPluginConfig {
  /** WebSocket URL to connect to */
  url: string;
  /** Map a raw JSON message to a DataProviderEvent (or null to skip) */
  mapMessage: (data: unknown) => DataProviderEvent | null;
  /** Reconnect on close (default: true) */
  reconnect?: boolean;
  /** Max reconnect delay in ms (default: 30000) */
  maxReconnectMs?: number;
}

export const websocketPlugin = definePlugin({
  name: 'swarming-plugin-websocket',
  type: 'source',
  meta: {
    description: 'Generic WebSocket consumer — connect to any WS endpoint',
    author: 'swarming',
    icon: '🔌',
    tags: ['websocket', 'generic', 'streaming'],
  },
  config: {
    url: { type: 'string', label: 'WebSocket URL', required: true },
  },
  sourceConfig: {
    id: 'websocket',
    label: 'WebSocket',
    color: '#60a5fa',
    icon: '🔌',
    description: 'Generic WebSocket data source',
  },
  categories: [
    { id: 'wsEvents', label: 'WebSocket Events', icon: '⚡', color: '#60a5fa', sourceId: 'websocket' },
  ],
  createProvider: {
    connect(config: WebSocketPluginConfig, emit: (event: DataProviderEvent) => void) {
      let ws: WebSocket | null = null;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
      let reconnectDelay = 1000;
      let disposed = false;
      const shouldReconnect = config.reconnect !== false;
      const maxDelay = config.maxReconnectMs ?? 30000;

      function open() {
        if (disposed) return;
        try {
          ws = new WebSocket(config.url);
        } catch {
          scheduleReconnect();
          return;
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const mapped = config.mapMessage(data);
            if (mapped) emit(mapped);
          } catch {
            // skip unparseable messages
          }
        };

        ws.onopen = () => { reconnectDelay = 1000; };

        ws.onclose = () => {
          if (shouldReconnect && !disposed) scheduleReconnect();
        };

        ws.onerror = () => {
          ws?.close();
        };
      }

      function scheduleReconnect() {
        if (disposed) return;
        reconnectTimeout = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
          open();
        }, reconnectDelay);
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
