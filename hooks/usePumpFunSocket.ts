'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PumpFunProvider } from '@web3viz/providers';
import type {
  DataProviderEvent,
  DataProviderStats,
  ConnectionState,
  TopToken,
  TraderEdge,
} from '@web3viz/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Time-to-live for inactive tokens before GC sweeps them (ms) */
const TOKEN_TTL_MS = 45_000;

/** Maximum number of token (hub) nodes allowed at once */
const MAX_TOKENS = 15;

/** How often the garbage collector runs (ms) */
const GC_INTERVAL_MS = 5_000;

/** How often we poll the provider for fresh stats (ms) */
const POLL_INTERVAL_MS = 1_000;

// ---------------------------------------------------------------------------
// Graph data types — used by PumpFunGraph to render nodes & links
// ---------------------------------------------------------------------------

export interface PumpFunNode {
  id: string;
  type: 'token' | 'trade';
  label: string;
  /** The token mint address this node belongs to (self for token nodes) */
  tokenAddress: string;
  /** Last activity timestamp (ms) — used for TTL garbage collection */
  timestamp: number;
  chain: string;
  /** Volume in SOL */
  volume: number;
  /** Number of trades */
  trades: number;
  /** Bonding curve progress 0–1 */
  bondingCurveProgress?: number;
  /** Whether graduated from bonding curve */
  graduated?: boolean;
  /** Token image URL */
  imageUrl?: string;
  /** Whether this trader is a whale */
  isWhale?: boolean;
  /** Whether this trader is a sniper */
  isSniper?: boolean;
}

export interface PumpFunLink {
  source: string;
  target: string;
}

export interface PumpFunGraphData {
  nodes: PumpFunNode[];
  links: PumpFunLink[];
}

export interface UsePumpFunSocketReturn {
  graphData: PumpFunGraphData;
  stats: DataProviderStats | null;
  connections: ConnectionState[];
  events: DataProviderEvent[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePumpFunSocket(): UsePumpFunSocketReturn {
  const providerRef = useRef<PumpFunProvider | null>(null);
  const [graphData, setGraphData] = useState<PumpFunGraphData>({ nodes: [], links: [] });
  const [stats, setStats] = useState<DataProviderStats | null>(null);
  const [connections, setConnections] = useState<ConnectionState[]>([]);
  const [events, setEvents] = useState<DataProviderEvent[]>([]);

  // Track last-activity timestamps per token address
  const tokenTimestamps = useRef<Map<string, number>>(new Map());

  // --------------------------------------------------
  // Transform provider stats → graph data
  // --------------------------------------------------
  const buildGraphData = useCallback(
    (providerStats: DataProviderStats): PumpFunGraphData => {
      const now = Date.now();
      const nodes: PumpFunNode[] = [];
      const links: PumpFunLink[] = [];

      // ---- Token nodes ----
      const topTokens = providerStats.topTokens;
      const tokenSet = new Set<string>();

      for (const token of topTokens) {
        // Update timestamp on every poll — activity keeps the token alive
        tokenTimestamps.current.set(token.tokenAddress, now);
        tokenSet.add(token.tokenAddress);

        nodes.push({
          id: token.tokenAddress,
          type: 'token',
          label: token.symbol || token.name,
          tokenAddress: token.tokenAddress,
          timestamp: now,
          chain: token.chain,
          volume: token.volume,
          trades: token.trades,
          bondingCurveProgress: token.bondingCurveProgress,
          graduated: token.graduated,
          imageUrl: token.imageUrl,
        });
      }

      // ---- Trade (trader) nodes ----
      for (const edge of providerStats.traderEdges) {
        if (!tokenSet.has(edge.tokenAddress)) continue;
        const tradeId = `trade:${edge.trader}:${edge.tokenAddress}`;
        nodes.push({
          id: tradeId,
          type: 'trade',
          label: edge.trader.slice(0, 6),
          tokenAddress: edge.tokenAddress,
          timestamp: now,
          chain: edge.chain,
          volume: edge.volume,
          trades: edge.trades,
          isWhale: edge.isWhale,
          isSniper: edge.isSniper,
        });

        // Link trade → token
        links.push({ source: tradeId, target: edge.tokenAddress });
      }

      return { nodes, links };
    },
    [],
  );

  // --------------------------------------------------
  // Connect provider & poll stats
  // --------------------------------------------------
  useEffect(() => {
    const provider = new PumpFunProvider({ maxTopTokens: MAX_TOKENS });
    providerRef.current = provider;
    provider.connect();

    const pollId = setInterval(() => {
      const s = provider.getStats();
      setStats(s);
      setConnections(provider.getConnections());
      setEvents(s.recentEvents);
      setGraphData(buildGraphData(s));
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollId);
      provider.disconnect();
      providerRef.current = null;
    };
  }, [buildGraphData]);

  // --------------------------------------------------
  // Garbage Collection sweep — every 5 seconds
  // --------------------------------------------------
  useEffect(() => {
    const gcId = setInterval(() => {
      setGraphData((prev) => {
        const now = Date.now();
        const deadTokenIds = new Set<string>();

        // 1. Identify tokens past their TTL
        const tokenNodes = prev.nodes.filter((n) => n.type === 'token');
        for (const node of tokenNodes) {
          const lastSeen = tokenTimestamps.current.get(node.tokenAddress) ?? node.timestamp;
          if (now - lastSeen > TOKEN_TTL_MS) {
            deadTokenIds.add(node.id);
          }
        }

        // 2. Hard cap — if still over MAX after TTL sweep, evict oldest
        const surviving = tokenNodes
          .filter((n) => !deadTokenIds.has(n.id))
          .sort((a, b) => {
            const tsA = tokenTimestamps.current.get(a.tokenAddress) ?? a.timestamp;
            const tsB = tokenTimestamps.current.get(b.tokenAddress) ?? b.timestamp;
            return tsA - tsB; // oldest first
          });

        while (surviving.length > MAX_TOKENS) {
          const oldest = surviving.shift()!;
          deadTokenIds.add(oldest.id);
        }

        if (deadTokenIds.size === 0) return prev;

        // 3. Cascading deletion — remove dead tokens + all their trade nodes + links
        const deadAddresses = new Set<string>();
        for (const id of deadTokenIds) {
          deadAddresses.add(id); // token id === tokenAddress
          tokenTimestamps.current.delete(id);
        }

        const nodes = prev.nodes.filter((n) => {
          if (deadTokenIds.has(n.id)) return false;
          if (n.type === 'trade' && deadAddresses.has(n.tokenAddress)) return false;
          return true;
        });

        const survivingIds = new Set(nodes.map((n) => n.id));
        const links = prev.links.filter(
          (l) => survivingIds.has(l.source) && survivingIds.has(l.target),
        );

        return { nodes, links };
      });
    }, GC_INTERVAL_MS);

    return () => clearInterval(gcId);
  }, []);

  return { graphData, stats, connections, events };
}
