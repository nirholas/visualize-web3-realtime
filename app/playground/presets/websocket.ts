export const websocketPreset = {
  name: 'WebSocket',
  description: 'Live Solana data via WebSocket',
  code: `import ForceGraph from '@web3viz/react-graph';
import type { TopToken, TraderEdge } from '@web3viz/core';
import { useState, useEffect, useRef } from 'react';

// Simulates a WebSocket feed with randomized token activity
function useMockWebSocket() {
  const [tokens, setTokens] = useState<TopToken[]>([]);
  const [edges, setEdges] = useState<TraderEdge[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const symbols = ['BONK', 'WIF', 'JUP', 'ORCA', 'RAY', 'PYTH', 'DRIFT', 'TENSOR'];
    const baseTokens: TopToken[] = symbols.slice(0, 4).map((s, i) => ({
      tokenAddress: \`ws_token_\${i}\`,
      symbol: s,
      name: \`\${s} Protocol\`,
      chain: 'solana',
      trades: 10 + Math.floor(Math.random() * 100),
      volume: 5 + Math.random() * 50,
      volumeSol: 5 + Math.random() * 50,
      nativeSymbol: 'SOL',
      source: 'pumpfun' as const,
    }));
    setTokens(baseTokens);

    // Simulate incoming trades
    intervalRef.current = setInterval(() => {
      setTokens(prev => {
        // Randomly add a new token
        if (prev.length < 8 && Math.random() > 0.7) {
          const sym = symbols[prev.length];
          return [...prev, {
            tokenAddress: \`ws_token_\${prev.length}\`,
            symbol: sym, name: \`\${sym} Protocol\`,
            chain: 'solana', trades: 1, volume: Math.random() * 5,
            volumeSol: Math.random() * 5, nativeSymbol: 'SOL', source: 'pumpfun' as const,
          }];
        }
        // Update volumes
        return prev.map(t => ({
          ...t,
          trades: t.trades + Math.floor(Math.random() * 3),
          volume: t.volume + Math.random() * 2,
        }));
      });

      setEdges(prev => {
        const trader = \`ws_trader_\${Math.floor(Math.random() * 20)}\`;
        const tokenIdx = Math.floor(Math.random() * 8);
        return [...prev.slice(-200), {
          trader,
          tokenAddress: \`ws_token_\${tokenIdx}\`,
          chain: 'solana', trades: 1,
          volume: Math.random() * 3, volumeSol: Math.random() * 3,
          source: 'pumpfun' as const,
        }];
      });
    }, 800);

    return () => clearInterval(intervalRef.current);
  }, []);

  return { tokens, edges };
}

export default function App() {
  const { tokens, edges } = useMockWebSocket();

  return (
    <ForceGraph
      topTokens={tokens}
      traderEdges={edges}
      height="100%"
      background="#0a0a12"
      postProcessing={{ bloom: true, bloomIntensity: 0.5 }}
    />
  );
}
`,
};
