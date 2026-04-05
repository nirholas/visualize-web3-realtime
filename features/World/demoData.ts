import type { TopToken, TraderEdge } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Static demo data — used by the "See Demo" button to show a preview of
// the visualization without connecting to any live data provider.
// ---------------------------------------------------------------------------

export const DEMO_TOP_TOKENS: TopToken[] = [
  { tokenAddress: 'demo_sol_alpha', symbol: 'ALPHA', name: 'AlphaDAO', chain: 'solana', trades: 142, volume: 38.5, volumeSol: 38.5, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'demo_sol_beta', symbol: 'BETA', name: 'BetaSwap', chain: 'solana', trades: 98, volume: 22.1, volumeSol: 22.1, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'demo_eth_gamma', symbol: 'GAMMA', name: 'GammaFi', chain: 'ethereum', trades: 76, volume: 11.4, volumeSol: 11.4, nativeSymbol: 'ETH', source: 'ethereum' },
  { tokenAddress: 'demo_sol_delta', symbol: 'DELTA', name: 'DeltaNet', chain: 'solana', trades: 63, volume: 15.8, volumeSol: 15.8, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'demo_base_omega', symbol: 'OMEGA', name: 'OmegaBase', chain: 'base', trades: 51, volume: 8.3, volumeSol: 8.3, nativeSymbol: 'ETH', source: 'base' },
  { tokenAddress: 'demo_sol_zeta', symbol: 'ZETA', name: 'ZetaAI', chain: 'solana', trades: 44, volume: 6.7, volumeSol: 6.7, nativeSymbol: 'SOL', source: 'agents' },
];

// Generate trader edges — multiple traders per token to create a visible network
function generateDemoEdges(): TraderEdge[] {
  const edges: TraderEdge[] = [];
  const tokens = DEMO_TOP_TOKENS;

  // Create traders that connect to specific tokens
  const traderGroups: { prefix: string; tokenIndices: number[]; count: number }[] = [
    { prefix: 'Ax', tokenIndices: [0, 1], count: 8 },
    { prefix: 'Bx', tokenIndices: [0, 2], count: 6 },
    { prefix: 'Cx', tokenIndices: [1, 3], count: 7 },
    { prefix: 'Dx', tokenIndices: [2, 4], count: 5 },
    { prefix: 'Ex', tokenIndices: [3, 5], count: 6 },
    { prefix: 'Fx', tokenIndices: [0, 4], count: 4 },
    { prefix: 'Gx', tokenIndices: [1, 5], count: 5 },
    { prefix: 'Hx', tokenIndices: [2, 3], count: 4 },
    { prefix: 'Ix', tokenIndices: [4, 5], count: 5 },
    { prefix: 'Jx', tokenIndices: [0, 3, 5], count: 3 },
  ];

  for (const group of traderGroups) {
    for (let i = 0; i < group.count; i++) {
      const trader = `${group.prefix}${'1'.repeat(40 - group.prefix.length - String(i).length)}${i}`;
      for (const tokenIdx of group.tokenIndices) {
        const token = tokens[tokenIdx];
        edges.push({
          trader,
          tokenAddress: token.tokenAddress,
          chain: token.chain,
          trades: 1 + Math.floor(Math.random() * 8),
          volume: 0.1 + Math.random() * 3,
          volumeSol: 0.1 + Math.random() * 3,
          source: token.source,
        });
      }
    }
  }

  return edges;
}

export const DEMO_TRADER_EDGES: TraderEdge[] = generateDemoEdges();
