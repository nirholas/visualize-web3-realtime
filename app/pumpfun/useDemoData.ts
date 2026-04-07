'use client';

import { useEffect, useRef, useState } from 'react';
import type { PumpGraphData, PumpLink, PumpNode } from './types';

// ---------------------------------------------------------------------------
// Demo tickers & config
// ---------------------------------------------------------------------------

const DEMO_TICKERS = [
  'WIF', 'BONK', 'POPCAT', 'MEW', 'BOME', 'SLERF', 'MYRO', 'WEN',
  'SMOG', 'JITO', 'TNSR', 'KMNO', 'DRIFT', 'ZEUS', 'PARCL',
];

/** Interval between synthetic events (ms) */
const EMIT_INTERVAL_MS = 800;
/** Nodes older than this are garbage-collected */
const NODE_TTL_MS = 30_000;
/** Flush demo buffer into React state at this interval */
const FLUSH_INTERVAL_MS = 1_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _seq = 0;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSol(): number {
  // Biased toward small trades with occasional whales
  const base = Math.random() * 2;
  return Math.random() > 0.92 ? base * 50 : base;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Generates synthetic PumpFun-style graph data for demo / offline use.
 * Produces a stream of token launches and trade events with realistic timing.
 */
export function useDemoData(): {
  graphData: PumpGraphData;
  connected: boolean;
} {
  const [graphData, setGraphData] = useState<PumpGraphData>({
    nodes: [],
    links: [],
  });

  const nodeBuffer = useRef<PumpNode[]>([]);
  const linkBuffer = useRef<PumpLink[]>([]);
  // Track live token mints so trades can reference them
  const liveMints = useRef<string[]>([]);

  useEffect(() => {
    // --- Emit synthetic events ---
    const emitTimer = setInterval(() => {
      const now = Date.now();

      // ~30 % chance of a new token launch, otherwise a trade
      if (Math.random() < 0.3 || liveMints.current.length === 0) {
        const mint = `demo-${now}-${++_seq}`;
        const ticker = pick(DEMO_TICKERS);
        liveMints.current.push(mint);
        // Cap the live mint list so old entries rotate out
        if (liveMints.current.length > 20) liveMints.current.shift();

        nodeBuffer.current.push({
          id: mint,
          type: 'token',
          ticker,
          timestamp: now,
        });
      } else {
        const mint = pick(liveMints.current);
        const id = `dt-${now}-${++_seq}`;
        nodeBuffer.current.push({
          id,
          type: 'trade',
          isBuy: Math.random() > 0.35,
          solAmount: randomSol(),
          timestamp: now,
        });
        linkBuffer.current.push({ source: id, target: mint });
      }
    }, EMIT_INTERVAL_MS);

    // --- Flush into React state & GC ---
    const flushTimer = setInterval(() => {
      const newNodes = nodeBuffer.current;
      const newLinks = linkBuffer.current;
      if (newNodes.length === 0 && newLinks.length === 0) return;

      nodeBuffer.current = [];
      linkBuffer.current = [];

      setGraphData((prev) => {
        const cutoff = Date.now() - NODE_TTL_MS;
        const allNodes = [...prev.nodes, ...newNodes];
        const kept = new Set<string>();
        const nodes: PumpNode[] = [];

        for (const n of allNodes) {
          if (n.timestamp >= cutoff) {
            kept.add(n.id);
            nodes.push(n);
          }
        }

        const links = [...prev.links, ...newLinks].filter(
          (l) => kept.has(l.source) && kept.has(l.target),
        );

        return { nodes, links };
      });
    }, FLUSH_INTERVAL_MS);

    return () => {
      clearInterval(emitTimer);
      clearInterval(flushTimer);
    };
  }, []);

  // Demo mode always reports as "connected"
  return { graphData, connected: true };
}
