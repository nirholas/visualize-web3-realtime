import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TopToken, TraderEdge } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Static demo data — used by the "See Demo" button to show a preview of
// the visualization without connecting to any live data provider.
// ---------------------------------------------------------------------------

export const DEMO_TOP_TOKENS: TopToken[] = [
  { tokenAddress: 'demo_sol_alpha', symbol: 'ALPHA', name: 'AlphaDAO', chain: 'solana', trades: 285, volume: 420.0, volumeSol: 420.0, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'demo_eth_defi', symbol: 'DEFI', name: 'DeFi Pulse', chain: 'ethereum', trades: 198, volume: 185.5, volumeSol: 185.5, nativeSymbol: 'ETH', source: 'ethereum' },
  { tokenAddress: 'demo_sol_meme', symbol: 'MEME', name: 'MemeVault', chain: 'solana', trades: 156, volume: 95.3, volumeSol: 95.3, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'demo_base_onchain', symbol: 'ONCH', name: 'OnchainAI', chain: 'base', trades: 134, volume: 72.8, volumeSol: 72.8, nativeSymbol: 'ETH', source: 'base' },
  { tokenAddress: 'demo_sol_nexus', symbol: 'NXS', name: 'Nexus Protocol', chain: 'solana', trades: 112, volume: 48.2, volumeSol: 48.2, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'demo_eth_yield', symbol: 'YLD', name: 'YieldMax', chain: 'ethereum', trades: 89, volume: 31.5, volumeSol: 31.5, nativeSymbol: 'ETH', source: 'ethereum' },
  { tokenAddress: 'demo_sol_agent', symbol: 'AGNT', name: 'AgentSwarm', chain: 'solana', trades: 67, volume: 18.7, volumeSol: 18.7, nativeSymbol: 'SOL', source: 'agents' },
  { tokenAddress: 'demo_base_flux', symbol: 'FLUX', name: 'FluxBridge', chain: 'base', trades: 52, volume: 8.4, volumeSol: 8.4, nativeSymbol: 'ETH', source: 'base' },
];

// Generate trader edges — multiple traders per token to create a visible network
function generateDemoEdges(): TraderEdge[] {
  const edges: TraderEdge[] = [];
  const tokens = DEMO_TOP_TOKENS;

  // Create traders that connect to specific tokens — cross-token traders create visible bridges
  const traderGroups: { prefix: string; tokenIndices: number[]; count: number }[] = [
    { prefix: 'Ax', tokenIndices: [0, 1], count: 12 },
    { prefix: 'Bx', tokenIndices: [0, 2], count: 10 },
    { prefix: 'Cx', tokenIndices: [1, 3], count: 9 },
    { prefix: 'Dx', tokenIndices: [2, 4], count: 8 },
    { prefix: 'Ex', tokenIndices: [3, 5], count: 7 },
    { prefix: 'Fx', tokenIndices: [0, 4, 6], count: 6 },
    { prefix: 'Gx', tokenIndices: [1, 5, 7], count: 6 },
    { prefix: 'Hx', tokenIndices: [2, 6], count: 8 },
    { prefix: 'Ix', tokenIndices: [4, 7], count: 7 },
    { prefix: 'Jx', tokenIndices: [0, 3, 5], count: 5 },
    { prefix: 'Kx', tokenIndices: [5, 6, 7], count: 6 },
    { prefix: 'Lx', tokenIndices: [0, 7], count: 5 },
    { prefix: 'Mx', tokenIndices: [1, 2, 4], count: 4 },
    { prefix: 'Nx', tokenIndices: [3, 6], count: 6 },
    { prefix: 'Ox', tokenIndices: [2, 5, 7], count: 5 },
  ];

  // Use seeded random for deterministic edges
  let seed = 42;
  const seededRandom = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (const group of traderGroups) {
    for (let i = 0; i < group.count; i++) {
      const trader = `${group.prefix}${'1'.repeat(40 - group.prefix.length - String(i).length)}${i}`;
      for (const tokenIdx of group.tokenIndices) {
        const token = tokens[tokenIdx];
        edges.push({
          trader,
          tokenAddress: token.tokenAddress,
          chain: token.chain,
          trades: 1 + Math.floor(seededRandom() * 12),
          volume: 0.2 + seededRandom() * 8,
          volumeSol: 0.2 + seededRandom() * 8,
          source: token.source,
        });
      }
    }
  }

  return edges;
}

export const DEMO_TRADER_EDGES: TraderEdge[] = generateDemoEdges();

// ---------------------------------------------------------------------------
// Stagger hook — progressively reveals demo tokens and edges over time
// to simulate live data arriving, rather than showing everything at once.
// ---------------------------------------------------------------------------

export function useDemoStagger(active: boolean) {
  const [visibleCount, setVisibleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setVisibleCount(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  useEffect(() => {
    if (!active) {
      reset();
      return;
    }
    // Start revealing tokens one by one every 500ms
    setVisibleCount(1);
    intervalRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= DEMO_TOP_TOKENS.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, reset]);

  const topTokens = useMemo(
    () => DEMO_TOP_TOKENS.slice(0, visibleCount),
    [visibleCount],
  );

  const traderEdges = useMemo(() => {
    const visibleAddresses = new Set(topTokens.map((t) => t.tokenAddress));
    return DEMO_TRADER_EDGES.filter((e) => visibleAddresses.has(e.tokenAddress));
  }, [topTokens]);

  return { topTokens, traderEdges };
}
