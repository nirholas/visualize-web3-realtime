import React from 'react';
import { ForceGraph } from '@swarming-vis/react-graph';
import { useEvmStream } from './EvmProvider';
import { CHAIN_NAME } from './config';

// =============================================================================
// App
//
// Full-viewport dark background with a live stats bar at the top and a
// force-directed SwarmGraph visualization of EVM transactions below.
// =============================================================================

export function App() {
  const { nodes, edges, connected, blockNumber } = useEvmStream();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a0f',
        color: '#e0e0e0',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Stats bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontSize: '13px',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Chain badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: connected
              ? 'rgba(34,197,94,0.15)'
              : 'rgba(250,204,21,0.15)',
            color: connected ? '#22c55e' : '#facc15',
            fontWeight: 600,
            fontSize: '12px',
            letterSpacing: '0.02em',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: connected ? '#22c55e' : '#facc15',
              display: 'inline-block',
            }}
          />
          {CHAIN_NAME} {connected ? 'Live' : 'Demo'}
        </span>

        {/* Block number */}
        {blockNumber > 0 && (
          <span style={{ color: '#94a3b8' }}>
            Block{' '}
            <span style={{ color: '#e0e0e0', fontVariantNumeric: 'tabular-nums' }}>
              #{blockNumber.toLocaleString()}
            </span>
          </span>
        )}

        {/* Node / edge counts */}
        <span style={{ color: '#94a3b8' }}>
          Nodes{' '}
          <span style={{ color: '#e0e0e0', fontVariantNumeric: 'tabular-nums' }}>
            {nodes.length}
          </span>
        </span>
        <span style={{ color: '#94a3b8' }}>
          Txs{' '}
          <span style={{ color: '#e0e0e0', fontVariantNumeric: 'tabular-nums' }}>
            {edges.length}
          </span>
        </span>
      </header>

      {/* SwarmGraph visualization */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ForceGraph
          topTokens={nodes}
          traderEdges={edges}
          height="100%"
          background="#0a0a0f"
        />
      </div>
    </div>
  );
}
