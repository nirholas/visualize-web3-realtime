// ============================================================================
// WebSocket data hook for React Native
//
// Connects to a streaming data source and maintains topTokens / traderEdges
// state. Handles reconnection with exponential backoff.
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import type { TopToken, TraderEdge } from '@web3viz/core';

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const BACKOFF_MULTIPLIER = 2;

interface UseWebSocketDataOptions {
  source?: string;
  maxNodes?: number;
  onConnectionChange?: (connected: boolean) => void;
}

interface WebSocketDataState {
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  connected: boolean;
}

export function useWebSocketData({
  source,
  maxNodes = 2000,
  onConnectionChange,
}: UseWebSocketDataOptions): WebSocketDataState {
  const [topTokens, setTopTokens] = useState<TopToken[]>([]);
  const [traderEdges, setTraderEdges] = useState<TraderEdge[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectMs = useRef(INITIAL_RECONNECT_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleConnectionChange = useCallback((state: boolean) => {
    setConnected(state);
    onConnectionChange?.(state);
  }, [onConnectionChange]);

  useEffect(() => {
    if (!source) return;

    function connect() {
      const ws = new WebSocket(source!);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectMs.current = INITIAL_RECONNECT_MS;
        handleConnectionChange(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
          if (msg.topTokens) {
            setTopTokens((prev) => {
              const merged = [...prev];
              for (const token of msg.topTokens) {
                const idx = merged.findIndex((t) => t.tokenAddress === token.tokenAddress);
                if (idx >= 0) merged[idx] = token;
                else merged.push(token);
              }
              return merged.slice(0, maxNodes);
            });
          }
          if (msg.traderEdges) {
            setTraderEdges((prev) => {
              const merged = [...prev];
              for (const edge of msg.traderEdges) {
                const idx = merged.findIndex(
                  (e) => e.source === edge.source && e.target === edge.target,
                );
                if (idx >= 0) merged[idx] = edge;
                else merged.push(edge);
              }
              return merged.slice(0, maxNodes * 3);
            });
          }
        } catch { /* ignore malformed messages */ }
      };

      ws.onclose = () => {
        handleConnectionChange(false);
        reconnectTimer.current = setTimeout(() => {
          reconnectMs.current = Math.min(
            reconnectMs.current * BACKOFF_MULTIPLIER,
            MAX_RECONNECT_MS,
          );
          connect();
        }, reconnectMs.current);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [source, maxNodes, handleConnectionChange]);

  return { topTokens, traderEdges, connected };
}
