export const customThemePreset = {
  name: 'Custom Theme',
  description: 'Themed visualization with custom colors',
  code: `import ForceGraph from '@web3viz/react-graph';
import type { TopToken, TraderEdge } from '@web3viz/core';

const tokens: TopToken[] = [
  { tokenAddress: 'cyber_1', symbol: 'NEON', name: 'NeonVault', chain: 'ethereum', trades: 200, volume: 45, volumeSol: 45, nativeSymbol: 'ETH', source: 'ethereum' },
  { tokenAddress: 'cyber_2', symbol: 'SYNTH', name: 'SynthWave', chain: 'ethereum', trades: 180, volume: 38, volumeSol: 38, nativeSymbol: 'ETH', source: 'ethereum' },
  { tokenAddress: 'cyber_3', symbol: 'PULSE', name: 'PulseNet', chain: 'base', trades: 120, volume: 25, volumeSol: 25, nativeSymbol: 'ETH', source: 'base' },
  { tokenAddress: 'cyber_4', symbol: 'GRID', name: 'GridDAO', chain: 'solana', trades: 95, volume: 18, volumeSol: 18, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'cyber_5', symbol: 'FLUX', name: 'FluxCore', chain: 'solana', trades: 72, volume: 12, volumeSol: 12, nativeSymbol: 'SOL', source: 'pumpfun' },
];

// Generate cross-token traders for a connected network
const edges: TraderEdge[] = [];
for (let i = 0; i < 30; i++) {
  const t1 = Math.floor(Math.random() * tokens.length);
  const t2 = (t1 + 1 + Math.floor(Math.random() * (tokens.length - 1))) % tokens.length;
  const trader = \`cyber_trader_\${i}\`;
  edges.push(
    { trader, tokenAddress: tokens[t1].tokenAddress, chain: tokens[t1].chain, trades: 1 + Math.floor(Math.random() * 10), volume: Math.random() * 5, volumeSol: Math.random() * 5, source: tokens[t1].source },
    { trader, tokenAddress: tokens[t2].tokenAddress, chain: tokens[t2].chain, trades: 1 + Math.floor(Math.random() * 10), volume: Math.random() * 5, volumeSol: Math.random() * 5, source: tokens[t2].source },
  );
}

export default function App() {
  return (
    <ForceGraph
      topTokens={tokens}
      traderEdges={edges}
      height="100%"
      background="#0d001a"
      simulationConfig={{
        hubColors: ['#ff00ff', '#00ffff', '#ff6600', '#00ff88', '#8844ff', '#ff4488', '#44aaff', '#ffaa00'],
        agentColor: '#aa44ff',
        hubBaseRadius: 1.0,
        hubMaxRadius: 3.5,
      }}
      postProcessing={{ bloom: true, bloomIntensity: 0.8, bloomThreshold: 0.2 }}
    />
  );
}
`,
};
