export const basicPreset = {
  name: 'Basic',
  description: 'Minimal static data — simplest setup',
  code: `import ForceGraph from '@web3viz/react-graph';
import type { TopToken, TraderEdge } from '@web3viz/core';

const tokens: TopToken[] = [
  { tokenAddress: 'token_a', symbol: 'ALPHA', name: 'AlphaDAO', chain: 'solana', trades: 142, volume: 38.5, volumeSol: 38.5, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'token_b', symbol: 'BETA', name: 'BetaSwap', chain: 'solana', trades: 98, volume: 22.1, volumeSol: 22.1, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'token_c', symbol: 'GAMMA', name: 'GammaFi', chain: 'ethereum', trades: 76, volume: 11.4, volumeSol: 11.4, nativeSymbol: 'ETH', source: 'ethereum' },
];

const edges: TraderEdge[] = [
  { trader: 'trader_1', tokenAddress: 'token_a', chain: 'solana', trades: 5, volume: 2.1, volumeSol: 2.1, source: 'pumpfun' },
  { trader: 'trader_1', tokenAddress: 'token_b', chain: 'solana', trades: 3, volume: 1.4, volumeSol: 1.4, source: 'pumpfun' },
  { trader: 'trader_2', tokenAddress: 'token_b', chain: 'solana', trades: 7, volume: 3.2, volumeSol: 3.2, source: 'pumpfun' },
  { trader: 'trader_2', tokenAddress: 'token_c', chain: 'ethereum', trades: 2, volume: 0.8, volumeSol: 0.8, source: 'ethereum' },
  { trader: 'trader_3', tokenAddress: 'token_a', chain: 'solana', trades: 4, volume: 1.9, volumeSol: 1.9, source: 'pumpfun' },
  { trader: 'trader_3', tokenAddress: 'token_c', chain: 'ethereum', trades: 6, volume: 2.5, volumeSol: 2.5, source: 'ethereum' },
];

export default function App() {
  return (
    <ForceGraph
      topTokens={tokens}
      traderEdges={edges}
      height="100%"
      background="#0a0a12"
    />
  );
}
`,
};
