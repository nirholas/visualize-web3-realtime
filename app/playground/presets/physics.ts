export const physicsPreset = {
  name: 'Physics Tuning',
  description: 'Demonstrates charge, link distance, and damping',
  code: `import ForceGraph from '@web3viz/react-graph';
import type { TopToken, TraderEdge } from '@web3viz/core';

// Try changing these values and see the simulation react!
const CHARGE_STRENGTH = -300;   // More negative = stronger repulsion
const LINK_DISTANCE = 40;       // Higher = nodes spread further
const CENTER_PULL = 0.05;       // Higher = stronger pull to center
const VELOCITY_DECAY = 0.3;     // Lower = more momentum (bouncier)
const COLLISION = 0.8;          // Higher = harder collision boundaries

const tokens: TopToken[] = [
  { tokenAddress: 'phys_1', symbol: 'GRAV', name: 'Gravity', chain: 'solana', trades: 200, volume: 50, volumeSol: 50, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'phys_2', symbol: 'FORCE', name: 'ForceField', chain: 'solana', trades: 150, volume: 35, volumeSol: 35, nativeSymbol: 'SOL', source: 'pumpfun' },
  { tokenAddress: 'phys_3', symbol: 'MASS', name: 'MassNode', chain: 'ethereum', trades: 120, volume: 28, volumeSol: 28, nativeSymbol: 'ETH', source: 'ethereum' },
  { tokenAddress: 'phys_4', symbol: 'ORBIT', name: 'OrbitalDAO', chain: 'base', trades: 90, volume: 20, volumeSol: 20, nativeSymbol: 'ETH', source: 'base' },
];

const edges: TraderEdge[] = [];
for (let i = 0; i < 40; i++) {
  const tokenIdx = i % tokens.length;
  const token = tokens[tokenIdx];
  edges.push({
    trader: \`phys_trader_\${i}\`,
    tokenAddress: token.tokenAddress,
    chain: token.chain,
    trades: 1 + Math.floor(Math.random() * 5),
    volume: Math.random() * 4,
    volumeSol: Math.random() * 4,
    source: token.source,
  });
}
// Cross-token traders
for (let i = 0; i < 10; i++) {
  const trader = \`phys_cross_\${i}\`;
  const t1 = Math.floor(Math.random() * tokens.length);
  const t2 = (t1 + 1) % tokens.length;
  edges.push(
    { trader, tokenAddress: tokens[t1].tokenAddress, chain: tokens[t1].chain, trades: 3, volume: 2, volumeSol: 2, source: tokens[t1].source },
    { trader, tokenAddress: tokens[t2].tokenAddress, chain: tokens[t2].chain, trades: 3, volume: 2, volumeSol: 2, source: tokens[t2].source },
  );
}

export default function App() {
  return (
    <ForceGraph
      topTokens={tokens}
      traderEdges={edges}
      height="100%"
      background="#0a0a12"
      simulationConfig={{
        hubChargeStrength: CHARGE_STRENGTH,
        hubLinkDistance: LINK_DISTANCE,
        centerStrength: CENTER_PULL,
        velocityDecay: VELOCITY_DECAY,
        collisionStrength: COLLISION,
      }}
    />
  );
}
`,
};
