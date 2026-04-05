export const largeDatasetPreset = {
  name: 'Large Dataset',
  description: '5,000 nodes performance demo',
  code: `import ForceGraph from '@web3viz/react-graph';
import type { TopToken, TraderEdge } from '@web3viz/core';
import { useMemo } from 'react';

function generateLargeDataset() {
  const chains = ['solana', 'ethereum', 'base'] as const;
  const sources = ['pumpfun', 'ethereum', 'base'] as const;
  const nativeSymbols = ['SOL', 'ETH', 'ETH'] as const;

  // Generate 20 hub tokens
  const tokens: TopToken[] = Array.from({ length: 20 }, (_, i) => {
    const chainIdx = i % 3;
    return {
      tokenAddress: \`large_token_\${i}\`,
      symbol: \`TKN\${i}\`,
      name: \`Token \${i}\`,
      chain: chains[chainIdx],
      trades: 50 + Math.floor(Math.random() * 500),
      volume: 10 + Math.random() * 100,
      volumeSol: 10 + Math.random() * 100,
      nativeSymbol: nativeSymbols[chainIdx],
      source: sources[chainIdx],
    };
  });

  // Generate ~5000 trader edges
  const edges: TraderEdge[] = [];
  for (let i = 0; i < 2500; i++) {
    const trader = \`large_trader_\${i}\`;
    // Each trader connects to 2 random tokens
    const t1 = Math.floor(Math.random() * tokens.length);
    const t2 = (t1 + 1 + Math.floor(Math.random() * (tokens.length - 1))) % tokens.length;
    for (const idx of [t1, t2]) {
      const token = tokens[idx];
      edges.push({
        trader,
        tokenAddress: token.tokenAddress,
        chain: token.chain,
        trades: 1 + Math.floor(Math.random() * 10),
        volume: Math.random() * 5,
        volumeSol: Math.random() * 5,
        source: token.source,
      });
    }
  }

  return { tokens, edges };
}

export default function App() {
  const { tokens, edges } = useMemo(generateLargeDataset, []);

  return (
    <ForceGraph
      topTokens={tokens}
      traderEdges={edges}
      height="100%"
      background="#0a0a12"
      simulationConfig={{
        maxAgentNodes: 5000,
        hubChargeStrength: -150,
        agentChargeStrength: -3,
        centerStrength: 0.02,
        velocityDecay: 0.5,
      }}
      postProcessing={{ bloom: true, bloomIntensity: 0.3 }}
    />
  );
}
`,
};
