'use client';

import React, { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { DemoHub, DemoDataset } from './useDemoSimulation';
import { useDemoSimulation } from './useDemoSimulation';
import type { ForceGraphConfig } from '@web3viz/core';

const ForceGraph = dynamic(
  () => import('@web3viz/react-graph').then((m) => m.ForceGraph),
  { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: '#0a0a12' }} /> },
);

interface DemoGraphProps {
  dataset: DemoDataset;
  generateParticle: (hubs: DemoHub[], tick: number) => ReturnType<typeof import('./useDemoSimulation').toGraphData> extends never ? never : import('./useDemoSimulation').DemoParticle;
  particleInterval?: number;
  simulationConfig?: ForceGraphConfig;
  /** Legend entries: label -> color */
  legend?: Record<string, string>;
}

function DemoGraph({
  dataset,
  generateParticle,
  particleInterval = 350,
  simulationConfig,
  legend,
}: DemoGraphProps) {
  const generate = useCallback(
    (hubs: DemoHub[], tick: number) => generateParticle(hubs, tick),
    [generateParticle],
  );

  const { topTokens, traderEdges } = useDemoSimulation(dataset, {
    active: true,
    generateParticle: generate,
    particleInterval,
  });

  const simConfig = useMemo<ForceGraphConfig>(() => ({
    hubRadius: 5,
    agentRadius: 1.2,
    chargeStrength: -120,
    linkDistance: 45,
    collisionRadius: 3,
    ...simulationConfig,
  }), [simulationConfig]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ForceGraph
        topTokens={topTokens}
        traderEdges={traderEdges}
        height="100%"
        background="#0a0a12"
        simulationConfig={simConfig}
        showLabels
        showGround={false}
        showShadows={false}
        fov={50}
        cameraPosition={[0, 140, 80]}
        labelStyle={{
          color: '#e5e5e5',
          background: 'rgba(20,20,30,0.85)',
          borderRadius: 4,
          fontSize: 10,
          padding: '2px 8px',
        }}
        postProcessing={{ enabled: true, bloomIntensity: 0.8, bloomThreshold: 0.3 }}
      />

      {/* Legend */}
      {legend && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '12px 16px',
            background: 'rgba(10,10,18,0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {Object.entries(legend).map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 6px ${color}88`,
                }}
              />
              <span style={{ fontSize: 10, color: '#999', letterSpacing: '0.04em' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 20,
          display: 'flex',
          gap: 16,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{topTokens.length}</div>
          <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hubs</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{traderEdges.length}</div>
          <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Connections</div>
        </div>
      </div>
    </div>
  );
}

export { DemoGraph };
