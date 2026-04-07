'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PumpGraphData, PumpLink, PumpNode } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_URL = 'wss://pumpportal.fun/api/data';
/** How often (ms) the buffer is flushed into React state */
const FLUSH_INTERVAL_MS = 1500;
/** Nodes older than this (ms) are garbage-collected on each flush */
const NODE_TTL_MS = 60_000;
/** Reconnect delay after an unclean close */
const RECONNECT_DELAY_MS = 3_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _tradeSeq = 0;
function tradeId(): string {
  return `t-${Date.now()}-${++_tradeSeq}`;
}

/**
 * Validate that a raw WS payload is a plain object with expected fields.
 * Prevents prototype-pollution and garbage data from entering the graph.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePumpFunSocket(): {
  graphData: PumpGraphData;
  connected: boolean;
} {
  const [graphData, setGraphData] = useState<PumpGraphData>({
    nodes: [],
    links: [],
  });
  const [connected, setConnected] = useState(false);

  // Mutable buffers — written by the WS handler, consumed by the flush timer
  const nodeBuffer = useRef<PumpNode[]>([]);
  const linkBuffer = useRef<PumpLink[]>([]);

  // Refs to persist across renders without re-triggering effects
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmounted = useRef(false);

  // ------------------------------------------------------------------
  // flush(): merge buffers into React state & garbage-collect old nodes
  // ------------------------------------------------------------------
  const flush = useCallback(() => {
    const newNodes = nodeBuffer.current;
    const newLinks = linkBuffer.current;

    if (newNodes.length === 0 && newLinks.length === 0) return;

    // Drain buffers
    nodeBuffer.current = [];
    linkBuffer.current = [];

    setGraphData((prev) => {
      const cutoff = Date.now() - NODE_TTL_MS;

      // Merge previous + new, then GC in one pass
      const allNodes = [...prev.nodes, ...newNodes];
      const kept = new Set<string>();
      const nodes: PumpNode[] = [];

      for (const n of allNodes) {
        if (n.timestamp >= cutoff) {
          kept.add(n.id);
          nodes.push(n);
        }
      }

      // Keep only links whose endpoints both survived GC
      const links = [...prev.links, ...newLinks].filter(
        (l) => kept.has(l.source) && kept.has(l.target),
      );

      return { nodes, links };
    });
  }, []);

  // ------------------------------------------------------------------
  // connect(): establish WebSocket & wire handlers
  // ------------------------------------------------------------------
  const connect = useCallback(() => {
    if (unmounted.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmounted.current) {
        ws.close();
        return;
      }
      setConnected(true);
      ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
      ws.send(
        JSON.stringify({ method: 'subscribeTokenTrade', keys: ['allTrades'] }),
      );
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const raw: unknown = JSON.parse(event.data as string);
        if (!isPlainObject(raw)) return;

        // --- Token creation ---
        if (raw.txType === undefined && raw.mint && raw.name) {
          const node: PumpNode = {
            id: raw.mint as string,
            type: 'token',
            ticker: (raw.symbol as string) || undefined,
            timestamp: Date.now(),
          };
          nodeBuffer.current.push(node);
          return;
        }

        // --- Trade event ---
        if (raw.txType === 'buy' || raw.txType === 'sell') {
          const mint = raw.mint as string | undefined;
          if (!mint) return;

          const id = tradeId();
          const solAmount = typeof raw.solAmount === 'number'
            ? raw.solAmount / 1e9
            : 0;

          const node: PumpNode = {
            id,
            type: 'trade',
            isBuy: raw.txType === 'buy',
            solAmount,
            timestamp: Date.now(),
          };

          const link: PumpLink = {
            source: id,
            target: mint,
          };

          nodeBuffer.current.push(node);
          linkBuffer.current.push(link);
        }
      } catch {
        // Ignore malformed payloads
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;

      if (!unmounted.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      // onerror is always followed by onclose — let onclose handle reconnect
      ws.close();
    };
  }, []);

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------
  useEffect(() => {
    unmounted.current = false;

    connect();

    flushTimer.current = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => {
      unmounted.current = true;

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (flushTimer.current) {
        clearInterval(flushTimer.current);
        flushTimer.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, flush]);

  return { graphData, connected };
}
