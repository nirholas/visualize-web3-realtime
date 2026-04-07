'use client';

import { useEffect, useRef, useState } from 'react';
import type { GraphData, PumpLink, PumpNode } from './types';

// ---------------------------------------------------------------------------
// Hub IDs
// ---------------------------------------------------------------------------

const HUB_BUYS = 'hub:buys';
const HUB_SELLS = 'hub:sells';
const HUB_CREATES = 'hub:creates';
const HUB_WHALES = 'hub:whales';

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
/** Max active particle nodes */
const MAX_PARTICLES = 300;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _seq = 0;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSol(): number {
  const base = Math.random() * 2;
  return Math.random() > 0.92 ? base * 50 : base;
}

function linkId(endpoint: string | PumpNode): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDemoData(): GraphData {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  const nodeBuffer = useRef<PumpNode[]>([]);
  const linkBuffer = useRef<PumpLink[]>([]);

  useEffect(() => {
    const emitTimer = setInterval(() => {
      const now = Date.now();
      const roll = Math.random();

      if (roll < 0.2) {
        // ~20% — new coin creation
        const id = `demo-create-${now}-${++_seq}`;
        const ticker = pick(DEMO_TICKERS);
        nodeBuffer.current.push({
          id,
          type: 'token',
          ticker,
          timestamp: now,
        });
        linkBuffer.current.push({ source: id, target: HUB_CREATES });
      } else if (roll < 0.55) {
        // ~35% — buy trade
        const id = `demo-buy-${now}-${++_seq}`;
        const sol = randomSol();
        const targetHub = sol > 1 ? HUB_WHALES : HUB_BUYS;
        nodeBuffer.current.push({
          id,
          type: 'trade',
          isBuy: true,
          solAmount: sol,
          timestamp: now,
        });
        linkBuffer.current.push({ source: id, target: targetHub });
      } else {
        // ~45% — sell trade
        const id = `demo-sell-${now}-${++_seq}`;
        const sol = randomSol();
        const targetHub = sol > 1 ? HUB_WHALES : HUB_SELLS;
        nodeBuffer.current.push({
          id,
          type: 'trade',
          isBuy: false,
          solAmount: sol,
          timestamp: now,
        });
        linkBuffer.current.push({ source: id, target: targetHub });
      }
    }, EMIT_INTERVAL_MS);

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

        // Keep recent nodes, enforce cap
        const sorted = allNodes
          .filter((n) => n.timestamp >= cutoff)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_PARTICLES);

        for (const n of sorted) {
          kept.add(n.id);
          nodes.push(n);
        }

        const links = [...prev.links, ...newLinks].filter(
          (l) => kept.has(linkId(l.source)),
        );

        return { nodes, links };
      });
    }, FLUSH_INTERVAL_MS);

    return () => {
      clearInterval(emitTimer);
      clearInterval(flushTimer);
    };
  }, []);

  return graphData;
}
