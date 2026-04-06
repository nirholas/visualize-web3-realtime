'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import ToolPageShell from '@/features/Tools/ToolPageShell';

// ---------------------------------------------------------------------------
// Demo data — small web3-themed network
// ---------------------------------------------------------------------------
const PROTOCOLS = [
  { id: 'ethereum', label: 'Ethereum', fill: '#627eea' },
  { id: 'solana', label: 'Solana', fill: '#14f195' },
  { id: 'polygon', label: 'Polygon', fill: '#8247e5' },
  { id: 'arbitrum', label: 'Arbitrum', fill: '#28a0f0' },
  { id: 'base', label: 'Base', fill: '#0052ff' },
  { id: 'avalanche', label: 'Avalanche', fill: '#e84142' },
];

function generateDemoNodes(count: number) {
  const nodes: Array<{ id: string; label: string; fill: string }> = [
    ...PROTOCOLS,
  ];
  for (let i = 0; i < count; i++) {
    const proto = PROTOCOLS[i % PROTOCOLS.length];
    nodes.push({
      id: `wallet-${i}`,
      label: `0x${i.toString(16).padStart(4, '0')}`,
      fill: proto.fill,
    });
  }
  return nodes;
}

function generateDemoEdges(nodes: Array<{ id: string }>) {
  const edges: Array<{ id: string; source: string; target: string }> = [];
  // Connect each wallet to a protocol
  for (let i = PROTOCOLS.length; i < nodes.length; i++) {
    const protoIdx = (i - PROTOCOLS.length) % PROTOCOLS.length;
    edges.push({
      id: `e-proto-${i}`,
      source: PROTOCOLS[protoIdx].id,
      target: nodes[i].id,
    });
  }
  // Random cross-links
  for (let i = 0; i < nodes.length * 0.3; i++) {
    const a = PROTOCOLS.length + Math.floor(Math.random() * (nodes.length - PROTOCOLS.length));
    let b = PROTOCOLS.length + Math.floor(Math.random() * (nodes.length - PROTOCOLS.length));
    if (b === a) b = Math.min(a + 1, nodes.length - 1);
    edges.push({
      id: `e-cross-${i}`,
      source: nodes[a].id,
      target: nodes[b].id,
    });
  }
  return edges;
}

// ---------------------------------------------------------------------------
// Fallback when reagraph isn't installed
// ---------------------------------------------------------------------------
function ReagraphFallback() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: '#888',
        fontSize: 12,
      }}
    >
      <div style={{ fontSize: 14, color: '#e5e5e5' }}>reagraph not installed</div>
      <code
        style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '8px 16px',
          borderRadius: 6,
          fontSize: 11,
          color: '#c084fc',
        }}
      >
        npm install reagraph
      </code>
      <div style={{ fontSize: 10, color: '#555', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
        Once installed, this page will render an interactive WebGL network graph
        powered by Three.js and D3 force layout.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReagraphDemo() {
  const [walletCount, setWalletCount] = useState(80);
  const [GraphCanvas, setGraphCanvas] = useState<React.ComponentType<any> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    import('reagraph')
      .then((mod) => setGraphCanvas(() => mod.GraphCanvas))
      .catch(() => setLoadFailed(true));
  }, []);

  const nodes = useMemo(() => generateDemoNodes(walletCount), [walletCount]);
  const edges = useMemo(() => generateDemoEdges(nodes), [nodes]);

  const regenerate = useCallback(() => {
    setWalletCount((c) => c); // force remount by toggling key below
  }, []);

  if (loadFailed) {
    return (
      <ToolPageShell title="Reagraph" description="React WebGL graph" externalUrl="https://github.com/reaviz/reagraph">
        <ReagraphFallback />
      </ToolPageShell>
    );
  }

  if (!GraphCanvas) {
    return (
      <ToolPageShell title="Reagraph" description="React WebGL graph" externalUrl="https://github.com/reaviz/reagraph">
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 12 }}>
          Loading reagraph…
        </div>
      </ToolPageShell>
    );
  }

  return (
    <ToolPageShell title="Reagraph" description="React WebGL graph" externalUrl="https://github.com/reaviz/reagraph">
      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(10,10,15,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontSize: 11,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', width: 60 }}>Wallets</span>
          <input
            type="range"
            min={20}
            max={500}
            step={10}
            value={walletCount}
            onChange={(e) => setWalletCount(Number(e.target.value))}
            style={{ width: 120 }}
          />
          <span style={{ color: '#22d3ee', width: 40, textAlign: 'right' }}>{walletCount}</span>
        </label>
        <div style={{ fontSize: 9, color: '#555' }}>
          {nodes.length} nodes · {edges.length} edges
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(10,10,15,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '10px 14px',
          display: 'flex',
          gap: 12,
          fontSize: 10,
        }}
      >
        {PROTOCOLS.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill }} />
            <span style={{ color: '#aaa' }}>{p.label}</span>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', height: '100%' }}>
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          layoutType="forceDirected2d"
          theme="dark"
          cameraMode="pan"
          labelType="auto"
        />
      </div>
    </ToolPageShell>
  );
}
